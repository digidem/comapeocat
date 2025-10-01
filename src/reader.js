import { open } from 'yauzl-promise'
import { PresetSchema } from './schema/preset.js'
import { FieldSchema } from './schema/field.js'
import { DefaultsSchema } from './schema/defaults.js'
import { MetadataSchema } from './schema/metadata.js'
import parseJson from 'parse-json'
import * as v from 'valibot'
import { VERSION_FILE, ICONS_DIR, TRANSLATIONS_DIR } from './lib/constants.js'
import {
	InvalidFileVersionError,
	MissingDefaultsError,
	MissingMetadataError,
	MissingPresetsError,
	UnsupportedFileVersionError,
} from './lib/errors.js'
import {
	isSupportedBCP47,
	parse,
	validatePresetReferences,
} from './lib/utils.js'
import { parse as parseBCP47 } from 'bcp-47'
import { TranslationsSchema } from './schema/translations.js'

const SUPPORTED_MAJOR_VERSION = 1
/** @import { ZipFile, Entry } from 'yauzl-promise' */
/** @import { SchemaError } from './lib/errors.js' */
/** @import { JSONError } from 'parse-json' */
/** @import {SetOptional} from 'type-fest' */
/** @import {FieldOutput} from './schema/field.js' */
/** @import {PresetOutput} from './schema/preset.js' */
/** @import {DefaultsOutput} from './schema/defaults.js' */
/** @import {MetadataOutput} from './schema/metadata.js' */
/**
 * @typedef {{
 *   presets: Entry,
 *   defaults: Entry,
 *   metadata: Entry,
 *   fields?: Entry,
 *   icons: Map<string, Entry>,
 *   translations: Map<string, Entry>,
 * }} ZipEntries
 */
const FILENAMES = /** @type {const} */ ({
	'presets.json': 'presets',
	'fields.json': 'fields',
	'defaults.json': 'defaults',
	'metadata.json': 'metadata',
})
const ICON_REGEX = new RegExp(`^${ICONS_DIR}/(.+)\\.svg$`)
const TRANSLATIONS_REGEX = new RegExp(
	`^${TRANSLATIONS_DIR}/([a-zA-Z0-9-_]+)\\.json$`,
)
const VERSION_REGEX = /^(\d+)\.(\d+)$/

const PresetMapSchema = v.record(v.string(), PresetSchema)

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
		/** @type {Map<string, PresetOutput> | undefined} */
		presets: undefined,
		/** @type {DefaultsOutput | undefined} */
		defaults: undefined,
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
			/** @type {SetOptional<ZipEntries, 'presets' | 'defaults' | 'metadata'>} */
			const entries = {
				icons: new Map(),
				translations: new Map(),
			}
			let versionFound = false
			if (this.#closePromise) throw new Error('Reader is closed')
			const zip = await zipPromise
			if (this.#closePromise) throw new Error('Reader is closed')
			for await (const entry of zip) {
				if (this.#closePromise) throw new Error('Reader is closed')
				if (isValidFileName(entry.filename)) {
					entries[FILENAMES[entry.filename]] = entry
				} else if (entry.filename === VERSION_FILE) {
					versionFound = true
					const version = await concatStream(await entry.openReadStream())
					assertReadableVersion(version)
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
						// Ignore invalid or unsupported BCP 47 language tags
						if (isSupportedBCP47(parseBCP47(lang))) {
							entries.translations.set(lang, entry)
							continue
						}
					}
				}
			}
			if (!versionFound) {
				throw new InvalidFileVersionError({ version: '(missing)' })
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

		const presets = await this.presets()
		const defaults = await this.defaults()
		const fields = await this.fields()
		const iconNames = await this.iconNames()

		validatePresetReferences({
			presets,
			fieldIds: fields,
			iconIds: iconNames,
			defaults,
		})
	}

	/**
	 * @returns {Promise<Map<string, PresetOutput>>} Map of preset ID to preset data
	 * @throws {SchemaError | JSONError} When the presets.json file in the archive is not valid
	 * @throws {InvalidFileError} When the file is not a valid comapeocat file
	 */
	async presets() {
		if (this.#cached.presets) return this.#cached.presets
		const { presets: entry } = await this.#entriesPromise
		const data = await this.#readJsonEntry(entry)
		const result = parse(PresetMapSchema, data, { fileName: entry.filename })
		this.#cached.presets = new Map(Object.entries(result))
		return this.#cached.presets
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
	 * @returns {AsyncGenerator<{lang: string, translations: v.InferOutput<typeof TranslationsSchema>}>}
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
	 * @returns {Promise<DefaultsOutput>} Defaults data
	 */
	async defaults() {
		if (this.#cached.defaults) return this.#cached.defaults
		const { defaults: entry } = await this.#entriesPromise
		const data = await this.#readJsonEntry(entry)
		this.#cached.defaults = v.parse(DefaultsSchema, data)
		return this.#cached.defaults
	}

	/**
	 * @returns {Promise<MetadataOutput>} Metadata data
	 */
	async metadata() {
		if (this.#cached.metadata) return this.#cached.metadata
		const { metadata: entry } = await this.#entriesPromise
		const data = await this.#readJsonEntry(entry)
		this.#cached.metadata = v.parse(MetadataSchema, data)
		return this.#cached.metadata
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
 * @param {import('type-fest').SetOptional<ZipEntries, 'presets' | 'defaults' | 'metadata'>} entries
 * @returns {asserts entries is ZipEntries}
 */
function assertValidEntries(entries) {
	if (!entries.presets) {
		throw new MissingPresetsError()
	}
	if (!entries.defaults) {
		throw new MissingDefaultsError()
	}
	if (!entries.metadata) {
		throw new MissingMetadataError()
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
