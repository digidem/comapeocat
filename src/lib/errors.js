import { summarize } from 'valibot'
import { PRESETS_DIR } from './constants.js'
import path from 'node:path'

/**
 * @import { ValiError, BaseSchema, BaseSchemaAsync, BaseIssue } from 'valibot'
 * @import { JSONError } from 'parse-json'
 */

/**
 * A typeguard to check if an error is due to issues parsing input JSON
 * or validating it against a Valibot schema.
 *
 * @template {SchemaError<BaseSchema<unknown, unknown, BaseIssue<unknown>>
 *   | BaseSchemaAsync<unknown, unknown, BaseIssue<unknown>>>} TSchemaError
 * @param {unknown | TSchemaError} err - The error to check
 * @returns {err is JSONError | TSchemaError | PresetRefError} True if the error is a parse or schema error
 */
export function isParseError(err) {
	return (
		err instanceof Error &&
		(err.name === 'JSONError' ||
			err.name === 'SchemaError' ||
			err.name === 'PresetRefError')
	)
}

/**
 * @template {BaseSchema<unknown, unknown, BaseIssue<unknown>>
 *   | BaseSchemaAsync<unknown, unknown, BaseIssue<unknown>>
 * } TSchema
 */
export class SchemaError extends Error {
	name = 'SchemaError'
	fileName

	/**
	 * @param {object} params
	 * @param {string} params.fileName - Name of the file that caused the error
	 * @param {ValiError<TSchema>} params.valiError - The validation error object from Valibot
	 */
	constructor({ fileName, valiError }) {
		// We cannot pass message to `super()`, otherwise the message accessor will be overridden.
		// https://262.ecma-international.org/14.0/#sec-error-message
		super(undefined, { cause: valiError })

		this.fileName = fileName

		Error.captureStackTrace?.(this, SchemaError)
	}

	get message() {
		return `Error in file ${this.fileName}:\n${summarize(/** @type {ValiError<TSchema>} */ (this.cause).issues)}`
	}
}

export class PresetRefError extends Error {
	name = 'PresetRefError'

	/**
	 * @param {object} params
	 * @param {Map<string, Set<string>>} params.missingRefs - Map of missing references
	 * @param {string} params.property - The property that contains the references
	 */
	constructor({ missingRefs, property }) {
		let message = ``
		for (const [ref, sources] of missingRefs) {
			message += `× Missing ${property} ref: "${ref}"\n`
			for (const source of sources) {
				message += `  → in ${path.join(PRESETS_DIR, source)}\n`
			}
		}
		super(message)

		Error.captureStackTrace?.(this, PresetRefError)
	}
}
