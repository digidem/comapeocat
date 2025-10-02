import fs from 'node:fs/promises'
import path from 'node:path'

import parseJson from 'parse-json'

import { DefaultsSchema } from '../schema/defaults.js'
import { FieldSchema } from '../schema/field.js'
import { MessagesSchema } from '../schema/messages.js'
import { MetadataSchemaInput } from '../schema/metadata.js'
import { PresetSchemaDeprecated } from '../schema/preset.js'
import {
	FIELDS_DIR,
	ICONS_DIR,
	MESSAGES_DIR,
	METATADATA_FILE,
	PRESETS_DIR,
} from './constants.js'
import { parseSvg } from './parse-svg.js'
import { jsonFiles, parse, isNotFoundError } from './utils.js'

/**
 * @import {PresetDeprecatedOutput} from '../schema/preset.js'
 * @import {FieldOutput} from '../schema/field.js'
 * @import {DefaultsOutput} from '../schema/defaults.js'
 * @import {MetadataInput} from '../schema/metadata.js'
 * @import {MessagesOutput} from '../schema/messages.js'
 */

/**
 * Read the preset, field, defaults, and icon files in a directory and validate them.
 *
 * @param {string} dir - Directory path
 * @returns {AsyncGenerator<
 *  | { type: 'preset', id: string, value: PresetDeprecatedOutput }
 *  | { type: 'field', id: string, value: FieldOutput }
 *  | { type: 'defaults', id: 'defaults', value: DefaultsOutput }
 *  | { type: 'icon', id: string, value: string }
 *  | { type: 'metadata', id: 'metadata', value: MetadataInput }
 *  | { type: 'messages', id: string, value: MessagesOutput 	}
 * >} Completes when all files are read and validated
 */
export async function* readFiles(dir) {
	for await (const { name, data } of jsonFiles(path.join(dir, PRESETS_DIR))) {
		const value = parse(PresetSchemaDeprecated, data, { fileName: name })
		yield { type: 'preset', id: nameToId(name), value }
	}

	for await (const { name, data } of jsonFiles(path.join(dir, FIELDS_DIR))) {
		const value = parse(FieldSchema, data, { fileName: name })
		yield { type: 'field', id: nameToId(name), value }
	}

	let iconFiles
	try {
		iconFiles = await fs.readdir(path.join(dir, ICONS_DIR), {
			recursive: true,
		})
	} catch (err) {
		// Icons are optional
		if (!isNotFoundError(err)) throw err
	}
	if (iconFiles) {
		for (const name of iconFiles) {
			if (!name.endsWith('.svg')) continue
			const data = await fs.readFile(path.join(dir, ICONS_DIR, name), 'utf-8')
			const value = parseSvg(data)
			yield { type: 'icon', id: nameToId(name), value }
		}
	}

	for await (const { name, data } of jsonFiles(path.join(dir, MESSAGES_DIR), {
		recursive: false,
	})) {
		const value = parse(MessagesSchema, data, { fileName: name })
		yield { type: 'messages', id: nameToId(name), value }
	}

	/** @type {string | undefined} */
	let metadataJson
	try {
		metadataJson = await fs.readFile(path.join(dir, METATADATA_FILE), 'utf-8')
	} catch (err) {
		// metadata.json is optional
		if (!isNotFoundError(err)) throw err
	}
	if (metadataJson) {
		const data = parseJson(metadataJson, undefined, METATADATA_FILE)
		const value = parse(MetadataSchemaInput, data, {
			fileName: METATADATA_FILE,
		})
		yield { type: 'metadata', id: 'metadata', value }
	}

	/** @type {string | undefined} */
	let defaultsJson
	try {
		defaultsJson = await fs.readFile(path.join(dir, 'defaults.json'), 'utf-8')
	} catch (err) {
		// defaults.json is optional
		if (!isNotFoundError(err)) throw err
	}
	if (defaultsJson) {
		const data = parseJson(defaultsJson, undefined, 'defaults.json')
		const value = parse(DefaultsSchema, data, {
			fileName: 'defaults.json',
		})
		yield { type: 'defaults', id: 'defaults', value }
	}
}

/**
 * Convert a filename to an ID by removing its extension
 * @param {string} name - Filename
 * @returns {string} ID (filename without extension)
 */
function nameToId(name) {
	return name.replace(/\.[^/.]+$/, '')
}
