import { open } from 'yauzl-promise'
import { PresetSchema } from './schema/preset.js'
import { FieldSchema } from './schema/field.js'
import { DefaultsSchema } from './schema/defaults.js'
import parseJson from 'parse-json'
import * as v from 'valibot'

/** @import { ZipFile, Entry } from 'yauzl-promise' */
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
					continue
				}
				const match = entry.filename.match(ICON_REGEX)
				if (match) {
					const [, iconName] = match
					entries.icons.set(iconName, entry)
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

	/**
	 * @returns {Promise<Map<string, v.InferOutput<typeof PresetSchema>>>} Map of preset ID to preset data
	 */
	async presets() {
		const { presets: entry } = await this.#entriesPromise
		const json = await concatStream(await entry.openReadStream())
		const data = parseJson(json, undefined, entry.filename)
		const result = v.parse(PresetMapSchema, data)
		return new Map(Object.entries(result))
	}

	/**
	 * @returns {Promise<Map<string, v.InferOutput<typeof FieldSchema>>>} Map of field ID to field data
	 */
	async fields() {
		const { fields: entry } = await this.#entriesPromise
		if (!entry) return new Map()
		const json = await concatStream(await entry.openReadStream())
		const data = parseJson(json, undefined, entry.filename)
		const result = v.parse(v.record(v.string(), FieldSchema), data)
		return new Map(Object.entries(result))
	}

	/**
	 * @returns {Promise<Set<string>>} Set of icon names (without .svg extension)
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
		throw new Error('No presets found in the archive')
	}
	if (!entries.defaults) {
		throw new Error('No defaults found in the archive')
	}
}
