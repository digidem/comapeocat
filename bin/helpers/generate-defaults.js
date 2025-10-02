import { typedEntries } from '../../src/lib/utils.js'

/** @import {PresetDeprecatedOutput} from '../../src/schema/preset.js' */
/** @import {DefaultsInput} from '../../src/schema/defaults.js' */
/** @import {Entries} from 'type-fest' */

/** @typedef {Pick<PresetDeprecatedOutput, 'sort' | 'name'> & { id: string }} PresetForSort */

/**
 * Generate defaults from presets if no defaults are provided. Sort presets by
 * sort field first, then by name.
 *
 * @param {Map<string, PresetDeprecatedOutput>} presetsMap
 * @returns {DefaultsInput}
 */
export function generateDefaults(presetsMap) {
	/** @type {Record<keyof DefaultsInput, Array<PresetForSort>>} */
	const defaultsForSort = {
		point: [],
		line: [],
		area: [],
	}
	for (const [id, preset] of presetsMap) {
		for (const geom of preset.geometry) {
			if (!isKeyOf(geom, defaultsForSort)) continue
			defaultsForSort[geom].push({ id, sort: preset.sort, name: preset.name })
		}
	}
	/** @type {Entries<DefaultsInput>} */
	const defaultsEntries = []
	for (const [geom, presetsForSort] of typedEntries(defaultsForSort)) {
		defaultsEntries.push([
			geom,
			presetsForSort.sort(sortPresets).map((p) => p.id),
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
