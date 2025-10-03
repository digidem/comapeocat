import { parse as parseBCP47 } from 'bcp-47'
import * as v from 'valibot'

import { SchemaError } from './errors.js'

/** @param {unknown} err */
export function isNotFoundError(err) {
	return err instanceof Error && 'code' in err && err.code === 'ENOENT'
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
 * Add a category reference to a map of missing references
 * @param {Map<string, Set<string>>} map
 * @param {string} refId
 * @param {string} categoryId
 */
export function addRefToMap(map, refId, categoryId) {
	const existing = map.get(refId)
	if (existing) {
		existing.add(categoryId)
	} else {
		map.set(refId, new Set([categoryId]))
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
	if (!schema.language) return false
	return true
}

/**
 * Does the opposite of escapePath from dot-prop: un-escapes `.` and `[`
 * @param {string} path
 */
export function unEscapePath(path) {
	if (typeof path !== 'string') {
		throw new TypeError('Expected a string')
	}
	return path.replaceAll(/\\([\\.[])/g, '$1')
}
