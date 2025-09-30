import { open } from 'yauzl-promise'
import { PresetSchema } from './schema/preset.js'
import { FieldSchema } from './schema/field.js'
import { DefaultsSchema } from './schema/defaults.js'
import parseJson from 'parse-json'
import * as v from 'valibot'
import { VERSION_FILE } from './lib/constants.js'
import {
	InvalidFileError,
	InvalidFileVersionError,
	isInvalidFileError,
	MissingDefaultsError,
	MissingPresetsError,
	UnsupportedFileVersionError,
} from './lib/errors.js'
import { parse } from './lib/utils.js'

const SUPPORTED_MAJOR_VERSION = 1
/** @import { ZipFile, Entry } from 'yauzl-promise' */
/** @import { SchemaError } from './lib/errors.js' */
/** @import { JSONError } from 'parse-json' */
/**
 * @typedef {{
 *   presets: Entry,
 *   defaults: Entry,
 *   fields?: Entry,
 *   icons: Map<string, Entry>,
 * }} Entries
 */
const FILENAMES = /** @type {const} */ ({
	'presets.json': 'presets',
	'fields.json': 'fields',
	'defaults.json': 'defaults',
})
const ICON_REGEX = /^icons\/(.+)\.svg$/
const VERSION_REGEX = /^(\d+)\.(\d+)$/

const PresetMapSchema = v.record(v.string(), PresetSchema)

export class Reader {
	/** @type {Promise<ZipFile>} */
	#zipPromise
	/** @type {Promise<Entries>} */
	#entriesPromise
	/** @type {undefined | Promise<void>} */
	#closePromise

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
			/** @type {import('type-fest').SetOptional<Entries, 'presets' | 'defaults'>} */
			const entries = {
				icons: new Map(),
			}
			if (this.#closePromise) throw new Error('Reader is closed')
			const zip = await zipPromise
			if (this.#closePromise) throw new Error('Reader is closed')
			for await (const entry of zip) {
				if (this.#closePromise) throw new Error('Reader is closed')
				if (isValidFileName(entry.filename)) {
					entries[FILENAMES[entry.filename]] = entry
				} else if (entry.filename === VERSION_FILE) {
					const version = await concatStream(await entry.openReadStream())
					assertReadableVersion(version)
				} else {
					const match = entry.filename.match(ICON_REGEX)
					if (match) {
						const [, iconName] = match
						entries.icons.set(iconName, entry)
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
		try {
			await this.#entriesPromise
		} catch (error) {
			if (isInvalidFileError(error)) {
				throw new InvalidFileError({ cause: error })
			}
			throw error
		}
	}

	/**
	 * @returns {Promise<Map<string, v.InferOutput<typeof PresetSchema>>>} Map of preset ID to preset data
	 * @throws {SchemaError | JSONError} When the presets.json file in the archive is not valid
	 * @throws {InvalidFileError} When the file is not a valid comapeocat file
	 */
	async presets() {
		const { presets: entry } = await this.#entriesPromise
		const json = await concatStream(await entry.openReadStream())
		const data = parseJson(json, undefined, entry.filename)
		const result = parse(PresetMapSchema, data, { fileName: entry.filename })
		return new Map(Object.entries(result))
	}

	/**
	 * @returns {Promise<Map<string, v.InferOutput<typeof FieldSchema>>>} Map of field ID to field data
	 * @throws {SchemaError | JSONError} When the fields.json file in the archive is not valid
	 * @throws {InvalidFileError} When the file is not a valid comapeocat file
	 */
	async fields() {
		const { fields: entry } = await this.#entriesPromise
		if (!entry) return new Map()
		const json = await concatStream(await entry.openReadStream())
		const data = parseJson(json, undefined, entry.filename)
		const result = parse(v.record(v.string(), FieldSchema), data, {
			fileName: entry.filename,
		})
		return new Map(Object.entries(result))
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
	 * @returns {Promise<v.InferOutput<typeof DefaultsSchema>>} Defaults data
	 */
	async defaults() {
		const { defaults: entry } = await this.#entriesPromise
		const json = await concatStream(await entry.openReadStream())
		const data = parseJson(json, undefined, entry.filename)
		return v.parse(DefaultsSchema, data)
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
 * @param {import('type-fest').SetOptional<Entries, 'presets' | 'defaults'>} entries
 * @returns {asserts entries is Entries}
 */
function assertValidEntries(entries) {
	if (!entries.presets) {
		throw new MissingPresetsError()
	}
	if (!entries.defaults) {
		throw new MissingDefaultsError()
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
