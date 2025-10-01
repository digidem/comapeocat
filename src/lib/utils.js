import { parse as parseBCP47 } from 'bcp-47'
import fs from 'node:fs/promises'
import path from 'node:path'
import * as v from 'valibot'
import { InvalidDefaultsError, PresetRefError, SchemaError } from './errors.js'
import parseJson from 'parse-json'

/**
 * Async generator to read all JSON files in a directory
 * @param {string} dir - Directory path
 * @returns {AsyncGenerator<{name: string, data: unknown}>} Yields objects with file name and parsed JSON data
 */
export async function* jsonFiles(dir, { recursive = true } = {}) {
	const entries = await fs.readdir(dir, { recursive })
	for (const entry of entries) {
		if (path.extname(entry) !== '.json') continue
		const json = await fs.readFile(path.join(dir, entry), 'utf-8')
		// Use parse-json to get better error messages
		const data = parseJson(json)
		yield { name: entry, data }
	}
}

/**
 * Parse and validate data against a schema, with fileName metadata for errors
 *
 * @template {v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>} TSchema
 * @param {TSchema} schema - The Valibot schema to validate against
 * @param {unknown} data - The data to validate
 * @param {object} params
 * @param {string} params.fileName - Name of the file being parsed (for error messages)
 * @return {v.InferOutput<TSchema>} The validated data
 * @throws {SchemaError} If validation fails, throws a SchemaError with details
 */
export function parse(schema, data, { fileName }) {
	try {
		return v.parse(schema, data)
	} catch (err) {
		if (v.isValiError(err)) {
			throw new SchemaError({ fileName, valiError: err })
		} else {
			throw err
		}
	}
}

/**
 * @template T
 * @param {Array<T>} value
 * @returns {value is [T, ...T[]]} True if the array is non-empty
 */
export function isNonEmptyArray(value) {
	return value.length > 0
}

/**
 * Add a preset reference to a map of missing references
 * @param {Map<string, Set<string>>} map
 * @param {string} refId
 * @param {string} presetId
 */
export function addRefToMap(map, refId, presetId) {
	const existing = map.get(refId)
	if (existing) {
		existing.add(presetId)
	} else {
		map.set(refId, new Set([presetId]))
	}
}

/**
 * Get typed entries from an object. Use this only on objects that have been
 * validated against a schema - it performs no runtime validation, just provides
 * correct TypeScript types.
 *
 * @template {Record<string, unknown>} T
 * @param {T} obj - The object to get entries from (must be schema-validated)
 * @returns {import('type-fest').Entries<T>}
 */
export function typedEntries(obj) {
	return /** @type {import('type-fest').Entries<T>} */ (Object.entries(obj))
}

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
export function validatePresetReferences({
	presets,
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

/** @param {string} lang */
export function assertValidBCP47(lang) {
	const parsed = parseBCP47(lang)
	// parseBCP47 will return an empty object if the tag is invalid
	if (Object.keys(parsed).length === 0) {
		throw new Error(`Invalid BCP 47 language tag: '${lang}'`)
	}
	if (!isSupportedBCP47(parsed)) {
		throw new Error(
			`Unsupported BCP 47 language tag: '${lang}'. Only language and region subtags are supported.`,
		)
	}
	return lang
}

/**
 * @param {import('bcp-47').Schema} schema
 * @returns {boolean} True if the schema represents a valid and supported BCP 47 tag
 */
export function isSupportedBCP47(schema) {
	// parseBCP47 will return an empty object if the tag is invalid
	if (Object.keys(schema).length === 0) return false
	const validSubtags = ['language', 'region']
	for (const key of Object.keys(schema)) {
		if (!validSubtags.includes(key)) {
			return false
		}
	}
	return true
}
