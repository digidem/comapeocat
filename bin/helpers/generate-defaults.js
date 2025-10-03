import { typedEntries } from '../../src/lib/utils.js'

/** @import {CategoryDeprecatedInput} from '../../src/schema/category.js' */
/** @import {DefaultsInput} from '../../src/schema/defaults.js' */
/** @import {Entries} from 'type-fest' */

/** @typedef {Pick<CategoryDeprecatedInput, 'sort' | 'name'> & { id: string }} CategoryForSort */

/**
 * Generate defaults from categories if no defaults are provided. Sort categories by
 * sort field first, then by name.
 *
 * @param {Map<string, CategoryDeprecatedInput>} categoriesMap
 * @returns {DefaultsInput}
 */
export function generateDefaults(categoriesMap) {
	/** @type {Record<keyof DefaultsInput, Array<CategoryForSort>>} */
	const defaultsForSort = {
		point: [],
		line: [],
		area: [],
	}
	for (const [id, category] of categoriesMap) {
		for (const geom of category.geometry) {
			if (!isKeyOf(geom, defaultsForSort)) continue
			defaultsForSort[geom].push({
				id,
				sort: category.sort,
				name: category.name,
			})
		}
	}
	/** @type {Entries<DefaultsInput>} */
	const defaultsEntries = []
	for (const [geom, categoriesForSort] of typedEntries(defaultsForSort)) {
		defaultsEntries.push([
			geom,
			categoriesForSort.sort(sortCategories).map((c) => c.id),
		])
	}
	return /** @type {DefaultsInput} */ (Object.fromEntries(defaultsEntries))
}

/**
 * Type guard to check if a key is a key of an object.
 * @template {string} K
 * @template {object} O
 * @param {K} key
 * @param {O} object
 * @returns {key is keyof O} True if the key is a key of the object
 */
function isKeyOf(key, object) {
	return key in object
}

/**
 * @param {CategoryForSort} a
 * @param {CategoryForSort} b
 * @returns {number}
 */
function sortCategories(a, b) {
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
