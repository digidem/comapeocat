import { EventEmitter } from 'node:events'
import { PassThrough, pipeline } from 'node:stream'

import archiver from 'archiver'
import { pEvent } from 'p-event'
import * as v from 'valibot'

import {
	ICONS_DIR,
	TRANSLATIONS_DIR,
	VERSION_FILE,
	MAX_ICON_SIZE,
	MAX_JSON_SIZE,
	MAX_ENTRIES,
} from './lib/constants.js'
import {
	AddAfterFinishError,
	MissingCategorySelectionError,
	MissingMetadataError,
	MissingCategoriesError,
	IconSizeError,
	JsonSizeError,
	TooManyEntriesError,
} from './lib/errors.js'
import { parseSvg } from './lib/parse-svg.js'
import { validateBcp47 } from './lib/validate-bcp-47.js'
import { validateReferences } from './lib/validate-references.js'
import { CategorySchema } from './schema/category.js'
import { CategorySelectionSchema } from './schema/categorySelection.js'
import { FieldSchema } from './schema/field.js'
import { MetadataSchemaOutput } from './schema/metadata.js'
import { TranslationsSchema } from './schema/translations.js'

/** @typedef {import('./schema/translations.js').TranslationsInput} TranslationsInput */
/** @typedef {import('./schema/category.js').CategoryInput} CategoryInput */
/** @typedef {import('./schema/field.js').FieldInput} FieldInput */
/** @typedef {import('./schema/categorySelection.js').CategorySelectionInput} CategorySelectionInput */
/** @typedef {import('./schema/metadata.js').MetadataInput} MetadataInput */

/** @import { CategoryOutput } from './schema/category.js' */
/** @import { FieldOutput } from './schema/field.js' */
/** @import { CategorySelectionOutput } from './schema/categorySelection.js' */
/** @import { MetadataOutput } from './schema/metadata.js' */
/** @import { Entries } from 'type-fest'*/

const FILE_VERSION = '1.0'

