import fs from 'node:fs/promises'
import path from 'node:path'
import { jsonFiles, parse } from './utils.js'
import { PresetSchemaStrict } from '../schema/preset.js'
import { FieldSchemaStrict } from '../schema/field.js'
import { DefaultsSchemaStrict } from '../schema/defaults.js'
import { MetadataSchemaStrict } from '../schema/metadata.js'
import { MessagesSchemaStrict } from '../schema/messages.js'
import {
	FIELDS_DIR,
	ICONS_DIR,
	MESSAGES_DIR,
	METATADATA_FILE,
	PRESETS_DIR,
} from './constants.js'
import { parseSvg } from './parse-svg.js'
import parseJson from 'parse-json'

/**
 * @import {PresetStrictOutput} from '../schema/preset.js'
 * @import {FieldStrictOutput} from '../schema/field.js'
 * @import {DefaultsStrictOutput} from '../schema/defaults.js'
 * @import {MetadataStrictOutput} from '../schema/metadata.js'
 * @import {MessagesStrictOutput} from '../schema/messages.js'
 */

/**
 * Read the preset, field, defaults, and icon files in a directory and validate them.
 *
 * @param {string} dir - Directory path
 * @returns {AsyncGenerator<
 *  | { type: 'preset', id: string, value: PresetStrictOutput }
 *  | { type: 'field', id: string, value: FieldStrictOutput }
 *  | { type: 'defaults', id: 'defaults', value: DefaultsStrictOutput }
 *  | { type: 'icon', id: string, value: string }
 *  | { type: 'metadata', id: 'metadata', value: MetadataStrictOutput }
 *  | { type: 'messages', id: string, value: MessagesStrictOutput 	}
 * >} Completes when all files are read and validated
 */
export async function* readFiles(dir) {
	for await (const { name, data } of jsonFiles(path.join(dir, PRESETS_DIR))) {
		const value = parse(PresetSchemaStrict, data, { fileName: name })
		yield { type: 'preset', id: nameToId(name), value }
	}

	for await (const { name, data } of jsonFiles(path.join(dir, FIELDS_DIR))) {
		const value = parse(FieldSchemaStrict, data, { fileName: name })
		yield { type: 'field', id: nameToId(name), value }
	}

	const iconFiles = await fs.readdir(path.join(dir, ICONS_DIR), {
		recursive: true,
	})
	for (const name of iconFiles) {
		if (!name.endsWith('.svg')) continue
		const data = await fs.readFile(path.join(dir, ICONS_DIR, name), 'utf-8')
		const value = parseSvg(data)
		yield { type: 'icon', id: nameToId(name), value }
	}

	for await (const { name, data } of jsonFiles(path.join(dir, MESSAGES_DIR), {
		recursive: false,
	})) {
		const value = parse(MessagesSchemaStrict, data, { fileName: name })
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
		const value = parse(MetadataSchemaStrict, data, {
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
		const value = parse(DefaultsSchemaStrict, data, {
			fileName: 'defaults.json',
		})
		yield { type: 'defaults', id: 'defaults', value }
	}
}

/** @param {unknown} err */
function isNotFoundError(err) {
	return err instanceof Error && 'code' in err && err.code === 'ENOENT'
}

/**
 * Convert a filename to an ID by removing its extension
 * @param {string} name - Filename
 * @returns {string} ID (filename without extension)
 */
function nameToId(name) {
	return name.replace(/\.[^/.]+$/, '')
}
