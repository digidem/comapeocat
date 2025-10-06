import path from 'node:path'

import { summarize } from 'valibot'

import { CATEGORIES_DIR } from './constants.js'

/** @import { ValiError, BaseSchema, BaseSchemaAsync, BaseIssue } from 'valibot' */
/** @import { JSONError } from 'parse-json' */
/** @typedef { InvalidFileVersionError | UnsupportedFileVersionError | MissingCategorySelectionError | MissingCategoriesError } InvalidFileErrors */

/**
 * A typeguard to check if an error is due to issues parsing input JSON
 * or validating it against a Valibot schema.
 *
 * @template {SchemaError<BaseSchema<unknown, unknown, BaseIssue<unknown>>
 *   | BaseSchemaAsync<unknown, unknown, BaseIssue<unknown>>>} TSchemaError
 * @param {unknown | TSchemaError} err - The error to check
 * @returns {err is JSONError | TSchemaError | CategoryRefError | InvalidCategorySelectionError} True if the error is a parse or schema error
 */
export function isParseError(err) {
	return (
		err instanceof Error &&
		(err.name === 'JSONError' ||
			err.name === 'SchemaError' ||
			err.name === 'CategoryRefError' ||
			err.name === 'InvalidCategorySelectionError')
	)
}

/**
 * A typeguard to check if an error is due to the file being invalid
 * (e.g. missing required files, unsupported version, etc).
 * @param {unknown} err
 * @returns {err is InvalidFileErrors} True if the error is an invalid file error
 */
export function isInvalidFileError(err) {
	return (
		err instanceof Error &&
		(err.name === 'InvalidFileVersionError' ||
			err.name === 'UnsupportedFileVersionError' ||
			err.name === 'MissingCategorySelectionError' ||
			err.name === 'MissingCategoriesError')
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

export class CategoryRefError extends Error {
	name = 'CategoryRefError'

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
				message += `  → in ${path.join(CATEGORIES_DIR, source)}\n`
			}
		}
		super(message)

		Error.captureStackTrace?.(this, CategoryRefError)
	}
}

export class InvalidCategorySelectionError extends Error {
	name = 'InvalidCategorySelectionError'

	/**
	 * @param {object} params
	 * @param {Map<string, Set<string>>} params.invalidRefs - Map of geometry type to category IDs that don't support that geometry
	 */
	constructor({ invalidRefs }) {
		let message = `× Categories in categorySelection.json do not support the referenced geometry type:\n`
		for (const [geometryType, categoryIds] of invalidRefs) {
			for (const categoryId of categoryIds) {
				message += `  → Category "${categoryId}" in categorySelection.${geometryType} does not include "${geometryType}" in its geometry array\n`
			}
		}
		super(message)

		Error.captureStackTrace?.(this, InvalidCategorySelectionError)
	}
}

export class UnsupportedFileVersionError extends Error {
	name = 'UnsupportedFileVersionError'

	/**
	 * @param {object} params
	 * @param {string} params.version - The unsupported version
	 * @param {number[]} params.supportedVersions - List of supported versions
	 */
	constructor({ version, supportedVersions }) {
		super(
			`Unsupported file version: "${version}". Supported versions are: ${supportedVersions
				.map((v) => `"${v}.x"`)
				.join(', ')}.`,
		)

		Error.captureStackTrace?.(this, UnsupportedFileVersionError)
	}
}

export class InvalidFileVersionError extends Error {
	name = 'InvalidFileVersionError'

	/**
	 * @param {object} params
	 * @param {string} params.version - The invalid version string
	 */
	constructor({ version }) {
		super(
			`Invalid file version: "${version}". Was expecting a version of the format "MAJOR.MINOR"`,
		)

		Error.captureStackTrace?.(this, InvalidFileVersionError)
	}
}

/**
 * @template {string} TName
 * @typedef {{
 *   new (): Error & { name: TName }
 * }} SimpleErrorConstructor
 */

/**
 * Factory function to create simple error classes with a static message
 * @template {string} TName
 * @param {TName} name - The error class name
 * @param {string} message - The error message
 * @returns {SimpleErrorConstructor<TName>}
 */
function createSimpleError(name, message) {
	const ErrorClass = class extends Error {
		name = name

		constructor() {
			super(message)
			Error.captureStackTrace?.(this, ErrorClass)
		}
	}

	Object.defineProperty(ErrorClass, 'name', { value: name })

	return /** @type {SimpleErrorConstructor<TName>} */ (ErrorClass)
}

export class InvalidFileError extends Error {
	name = 'InvalidFileError'

	/**
	 * @param {object} params
	 * @param {InvalidFileErrors} params.cause - The reason why the file is invalid
	 */
	constructor({ cause }) {
		super('Invalid categories file', { cause })

		Error.captureStackTrace?.(this, InvalidFileError)
	}
}

export const MissingCategoriesError = createSimpleError(
	'MissingCategoriesError',
	'Missing required categories definitions.',
)

export const MissingCategorySelectionError = createSimpleError(
	'MissingCategorySelectionError',
	'Missing required category selection definitions.',
)

export const MissingMetadataError = createSimpleError(
	'MissingMetadataError',
	'Missing required metadata definitions.',
)

export const AddAfterFinishError = createSimpleError(
	'AddAfterFinishError',
	'Cannot add more data after finish() has been called.',
)

export class InvalidSvgError extends Error {
	name = 'InvalidSvgError'

	/**
	 * @param {object} params
	 * @param {Error} params.cause - The underlying SVG parsing error
	 */
	constructor({ cause }) {
		super('Invalid SVG content', { cause })
		Error.captureStackTrace?.(this, InvalidSvgError)
	}
}

export class DuplicateTagsError extends Error {
	name = 'DuplicateTagsError'

	/**
	 * @param {object} params
	 * @param {Array<{ categoryIds: string[], tags: Record<string, unknown> }>} params.duplicates - Array of duplicate tag groups
	 */
	constructor({ duplicates }) {
		let message = '× Multiple categories have identical tags:\n'
		for (const { categoryIds, tags } of duplicates) {
			message += `  → Categories ${categoryIds.map((id) => `"${id}"`).join(', ')} share tags: ${JSON.stringify(tags)}\n`
		}
		super(message)

		Error.captureStackTrace?.(this, DuplicateTagsError)
	}
}
export class CategorySelectionRefError extends Error {
	name = 'CategorySelectionRefError'

	/**
	 * @param {object} params
	 * @param {string} params.categoryId - The missing category ID
	 * @param {string} params.geometryType - The geometry type where the category is referenced
	 */
	constructor({ categoryId, geometryType }) {
		const message = `× Category "${categoryId}" referenced by "categorySelection.${geometryType}" is missing.`
		super(message)

		Error.captureStackTrace?.(this, CategorySelectionRefError)
	}
}
