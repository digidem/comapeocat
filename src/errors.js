import { createErrorClass, isErrorWithCode } from 'custom-error-creator'

import {
	CATEGORIES_DIR,
	MAX_ENTRIES,
	MAX_ICON_SIZE,
	MAX_JSON_SIZE,
	MAX_VERSION_SIZE,
} from './lib/constants.js'

/** @import { JSONError } from 'parse-json' */
/**
 * @typedef {InstanceType<typeof InvalidFileVersionError>
 *   | InstanceType<typeof UnsupportedFileVersionError>
 *   | InstanceType<typeof MissingCategorySelectionError>
 *   | InstanceType<typeof MissingCategoriesError>} InvalidFileErrors
 */

export const SchemaError = createErrorClass({
	code: 'SCHEMA_ERROR',
	message: 'Schema validation error',
})

export const InvalidCategorySelectionError = createErrorClass({
	code: 'INVALID_CATEGORY_SELECTION_ERROR',
	message: (
		/** @type {{ invalidRefs: Map<string, Set<string>> }} */ { invalidRefs },
	) => {
		let message = `× Categories in categorySelection.json do not support the referenced document type:\n`
		for (const [documentType, categoryIds] of invalidRefs) {
			for (const categoryId of categoryIds) {
				message += `  → Category "${categoryId}" in categorySelection.${documentType} does not include "${documentType}" in its appliesTo array\n`
			}
		}
		return message
	},
})

export const CategoryRefError = createErrorClass({
	code: 'CATEGORY_REF_ERROR',
	message: (
		/** @type {{ missingRefs: Map<string, Set<string>>, property: string }} */ {
			missingRefs,
			property,
		},
	) => {
		let message = ``
		for (const [ref, sources] of missingRefs) {
			message += `× Missing ${property} ref: "${ref}"\n`
			for (const source of sources) {
				message += `  → in ${CATEGORIES_DIR}/${source}\n`
			}
		}
		return message
	},
})

export const UnsupportedFileVersionError = createErrorClass({
	code: 'UNSUPPORTED_FILE_VERSION_ERROR',
	message: (
		/** @type {{ version: string, supportedVersions: number[] }} */ {
			version,
			supportedVersions,
		},
	) =>
		`Unsupported file version: "${version}". Supported versions are: ${supportedVersions
			.map((v) => `"${v}.x"`)
			.join(', ')}.`,
})

export const InvalidFileVersionError = createErrorClass({
	code: 'INVALID_FILE_VERSION_ERROR',
	message:
		'Invalid file version: "{version}". Was expecting a version of the format "MAJOR.MINOR"',
})

export const InvalidFileError = createErrorClass({
	code: 'INVALID_FILE_ERROR',
	message: 'Invalid categories file',
})

export const MissingCategorySelectionError = createErrorClass({
	code: 'MISSING_CATEGORY_SELECTION_ERROR',
	message: 'Missing required category selection definitions.',
})

export const MissingMetadataError = createErrorClass({
	code: 'MISSING_METADATA_ERROR',
	message: 'Missing required metadata definitions.',
})

export const MissingCategoriesError = createErrorClass({
	code: 'MISSING_CATEGORIES_ERROR',
	message: (/** @type {{ docType?: string }} */ { docType } = {}) => {
		let message = 'No categories found'
		if (docType) message += ` which apply to ${docType} documents`
		return message
	},
})

export const AddAfterFinishError = createErrorClass({
	code: 'ADD_AFTER_FINISH_ERROR',
	message: 'Cannot add more data after finish() has been called.',
})

export const FieldTagKeyConflictError = createErrorClass({
	code: 'FIELD_TAG_KEY_CONFLICT_ERROR',
	message: 'Field tagKey collides with a category tag.',
})

export const InvalidSvgError = createErrorClass({
	code: 'INVALID_SVG_ERROR',
	message: 'Invalid SVG content',
})

export const DuplicateTagsError = createErrorClass({
	code: 'DUPLICATE_TAGS_ERROR',
	message: (
		/** @type {{ duplicates: Array<{ categoryIds: string[], tags: Record<string, unknown> }> }} */ {
			duplicates,
		},
	) => {
		let message = '× Multiple categories have identical tags:\n'
		for (const { categoryIds, tags } of duplicates) {
			message += `  → Categories ${categoryIds.map((id) => `"${id}"`).join(', ')} share tags: ${JSON.stringify(tags)}\n`
		}
		return message
	},
})

export const CategorySelectionRefError = createErrorClass({
	code: 'CATEGORY_SELECTION_REF_ERROR',
	message:
		'× Category "{categoryId}" referenced by "categorySelection.{documentType}" is missing.',
})

