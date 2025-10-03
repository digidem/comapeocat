import {
	CategoryRefError,
	InvalidDefaultsError,
	DefaultsRefError,
} from './errors.js'
import { addRefToMap, typedEntries } from './utils.js'

/**
 * Validate category references to fields, icons, and defaults geometry types.
 * Throws errors if any invalid references are found.
 *
 * @param {object} params
 * @param {Map<string, {fields: string[], icon?: string, geometry: string[]}>} params.categories - Map of category ID to category data
 * @param {Set<string> | Map<string, unknown>} params.fieldIds - Set of field IDs or Map with field IDs as keys
 * @param {Set<string>} params.iconIds - Set of icon IDs
 * @param {Record<string, string[]>} [params.defaults] - Optional defaults object mapping geometry types to category IDs
 * @throws {CategoryRefError} When field or icon references are missing
 * @throws {import('./errors.js').InvalidDefaultsError} When categories in defaults don't support the geometry type
 */

export function validateReferences({
	categories,
	fieldIds,
	iconIds,
	defaults,
}) {
	/** @type {Map<string, Set<string>>} */
	const missingIconRefs = new Map()
	/** @type {Map<string, Set<string>>} */
	const missingFieldRefs = new Map()

	// Convert Map to Set if needed
	const fieldIdSet =
		fieldIds instanceof Map ? new Set(fieldIds.keys()) : fieldIds

	// Check field and icon references in categories
	for (const [categoryId, category] of categories.entries()) {
		for (const fieldId of category.fields) {
			if (!fieldIdSet.has(fieldId)) {
				addRefToMap(missingFieldRefs, fieldId, categoryId)
			}
		}
		if (category.icon && !iconIds.has(category.icon)) {
			addRefToMap(missingIconRefs, category.icon, categoryId)
		}
	}

	if (missingFieldRefs.size > 0) {
		throw new CategoryRefError({
			missingRefs: missingFieldRefs,
			property: 'field',
		})
	}
	if (missingIconRefs.size > 0) {
		throw new CategoryRefError({
			missingRefs: missingIconRefs,
			property: 'icon',
		})
	}

	// Check defaults geometry types if provided
	if (defaults) {
		/** @type {Map<string, Set<string>>} */
		const invalidGeometryRefs = new Map()

		for (const [geometryType, categoryIds] of typedEntries(defaults)) {
			for (const categoryId of categoryIds) {
				const category = categories.get(categoryId)
				if (!category) {
					throw new DefaultsRefError({ categoryId, geometryType })
				}
				if (category && !category.geometry.includes(geometryType)) {
					addRefToMap(invalidGeometryRefs, geometryType, categoryId)
				}
			}
		}

		if (invalidGeometryRefs.size > 0) {
			throw new InvalidDefaultsError({ invalidRefs: invalidGeometryRefs })
		}
	}
}
