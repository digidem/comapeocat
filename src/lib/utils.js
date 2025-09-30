import fs from 'node:fs/promises'
import path from 'node:path'
import * as v from 'valibot'
import { SchemaError } from './errors.js'
import parseJson from 'parse-json'

/**
 * Async generator to read all JSON files in a directory
 * @param {string} dir - Directory path
 * @returns {AsyncGenerator<{name: string, data: unknown}>} Yields objects with file name and parsed JSON data
 */
export async function* jsonFiles(dir) {
	const entries = await fs.readdir(dir, {
		recursive: true,
	})
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
