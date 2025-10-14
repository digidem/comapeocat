import { parse as parseBCP47 } from 'bcp-47'
import parseJson from 'parse-json'
import * as v from 'valibot'
import { open } from 'yauzl-promise'

import { VERSION_FILE, ICONS_DIR, TRANSLATIONS_DIR } from './lib/constants.js'
import {
	InvalidFileVersionError,
	MissingCategorySelectionError,
	MissingMetadataError,
	MissingCategoriesError,
	UnsupportedFileVersionError,
} from './lib/errors.js'
import { parse } from './lib/utils.js'
import { validateReferences } from './lib/validate-references.js'
import { CategorySchema } from './schema/category.js'
import { CategorySelectionSchema } from './schema/categorySelection.js'
import { FieldSchema } from './schema/field.js'
import { MetadataSchemaOutput } from './schema/metadata.js'
import { TranslationsSchema } from './schema/translations.js'

const SUPPORTED_MAJOR_VERSION = 1
/** @import { ZipFile, Entry } from 'yauzl-promise' */
/** @import { SchemaError } from './lib/errors.js' */
/** @import { JSONError } from 'parse-json' */
/** @import {SetOptional} from 'type-fest' */
/** @typedef {import('./schema/field.js').FieldOutput} FieldOutput */
/** @typedef {import('./schema/category.js').CategoryOutput} CategoryOutput */
/** @typedef {import('./schema/categorySelection.js').CategorySelectionOutput} CategorySelectionOutput */
/** @typedef {import('./schema/metadata.js').MetadataOutput} MetadataOutput */
/** @typedef {import('./schema/translations.js').TranslationsOutput} TranslationsOutput */
/**
 * @private
 * @typedef {{
 *   categories: Entry,
 *   categorySelection: Entry,
 *   metadata: Entry,
 *   fields?: Entry,
 *   icons: Map<string, Entry>,
 *   translations: Map<string, Entry>,
 *   fileVersion: string
 * }} ZipEntries
 */
const FILENAMES = /** @type {const} */ ({
	'categories.json': 'categories',
	'fields.json': 'fields',
	'categorySelection.json': 'categorySelection',
	'metadata.json': 'metadata',
})
const ICON_REGEX = new RegExp(`^${ICONS_DIR}/(.+)\\.svg$`)
const TRANSLATIONS_REGEX = new RegExp(
	`^${TRANSLATIONS_DIR}/([a-zA-Z0-9-_]+)\\.json$`,
)
const VERSION_REGEX = /^(\d+)\.(\d+)$/

const CategoryMapSchema = v.record(v.string(), CategorySchema)

