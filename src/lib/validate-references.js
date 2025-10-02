import {
	PresetRefError,
	InvalidDefaultsError,
	DefaultsRefError,
} from './errors.js'
import { addRefToMap, typedEntries } from './utils.js'

/**
 * Validate preset references to fields, icons, and defaults geometry types.
 * Throws errors if any invalid references are found.
 *
 * @param {object} params
 * @param {Map<string, {fields: string[], icon?: string, geometry: string[]}>} params.presets - Map of preset ID to preset data
 * @param {Set<string> | Map<string, unknown>} params.fieldIds - Set of field IDs or Map with field IDs as keys
 * @param {Set<string>} params.iconIds - Set of icon IDs
 * @param {Record<string, string[]>} [params.defaults] - Optional defaults object mapping geometry types to preset IDs
 * @throws {import('./errors.js').PresetRefError} When field or icon references are missing
 * @throws {import('./errors.js').InvalidDefaultsError} When presets in defaults don't support the geometry type
 */

export function validateReferences({ presets, fieldIds, iconIds, defaults }) {
	/** @type {Map<string, Set<string>>} */
	const missingIconRefs = new Map()
	/** @type {Map<string, Set<string>>} */
	const missingFieldRefs = new Map()

	// Convert Map to Set if needed
	const fieldIdSet =
		fieldIds instanceof Map ? new Set(fieldIds.keys()) : fieldIds

	// Check field and icon references in presets
	for (const [presetId, preset] of presets.entries()) {
		for (const fieldId of preset.fields) {
			if (!fieldIdSet.has(fieldId)) {
				addRefToMap(missingFieldRefs, fieldId, presetId)
			}
		}
		if (preset.icon && !iconIds.has(preset.icon)) {
			addRefToMap(missingIconRefs, preset.icon, presetId)
		}
	}

	if (missingFieldRefs.size > 0) {
		throw new PresetRefError({
			missingRefs: missingFieldRefs,
			property: 'field',
		})
	}
	if (missingIconRefs.size > 0) {
		throw new PresetRefError({
			missingRefs: missingIconRefs,
			property: 'icon',
		})
	}

	// Check defaults geometry types if provided
	if (defaults) {
		/** @type {Map<string, Set<string>>} */
		const invalidGeometryRefs = new Map()

		for (const [geometryType, presetIds] of typedEntries(defaults)) {
			for (const presetId of presetIds) {
				const preset = presets.get(presetId)
				if (!preset) {
					throw new DefaultsRefError({ presetId, geometryType })
				}
				if (preset && !preset.geometry.includes(geometryType)) {
					addRefToMap(invalidGeometryRefs, geometryType, presetId)
				}
			}
		}

		if (invalidGeometryRefs.size > 0) {
			throw new InvalidDefaultsError({ invalidRefs: invalidGeometryRefs })
		}
	}
}