export const IconSizeError = createErrorClass({
	code: 'ICON_SIZE_ERROR',
	message: `Icon "{iconId}" exceeds maximum size: {size} bytes (max: ${MAX_ICON_SIZE} bytes)`,
})

export const JsonSizeError = createErrorClass({
	code: 'JSON_SIZE_ERROR',
	message: `JSON file "{fileName}" exceeds maximum size: {size} bytes (max: ${MAX_JSON_SIZE} bytes)`,
})

export const VersionSizeError = createErrorClass({
	code: 'VERSION_SIZE_ERROR',
	message: `VERSION file exceeds maximum size: {size} bytes (max: ${MAX_VERSION_SIZE} bytes)`,
})

export const InvalidZipFileError = createErrorClass({
	code: 'INVALID_ZIP_FILE_ERROR',
	message: 'File is not a valid zip archive.',
})

export const TooManyEntriesError = createErrorClass({
	code: 'TOO_MANY_ENTRIES_ERROR',
	message: `File contains too many entries (max: ${MAX_ENTRIES}).`,
})

/**
 * Every error class created by this module. The single source for both the
 * runtime `isKnownError` check and the {@link KnownError} type, so adding an
 * error in one place keeps both in sync.
 */
const KNOWN_ERRORS = [
	SchemaError,
	InvalidCategorySelectionError,
	CategoryRefError,
	UnsupportedFileVersionError,
	InvalidFileVersionError,
	InvalidFileError,
	MissingCategorySelectionError,
	MissingMetadataError,
	MissingCategoriesError,
	AddAfterFinishError,
	FieldTagKeyConflictError,
	InvalidSvgError,
	DuplicateTagsError,
	CategorySelectionRefError,
	IconSizeError,
	JsonSizeError,
	VersionSizeError,
	InvalidZipFileError,
	TooManyEntriesError,
]

/** @type {Set<string>} */
const KNOWN_ERROR_CODES = new Set(
	KNOWN_ERRORS.map((ErrorClass) => ErrorClass.code),
)

/**
 * Any error thrown by this module.
 * @typedef {InstanceType<(typeof KNOWN_ERRORS)[number]>} KnownError
 */

/**
 * The `.code` of any error thrown by this module.
 * @typedef {KnownError['code']} KnownErrorCode
 */

/**
 * A typeguard to check whether an error originates from this module. Narrows
 * `err.code` to the union of known error codes ({@link KnownErrorCode}), so
 * consumers can branch on `err.code` with full type safety.
 * @param {unknown} err - The error to check
 * @returns {err is KnownError} True if the error was thrown by this module
 */
export function isKnownError(err) {
	return isErrorWithCode(err) && KNOWN_ERROR_CODES.has(err.code)
}

/**
 * Codes for programmer / API-misuse errors — bugs in the calling code rather
 * than invalid input or an invalid file. Everything else is a validation error.
 * @type {Set<string>}
 */
const USAGE_ERROR_CODES = new Set([AddAfterFinishError.code])

/**
 * A {@link KnownError} caused by invalid input or an invalid file, rather than
 * a bug in the calling code.
 * @typedef {Exclude<KnownError, InstanceType<typeof AddAfterFinishError>>} ValidationError
 */

/**
 * A typeguard for expected validation errors: an error thrown by this module
 * that stems from invalid input or an invalid file — everything except
 * programmer/API-misuse errors such as {@link AddAfterFinishError}. Useful for
 * showing a friendly message and skipping error reporting (e.g. Sentry).
 * @param {unknown} err - The error to check
 * @returns {err is ValidationError} True if the error is an expected validation error
 */
export function isValidationError(err) {
	return isKnownError(err) && !USAGE_ERROR_CODES.has(err.code)
}

/**
 * A typeguard to check if an error is due to issues parsing input JSON
 * or validating it against a Valibot schema.
 *
 * @param {unknown} err - The error to check
 * @returns {err is JSONError | InstanceType<typeof SchemaError> | InstanceType<typeof CategoryRefError> | InstanceType<typeof InvalidCategorySelectionError>} True if the error is a parse or schema error
 */
export function isParseError(err) {
	if (err instanceof Error && err.name === 'JSONError') return true
	return (
		isErrorWithCode(err) &&
		(err.code === SchemaError.code ||
			err.code === CategoryRefError.code ||
			err.code === InvalidCategorySelectionError.code)
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
		isErrorWithCode(err) &&
		(err.code === InvalidFileVersionError.code ||
			err.code === UnsupportedFileVersionError.code ||
			err.code === MissingCategorySelectionError.code ||
			err.code === MissingCategoriesError.code)
	)
}
