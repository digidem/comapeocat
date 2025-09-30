import fs from 'node:fs/promises'
import path from 'node:path'
import { jsonFiles, parse } from './utils.js'
import { PresetSchemaStrict } from '../schema/preset.js'
import { FieldSchemaStrict } from '../schema/field.js'
import { FIELDS_DIR, ICONS_DIR, PRESETS_DIR } from './constants.js'
import { PresetRefError } from './errors.js'
import { parseSvg } from './parse-svg.js'

/**
 * @import {PresetOutput} from '../schema/preset.js'
 * @import {FieldOutput} from '../schema/field.js'
 * @import {DefaultsOutput} from '../schema/defaults.js'
 */

/**
 * Read the preset, field, defaults, and icon files in a directory and validate them.
 *
 * @param {string} dir - Directory path
 * @returns {AsyncGenerator<{type: 'preset', value: PresetOutput }
 *  | { type: 'field', value: FieldOutput }
 *  | { type: 'defaults', value: DefaultsOutput }
 *  | { type: 'icon', value: string }
 * >} Completes when all files are read and validated
 */
export async function* readFiles(dir) {
	/** @type {Map<string, Set<string>>} */
	const fieldRefs = new Map()
	/** @type {Map<string, Set<string>>} */
	const iconRefs = new Map()

	for await (const { name, data } of jsonFiles(path.join(dir, PRESETS_DIR))) {
		const value = parse(PresetSchemaStrict, data, { fileName: name })
		const { fields, icon } = value

		for (const fieldRef of fields) {
			fieldRefs.set(
				fieldRef,
				new Set([...(fieldRefs.get(fieldRef) || []), name]),
			)
		}
		if (icon) {
			iconRefs.set(icon, new Set([...(iconRefs.get(icon) || []), name]))
		}
		yield { type: 'preset', value }
	}

	for await (const { name, data } of jsonFiles(path.join(dir, FIELDS_DIR))) {
		const value = parse(FieldSchemaStrict, data, { fileName: name })
		fieldRefs.delete(name.replace(/\.json$/, ''))
		yield { type: 'field', value }
	}

	const iconFiles = await fs.readdir(path.join(dir, ICONS_DIR), {
		recursive: true,
	})
	for (const name of iconFiles) {
		if (!name.endsWith('.svg')) continue
		iconRefs.delete(name.replace(/\.svg$/, ''))
		const data = await fs.readFile(path.join(dir, ICONS_DIR, name), 'utf-8')
		const value = parseSvg(data)
		yield { type: 'icon', value }
	}

	if (fieldRefs.size > 0) {
		throw new PresetRefError({ missingRefs: fieldRefs, property: 'field' })
	}
	if (iconRefs.size > 0) {
		throw new PresetRefError({ missingRefs: iconRefs, property: 'icon' })
	}
}
