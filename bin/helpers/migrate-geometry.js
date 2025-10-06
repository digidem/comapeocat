/** @import {CategoryDeprecatedGeometryInput, CategoryDeprecatedSortInput, CategoryInput} from '../../src/schema/category.js' */

/**
 * Map deprecated geometry types to CoMapeo document types
 * point -> observation, line -> track, other geometry types are ignored
 * @type {Record<string, 'observation' | 'track'>}
 */
const GEOMETRY_TO_APPLIES_TO = {
	point: 'observation',
	line: 'track',
}

/**
 * Migrate deprecated geometry field to appliesTo field
 * @param {CategoryDeprecatedGeometryInput | CategoryInput | CategoryDeprecatedSortInput} category
 * @returns {CategoryInput | CategoryDeprecatedSortInput} Migrated category
 */
export function migrateGeometry(category) {
	if (!('geometry' in category)) {
		// No geometry field, nothing to migrate
		return category
	}

	// Migrate geometry field to appliesTo
	const { geometry, ...rest } = category

	// Map geometry types to appliesTo document types, filtering out undefined values
	const appliesTo = /** @type {Array<'observation' | 'track'>} */ (
		Array.from(
			new Set(
				geometry
					.map((geomType) => GEOMETRY_TO_APPLIES_TO[geomType])
					.filter((type) => type !== undefined),
			),
		)
	)

	return {
		...rest,
		appliesTo,
	}
}
