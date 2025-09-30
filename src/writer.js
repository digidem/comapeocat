import archiver from 'archiver'
import { EventEmitter } from 'node:events'
import { PassThrough, pipeline } from 'node:stream'
import { parseSvg } from './lib/parse-svg.js'

/** @import { PresetOutput } from './schema/preset.js' */
/** @import { FieldOutput } from './schema/field.js' */
/** @import { DefaultsOutput } from './schema/defaults.js' */
/** @import { MetadataOutput } from './schema/metadata.js' */

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
	/** @type {Map<string, PresetOutput>} */
	#presets = new Map()
	/** @type {Map<string, FieldOutput>} */
	#fields = new Map()
	/** @type {DefaultsOutput | undefined} */
	#defaults = undefined
	/** @type {MetadataOutput | undefined} */
	#metadata = undefined

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
	 * @param {string} id preset ID (normally the filename without .json)
	 * @param {PresetOutput} preset
	 */
	addPreset(id, preset) {
		this.#presets.set(id, preset)
	}

	/**
	 * @param {DefaultsOutput} defaults
	 */
	setDefaults(defaults) {
		this.#defaults = defaults
	}

	/**
	 * @param {MetadataOutput} metadata
	 */
	setMetadata(metadata) {
		this.#metadata = metadata
	}

	/**
	 * @param {string} id field ID (normally the filename without .json)
	 * @param {FieldOutput} field
	 */
	addField(id, field) {
		this.#fields.set(id, field)
	}

	/**
	 * @param {string} id icon ID (normally the filename without .svg)
	 * @param {string} svg SVG content
	 */
	addIcon(id, svg) {
		const parsedSvg = parseSvg(svg) // Validate SVG
		this.#archive.append(parsedSvg, { name: `icons/${id}.svg` })
	}

	finish() {
		///
	}
}
