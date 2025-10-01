import { EventEmitter } from 'node:events'
import { PassThrough, pipeline } from 'node:stream'

import archiver from 'archiver'
import { pEvent } from 'p-event'
import * as v from 'valibot'

import { ICONS_DIR, TRANSLATIONS_DIR, VERSION_FILE } from './lib/constants.js'
import {
	AddAfterFinishError,
	MissingMetadataError,
	MissingPresetsError,
} from './lib/errors.js'
import { parseSvg } from './lib/parse-svg.js'
import { validatePresetReferences } from './lib/utils.js'
import { DefaultsSchemaStrict } from './schema/defaults.js'
import { FieldSchemaStrict } from './schema/field.js'
import { MetadataSchemaStrict } from './schema/metadata.js'
import { PresetSchemaStrict } from './schema/preset.js'
import { TranslationsSchema } from './schema/translations.js'

/** @import { PresetStrictInput , PresetStrictOutput } from './schema/preset.js' */
/** @import { FieldStrictInput, FieldStrictOutput } from './schema/field.js' */
/** @import { DefaultsStrictInput, DefaultsStrictOutput } from './schema/defaults.js' */
/** @import { MetadataStrictInput, MetadataStrictOutput } from './schema/metadata.js' */
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
	/** @type {Map<string, PresetStrictOutput>} */
	#presets = new Map()
	/** @type {Map<string, FieldStrictOutput>} */
	#fields = new Map()
	/** @type {Set<string>} */
	#iconIds = new Set()
	/** @type {DefaultsStrictOutput | undefined} */
	#defaults = undefined
	/** @type {MetadataStrictOutput | undefined} */
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
	 * @param {string} id preset ID (normally the filename without .json)
	 * @param {PresetStrictInput} preset
	 */
	addPreset(id, preset) {
		if (this.#finished) throw new AddAfterFinishError()
		this.#presets.set(id, v.parse(PresetSchemaStrict, preset))
	}

	/**
	 * @param {DefaultsStrictInput} defaults
	 */
	setDefaults(defaults) {
		if (this.#finished) throw new AddAfterFinishError()
		this.#defaults = v.parse(DefaultsSchemaStrict, defaults)
	}

	/**
	 * @param {MetadataStrictInput} metadata
	 */
	setMetadata(metadata) {
		if (this.#finished) throw new AddAfterFinishError()
		this.#metadata = v.parse(MetadataSchemaStrict, metadata)
	}

	/**
	 * @param {string} id field ID (normally the filename without .json)
	 * @param {FieldStrictInput} field
	 */
	addField(id, field) {
		if (this.#finished) throw new AddAfterFinishError()
		this.#fields.set(id, v.parse(FieldSchemaStrict, field))
	}

	/**
	 * @param {string} lang BCP47 language tag (e.g. "en", "de", "fr", "en-US")
	 * @param {v.InferInput<typeof TranslationsSchema>} translations
	 */
	async addTranslations(lang, translations) {
		if (this.#finished) throw new AddAfterFinishError()
		const parsedTranslations = v.parse(TranslationsSchema, translations)
		await this.#append(JSON.stringify(parsedTranslations, null, 2), {
			name: `${TRANSLATIONS_DIR}/${lang}.json`,
		})
	}

	/**
	 * @param {string} id icon ID (normally the filename without .svg)
	 * @param {string} svg SVG content
	 */
	async addIcon(id, svg) {
		if (this.#finished) throw new AddAfterFinishError()
		const parsedSvg = parseSvg(svg) // Validate SVG
		await this.#append(parsedSvg, { name: `${ICONS_DIR}/${id}.svg` })
		this.#iconIds.add(id)
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
	 * @throws {PresetRefError} When there are missing field or icon references
	 * @throws {MissingMetadataError} When metadata is not set
	 * @throws {MissingPresetsError} When no presets have been added
	 * @throws {MissingDefaultsError} When defaults are not set
	 */
	finish() {
		this.#checkRefs()
		if (!this.#metadata) {
			throw new MissingMetadataError()
		}
		if (this.#presets.size === 0) {
			throw new MissingPresetsError()
		}
		if (!this.#defaults) {
			this.#defaults = generateDefaults(this.#presets)
		}
		this.#finished = true
		const presets = Object.fromEntries(this.#presets)
		this.#archive.append(JSON.stringify(presets, null, 2), {
			name: 'presets.json',
		})
		const fields = Object.fromEntries(this.#fields)
		this.#archive.append(JSON.stringify(fields, null, 2), {
			name: 'fields.json',
		})
		this.#archive.append(JSON.stringify(this.#defaults, null, 2), {
			name: 'defaults.json',
		})
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
		validatePresetReferences({
			presets: this.#presets,
			fieldIds: this.#fields,
			iconIds: this.#iconIds,
		})
	}
}

/** @typedef {Pick<PresetStrictOutput, 'sort' | 'name'> & { id: string }} PresetForSort */

/**
 * Generate defaults from presets if no defaults are provided. Sort presets by
 * sort field first, then by name.
 *
 * @param {Map<string, PresetStrictOutput>} presetsMap
 * @returns {DefaultsStrictOutput}
 */
function generateDefaults(presetsMap) {
	/** @type {Record<keyof DefaultsStrictOutput, Array<PresetForSort>>} */
	const defaultsForSort = {
		point: [],
		line: [],
		area: [],
	}
	for (const [id, preset] of presetsMap) {
		for (const geom of preset.geometry) {
			defaultsForSort[geom].push({ id, sort: preset.sort, name: preset.name })
		}
	}
	/** @type {Entries<DefaultsStrictOutput>} */
	const defaultsEntries = []
	for (const [
		geom,
		presetsForSort,
	] of /** @type {Entries<typeof defaultsForSort>} */ (
		Object.entries(defaultsForSort)
	)) {
		defaultsEntries.push([
			geom,
			presetsForSort.sort(sortPresets).map((p) => p.id),
		])
	}
	return /** @type {DefaultsStrictOutput} */ (
		Object.fromEntries(defaultsEntries)
	)
}

/**
 * @param {PresetForSort} a
 * @param {PresetForSort} b
 * @returns {number}
 */
function sortPresets(a, b) {
	if (
		'sort' in a &&
		typeof a.sort === 'number' &&
		'sort' in b &&
		typeof b.sort === 'number'
	) {
		return a.sort - b.sort || a.name.localeCompare(b.name)
	} else if ('sort' in a && typeof a.sort === 'number') {
		return -1 // a has sort, b doesn't
	} else if ('sort' in b && typeof b.sort === 'number') {
		return 1 // b has sort, a doesn't
	} else {
		return a.name.localeCompare(b.name) // neither has sort
	}
}
