import { EventEmitter } from 'node:events'
import { PassThrough, pipeline } from 'node:stream'

import archiver from 'archiver'
import { pEvent } from 'p-event'
import * as v from 'valibot'

import { ICONS_DIR, TRANSLATIONS_DIR, VERSION_FILE } from './lib/constants.js'
import {
	AddAfterFinishError,
	MissingCategorySelectionError,
	MissingMetadataError,
	MissingCategoriesError,
} from './lib/errors.js'
import { parseSvg } from './lib/parse-svg.js'
import { validateReferences } from './lib/validate-references.js'
import { CategorySchema } from './schema/category.js'
import { CategorySelectionSchema } from './schema/categorySelection.js'
import { FieldSchema } from './schema/field.js'
import { MetadataSchemaOutput } from './schema/metadata.js'
import { TranslationsSchema } from './schema/translations.js'

/** @import { CategoryInput, CategoryOutput } from './schema/category.js' */
/** @import { FieldInput, FieldOutput } from './schema/field.js' */
/** @import { CategorySelectionInput, CategorySelectionOutput } from './schema/categorySelection.js' */
/** @import { MetadataInput, MetadataOutput } from './schema/metadata.js' */
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
	 * @param {v.InferInput<typeof TranslationsSchema>} translations
	 * @returns {Promise<readonly v.InferOutput<typeof TranslationsSchema>>} The parsed translations that were added (unknown properties are stripped)
	 */
	async addTranslations(lang, translations) {
		if (this.#finished) throw new AddAfterFinishError()
		const parsedTranslations = v.parse(TranslationsSchema, translations)
		await this.#append(JSON.stringify(parsedTranslations, null, 2), {
			name: `${TRANSLATIONS_DIR}/${lang}.json`,
		})
		return parsedTranslations
	}

	/**
	 * @param {string} id icon ID (normally the filename without .svg)
	 * @param {string} svg SVG content
	 * @returns {Promise<string>} The parsed SVG that was added (extraneous data is stripped)
	 */
	async addIcon(id, svg) {
		if (this.#finished) throw new AddAfterFinishError()
		const parsedSvg = parseSvg(svg) // Validate SVG
		await this.#append(parsedSvg, { name: `${ICONS_DIR}/${id}.svg` })
		this.#iconIds.add(id)
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
		const categories = Object.fromEntries(this.#categories)
		this.#archive.append(JSON.stringify(categories, null, 2), {
			name: 'categories.json',
		})
		const fields = Object.fromEntries(this.#fields)
		this.#archive.append(JSON.stringify(fields, null, 2), {
			name: 'fields.json',
		})
		this.#archive.append(JSON.stringify(this.#categorySelection, null, 2), {
			name: 'categorySelection.json',
		})
		/** @type {MetadataOutput} */
		const metadata = {
			...this.#metadata,
			buildDateValue: Date.now(),
		}
		this.#archive.append(JSON.stringify(metadata, null, 2), {
			name: 'metadata.json',
		})
		this.#archive.append(FILE_VERSION, { name: VERSION_FILE })
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
