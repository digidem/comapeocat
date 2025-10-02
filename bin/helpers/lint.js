import { InvalidDefaultsError, PresetRefError } from '../../src/lib/errors.js'
import { addRefToMap } from '../../src/lib/utils.js'
import { readFiles } from './read-files.js'

/** @import {DefaultsOutput} from '../../src/schema/defaults.js' */
/** @import {Entries} from 'type-fest' */
/**
 * Lint and validate categories in a folder
 * @param {string} dir - Directory path
 */
export async function lint(dir) {
	/** @type {Map<string, Set<string>>} */
	const fieldRefs = new Map()
	/** @type {Map<string, Set<string>>} */
	const iconRefs = new Map()
	/** @type {Set<string>} */
	const fieldIds = new Set()
	/** @type {Set<string>} */
	const iconIds = new Set()
	/** @type {Map<string, import('../../src/schema/preset.js').PresetDeprecatedInput>} */
	const presets = new Map()
	/** @type {DefaultsOutput | undefined} */
	let defaults = undefined
	/** @type {string[]} */
	const warnings = []

	const counts = {
		preset: 0,
		field: 0,
		icon: 0,
		messages: 0,
		defaults: 0,
		metadata: 0,
	}

	for await (const { type, id, value } of readFiles(dir)) {
		counts[type]++
		switch (type) {
			case 'field':
				fieldIds.add(id)
				break
			case 'icon':
				iconIds.add(id)
				break
			case 'preset':
				presets.set(id, value)
				for (const fieldRef of value.fields) {
					addRefToMap(fieldRefs, fieldRef, id)
				}
				if (value.icon) {
					addRefToMap(iconRefs, value.icon, id)
				}
				break
			case 'defaults':
				defaults = value
				break
		}
	}

	for (const fieldId of fieldIds) {
		if (fieldRefs.delete(fieldId)) {
			fieldIds.delete(fieldId)
		}
	}

	if (fieldRefs.size > 0) {
		throw new PresetRefError({ missingRefs: fieldRefs, property: 'field' })
	}

	if (fieldIds.size > 0) {
		const warning = `⚠️ Warning: ${fieldIds.size} field file${
			fieldIds.size > 1 ? 's' : ''
		} found with no presets referencing them:\n${[...fieldIds]
			.map((id) => `  - ${id}`)
			.join('\n')}`
		warnings.push(warning)
	}

	for (const iconId of iconIds) {
		if (iconRefs.delete(iconId)) {
			iconIds.delete(iconId)
		}
	}

	if (iconRefs.size > 0) {
		throw new PresetRefError({ missingRefs: iconRefs, property: 'icon' })
	}

	if (iconIds.size > 0) {
		const warning = `⚠️ Warning: ${iconIds.size} icon file${
			iconIds.size > 1 ? 's' : ''
		} found with no presets referencing them:\n${[...iconIds]
			.map((id) => `  - ${id}`)
			.join('\n')}`
		warnings.push(warning)
	}

	// Validate that presets referenced in defaults have the correct geometry types
	if (defaults) {
		/** @type {Map<string, Set<string>>} */
		const invalidRefs = new Map()
		for (const [
			geometryType,
			presetIds,
		] of /** @type {Entries<DefaultsOutput>} */ (Object.entries(defaults))) {
			for (const presetId of presetIds) {
				const preset = presets.get(presetId)
				if (preset && !preset.geometry.includes(geometryType)) {
					addRefToMap(invalidRefs, geometryType, presetId)
				}
			}
		}

		if (invalidRefs.size > 0) {
			throw new InvalidDefaultsError({ invalidRefs })
		}
	}

	let successMessage = ''
	for (const [type, count] of Object.entries(counts)) {
		if (['metadata', 'defaults'].includes(type) && count === 0) {
			warnings.push(`⚠️ Warning: No ${type}.json file found`)
			continue
		}
		successMessage += `✓ ${count} valid ${type} file${count > 1 ? 's' : ''}\n`
	}

	// Write to stderr, because stdout could be used for piping output
	console.warn(successMessage)
	if (warnings.length > 0) {
		console.warn(warnings.join('\n'))
	}
}