export class Reader {
	/** @type {Promise<ZipFile>} */
	#zipPromise
	/** @type {Promise<ZipEntries>} */
	#entriesPromise
	/** @type {undefined | Promise<void>} */
	#closePromise
	#cached = {
		/** @type {Map<string, FieldOutput> | undefined} */
		fields: undefined,
		/** @type {Map<string, CategoryOutput> | undefined} */
		categories: undefined,
		/** @type {CategorySelectionOutput | undefined} */
		categorySelection: undefined,
		/** @type {MetadataOutput | undefined} */
		metadata: undefined,
	}

	/**
	 * @param {string | ZipFile} filepathOrZip Path to comapeo categories file (.comapeocat), or an instance of yauzl ZipFile
	 */
	constructor(filepathOrZip) {
		const zipPromise = (this.#zipPromise =
			typeof filepathOrZip === 'string'
				? open(filepathOrZip)
				: Promise.resolve(filepathOrZip))
		zipPromise.catch(noop)
		this.#entriesPromise = (async () => {
			/** @type {SetOptional<ZipEntries, 'categories' | 'categorySelection' | 'metadata' | 'fileVersion'>} */
			const entries = {
				icons: new Map(),
				translations: new Map(),
			}
			if (this.#closePromise) throw new Error('Reader is closed')
			const zip = await zipPromise
			if (this.#closePromise) throw new Error('Reader is closed')
			for await (const entry of zip) {
				if (this.#closePromise) throw new Error('Reader is closed')
				if (isValidFileName(entry.filename)) {
					entries[FILENAMES[entry.filename]] = entry
				} else if (entry.filename === VERSION_FILE) {
					entries.fileVersion = await concatStream(await entry.openReadStream())
					assertReadableVersion(entries.fileVersion)
				} else {
					const iconMatch = entry.filename.match(ICON_REGEX)
					if (iconMatch) {
						const [, iconName] = iconMatch
						entries.icons.set(iconName, entry)
						continue
					}
					const translationMatch = entry.filename.match(TRANSLATIONS_REGEX)
					if (translationMatch) {
						const [, lang] = translationMatch
						// Ignore BCP 47 without a primary language subtag
						if (parseBCP47(lang).language) {
							entries.translations.set(lang, entry)
							continue
						}
					}
				}
			}
			assertValidEntries(entries)
			return entries
		})()
		this.#entriesPromise.catch(noop)
	}

	/**
	 * Resolves when the styled map package has been opened and the entries have
	 * been read. Throws any error that occurred during opening.
	 */
	async opened() {
		await this.#entriesPromise
	}

	async close() {
		if (this.#closePromise) return this.#closePromise
		this.#closePromise = (async () => {
			const zip = await this.#zipPromise
			await zip.close()
		})()
		return this.#closePromise
	}

	async validate() {
		await this.#entriesPromise

		const categories = await this.categories()
		const categorySelection = await this.categorySelection()
		const fields = await this.fields()
		const iconNames = await this.iconNames()

		validateReferences({
			categories,
			fieldIds: fields,
			iconIds: iconNames,
			categorySelection,
		})
	}

	/**
	 * @returns {Promise<Map<string, CategoryOutput>>} Map of category ID to category data
	 * @throws {SchemaError | JSONError} When the categories.json file in the archive is not valid
	 * @throws {InvalidFileError} When the file is not a valid comapeocat file
	 */
	async categories() {
		if (this.#cached.categories) return this.#cached.categories
		const { categories: entry } = await this.#entriesPromise
		const data = await this.#readJsonEntry(entry)
		const result = parse(CategoryMapSchema, data, { fileName: entry.filename })
		this.#cached.categories = new Map(Object.entries(result))
		return this.#cached.categories
	}

	/**
	 * @returns {Promise<Map<string, FieldOutput>>} Map of field ID to field data
	 * @throws {SchemaError | JSONError} When the fields.json file in the archive is not valid
	 * @throws {InvalidFileError} When the file is not a valid comapeocat file
	 */
	async fields() {
		if (this.#cached.fields) return this.#cached.fields
		const { fields: entry } = await this.#entriesPromise
		if (!entry) return new Map()
		const data = await this.#readJsonEntry(entry)
		const result = parse(v.record(v.string(), FieldSchema), data, {
			fileName: entry.filename,
		})
		this.#cached.fields = new Map(Object.entries(result))
		return this.#cached.fields
	}

	/**
	 * @returns {Promise<Set<string>>} Set of icon names (without .svg extension)
	 * @throws {InvalidFileError} When the file is not a valid comapeocat file
	 */
	async iconNames() {
		const { icons: entries } = await this.#entriesPromise
		return new Set(entries.keys())
	}

	/**
	 * Get the SVG XML content of an icon by its ID
	 * @param {string} iconId Icon ID
	 * @returns {Promise<string | null>} SVG XML content, or null if the icon does not exist
	 * @throws {InvalidFileError} When the file is not a valid comapeocat file
	 */
	async getIcon(iconId) {
		const { icons: entries } = await this.#entriesPromise
		const entry = entries.get(iconId)
		if (!entry) return null
		return concatStream(await entry.openReadStream())
	}

	/**
	 * Async generator to yield icon name and SVG XML content
	 * @returns {AsyncGenerator<{name: string, iconXml: string}>}
	 */
	async *icons() {
		const { icons: entries } = await this.#entriesPromise
		for (const [name, entry] of entries) {
			const iconXml = await concatStream(await entry.openReadStream())
			yield { name, iconXml }
		}
	}

	/**
	 * Async generator to yield language tag and translations data
	 * @returns {AsyncGenerator<{lang: string, translations: TranslationsOutput}>}
	 */
	async *translations() {
		const { translations: entries } = await this.#entriesPromise
		for (const [lang, entry] of entries) {
			const data = await this.#readJsonEntry(entry)
			const translations = parse(TranslationsSchema, data, {
				fileName: entry.filename,
			})
			yield { lang, translations }
		}
	}

	/**
	 * @returns {Promise<CategorySelectionOutput>} Category selection data
	 */
	async categorySelection() {
		if (this.#cached.categorySelection) return this.#cached.categorySelection
		const { categorySelection: entry } = await this.#entriesPromise
		const data = await this.#readJsonEntry(entry)
		this.#cached.categorySelection = v.parse(CategorySelectionSchema, data)
		return this.#cached.categorySelection
	}

	/**
	 * @returns {Promise<MetadataOutput>} Metadata data
	 */
	async metadata() {
		if (this.#cached.metadata) return this.#cached.metadata
		const { metadata: entry } = await this.#entriesPromise
		const data = await this.#readJsonEntry(entry)
		this.#cached.metadata = v.parse(MetadataSchemaOutput, data)
		return this.#cached.metadata
	}

	/**
	 * @returns {Promise<string>} File version string (e.g. "1.0")
	 */
	async fileVersion() {
		const { fileVersion } = await this.#entriesPromise
		return fileVersion
	}

	/**
	 * @param {Entry} entry
	 * @returns {Promise<unknown>}
	 * @throws {JSONError} When the JSON is invalid or does not conform to the expected schema
	 */
	async #readJsonEntry(entry) {
		const json = await concatStream(await entry.openReadStream())
		return parseJson(json, undefined, entry.filename)
	}
}

function noop() {}

/**
 * Check if a filename is valid (one of the expected filenames)
 * @param {string} fileName
 * @returns {fileName is keyof typeof FILENAMES}
 */
function isValidFileName(fileName) {
	return fileName in FILENAMES
}

/**
 * @param {import('node:stream').Readable} stream
 * @returns {Promise<string>}
 */
async function concatStream(stream) {
	const chunks = []
	for await (const chunk of stream) {
		chunks.push(chunk)
	}
	return Buffer.concat(chunks).toString('utf-8')
}

/**
 * @param {import('type-fest').SetOptional<ZipEntries, 'categories' | 'categorySelection' | 'metadata' | 'fileVersion'>} entries
 * @returns {asserts entries is ZipEntries}
 */
function assertValidEntries(entries) {
	if (!entries.categories) {
		throw new MissingCategoriesError()
	}
	if (!entries.categorySelection) {
		throw new MissingCategorySelectionError()
	}
	if (!entries.metadata) {
		throw new MissingMetadataError()
	}
	if (!entries.fileVersion) {
		throw new InvalidFileVersionError({ version: '(missing)' })
	}
}

/**
 * Assert that the version string is valid and supported
 * @param {string} version
 */
function assertReadableVersion(version) {
	const match = version.trim().match(VERSION_REGEX)
	if (!match) {
		throw new InvalidFileVersionError({ version })
	}
	const [, majorStr, minorStr] = match
	const major = Number(majorStr)
	const minor = Number(minorStr)
	if (Number.isNaN(major) || Number.isNaN(minor)) {
		throw new InvalidFileVersionError({ version })
	}
	if (major > SUPPORTED_MAJOR_VERSION) {
		throw new UnsupportedFileVersionError({
			version,
			supportedVersions: [SUPPORTED_MAJOR_VERSION],
		})
	}
}