export class Writer extends EventEmitter {
	/** @param {Error} error */
	#handleError = (error) => {
		this.emit('error', error)
	}

	#archive = archiver('zip', { zlib: { level: 9 } }).on(
		'error',
		this.#handleError,
	)
	#outputStream
	/** @type {Map<string, CategoryOutput>} */
	#categories = new Map()
	/** @type {Map<string, FieldOutput>} */
	#fields = new Map()
	/** @type {Set<string>} */
	#iconIds = new Set()
	/** @type {CategorySelectionOutput | undefined} */
	#categorySelection = undefined
	/** @type {MetadataOutput | undefined} */
	#metadata = undefined
	#finished = false
	/** Track number of entries added to prevent exceeding MAX_ENTRIES */
	#entryCount = 0

	constructor({ highWaterMark = 1024 * 1024 } = {}) {
		super()
		this.#outputStream = new PassThrough({ highWaterMark })
		pipeline(this.#archive, this.#outputStream, (error) => {
			if (error) this.#handleError(error)
		})
	}

	get outputStream() {
		return this.#outputStream
	}

	/**
	 * @param {string} id category ID (normally the filename without .json)
	 * @param {CategoryInput} category
	 * @returns {readonly CategoryOutput} The parsed category that was added (unknown properties are stripped)
	 */
	addCategory(id, category) {
		if (this.#finished) throw new AddAfterFinishError()
		const parsedCategory = v.parse(CategorySchema, category)
		this.#categories.set(id, parsedCategory)
		return parsedCategory
	}

	/**
	 * @param {CategorySelectionInput} categorySelection
	 * @returns {readonly CategorySelectionOutput} The parsed categorySelection that was set (unknown properties are stripped)
	 */
	setCategorySelection(categorySelection) {
		if (this.#finished) throw new AddAfterFinishError()
		this.#categorySelection = v.parse(
			CategorySelectionSchema,
			categorySelection,
		)
		return this.#categorySelection
	}

	/**
	 * @param {MetadataInput} metadata
	 * @return {readonly MetadataOutput} The parsed metadata that was set (unknown properties are stripped)
	 */
	setMetadata(metadata) {
		if (this.#finished) throw new AddAfterFinishError()
		// NB: We add buildDateValue here for type simplicity, and update it in finish()
		this.#metadata = v.parse(MetadataSchemaOutput, {
			...metadata,
			buildDateValue: Date.now(),
		})
		return this.#metadata
	}

	/**
	 * @param {string} id field ID (normally the filename without .json)
	 * @param {FieldInput} field
	 */
	addField(id, field) {
		if (this.#finished) throw new AddAfterFinishError()
		const parsedField = v.parse(FieldSchema, field)
		this.#fields.set(id, parsedField)
		return parsedField
	}

	/**
	 * @param {string} lang BCP47 language tag (e.g. "en", "de", "fr", "en-US")
	 * @param {TranslationsInput} translations
	 * @returns {Promise<readonly v.InferOutput<typeof TranslationsSchema>>} The parsed translations that were added (unknown properties are stripped)
	 */
	async addTranslations(lang, translations) {
		if (this.#finished) throw new AddAfterFinishError()
		const parsedTranslations = v.parse(TranslationsSchema, translations)
		const normalizedLang = validateBcp47(lang)
		const jsonString = JSON.stringify(parsedTranslations, null, 2)
		const size = Buffer.byteLength(jsonString, 'utf-8')
		if (size > MAX_JSON_SIZE) {
			throw new JsonSizeError({
				fileName: `${TRANSLATIONS_DIR}/${normalizedLang}.json`,
				size,
			})
		}
		await this.#append(jsonString, {
			name: `${TRANSLATIONS_DIR}/${normalizedLang}.json`,
		})
		this.#entryCount++
		if (this.#entryCount > MAX_ENTRIES) {
			throw new TooManyEntriesError()
		}
		return parsedTranslations
	}

	/**
	 * @param {string} id icon ID (normally the filename without .svg)
	 * @param {string} svg SVG content
	 * @returns {Promise<string>} The parsed SVG that was added (extraneous data is stripped)
	 */
	async addIcon(id, svg) {
		// Validate icon size
		const size = Buffer.byteLength(svg, 'utf-8')
		if (size > MAX_ICON_SIZE) {
			throw new IconSizeError({ iconId: id, size })
		}
		if (this.#finished) throw new AddAfterFinishError()
		const parsedSvg = parseSvg(svg) // Validate SVG
		await this.#append(parsedSvg, { name: `${ICONS_DIR}/${id}.svg` })
		this.#iconIds.add(id)
		this.#entryCount++
		if (this.#entryCount > MAX_ENTRIES) {
			throw new TooManyEntriesError()
		}
		return parsedSvg
	}

	/**
	 * Append data to the archive and return a promise that resolves when the data is fully added.
	 *
	 * @param {Parameters<archiver.Archiver['append']>[0]} data Data to append
	 * @param {NonNullable<Parameters<archiver.Archiver['append']>[1]>} opts Append options
	 */
	#append(data, opts) {
		const onAdded = pEvent(
			this.#archive,
			'entry',
			/** @param {import('archiver').EntryData} entry */
			(entry) => entry.name === opts.name,
		)
		this.#archive.append(data, opts)
		return onAdded
	}

	/**
	 * Finalize the archive. This will check for missing references and required data,
	 * and throw an error if any are missing. After calling this method, no more data
	 * can be added to the archive.
	 * @throws {CategoryRefError} When there are missing field or icon references
	 * @throws {MissingMetadataError} When metadata is not set
	 * @throws {MissingCategoriesError} When no categories have been added
	 * @throws {MissingCategorySelectionError} When categorySelection is not set
	 * @throws {JsonSizeError} When any JSON file exceeds MAX_JSON_SIZE
	 * @throws {TooManyEntriesError} When the total number of entries exceeds MAX_ENTRIES
	 */
	finish() {
		this.#checkRefs()
		if (!this.#metadata) {
			throw new MissingMetadataError()
		}
		if (this.#categories.size === 0) {
			throw new MissingCategoriesError()
		}
		if (!this.#categorySelection) {
			throw new MissingCategorySelectionError()
		}
		this.#finished = true

		// Validate and add categories.json
		const categories = Object.fromEntries(this.#categories)
		const categoriesJson = JSON.stringify(categories, null, 2)
		const categoriesSize = Buffer.byteLength(categoriesJson, 'utf-8')
		if (categoriesSize > MAX_JSON_SIZE) {
			throw new JsonSizeError({
				fileName: 'categories.json',
				size: categoriesSize,
			})
		}
		this.#archive.append(categoriesJson, {
			name: 'categories.json',
		})
		this.#entryCount++

		// Validate and add fields.json
		const fields = Object.fromEntries(this.#fields)
		const fieldsJson = JSON.stringify(fields, null, 2)
		const fieldsSize = Buffer.byteLength(fieldsJson, 'utf-8')
		if (fieldsSize > MAX_JSON_SIZE) {
			throw new JsonSizeError({
				fileName: 'fields.json',
				size: fieldsSize,
			})
		}
		this.#archive.append(fieldsJson, {
			name: 'fields.json',
		})
		this.#entryCount++

		// Validate and add categorySelection.json
		const categorySelectionJson = JSON.stringify(
			this.#categorySelection,
			null,
			2,
		)
		const categorySelectionSize = Buffer.byteLength(
			categorySelectionJson,
			'utf-8',
		)
		if (categorySelectionSize > MAX_JSON_SIZE) {
			throw new JsonSizeError({
				fileName: 'categorySelection.json',
				size: categorySelectionSize,
			})
		}
		this.#archive.append(categorySelectionJson, {
			name: 'categorySelection.json',
		})
		this.#entryCount++

		// Validate and add metadata.json
		/** @type {MetadataOutput} */
		const metadata = {
			...this.#metadata,
			buildDateValue: Date.now(),
		}
		const metadataJson = JSON.stringify(metadata, null, 2)
		const metadataSize = Buffer.byteLength(metadataJson, 'utf-8')
		if (metadataSize > MAX_JSON_SIZE) {
			throw new JsonSizeError({
				fileName: 'metadata.json',
				size: metadataSize,
			})
		}
		this.#archive.append(metadataJson, {
			name: 'metadata.json',
		})
		this.#entryCount++

		// Add VERSION file
		this.#archive.append(FILE_VERSION, { name: VERSION_FILE })
		this.#entryCount++

		// Final check for total entry count
		if (this.#entryCount > MAX_ENTRIES) {
			throw new TooManyEntriesError()
		}

		this.#archive.finalize()
	}

	#checkRefs() {
		validateReferences({
			categories: this.#categories,
			fieldIds: this.#fields,
			iconIds: this.#iconIds,
		})
	}
}
