import { createErrorClass } from 'custom-error-creator'

import {
	CATEGORIES_DIR,
	MAX_ENTRIES,
	MAX_ICON_SIZE,
	MAX_JSON_SIZE,
	MAX_VERSION_SIZE,
} from './constants.js'

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
	status: 400,
})

export const InvalidCategorySelectionError = createErrorClass({
	code: 'INVALID_CATEGORY_SELECTION_ERROR',
	message:
		'Categories in categorySelection.json reference unsupported document types',
	status: 400,
})

export const CategoryRefError = createErrorClass({
	code: 'CATEGORY_REF_ERROR',
	message: 'Category references missing fields or icons',
	status: 400,
})

export const UnsupportedFileVersionError = createErrorClass({
	code: 'UNSUPPORTED_FILE_VERSION_ERROR',
	message: 'Unsupported file version',
	status: 400,
})

export const InvalidFileVersionError = createErrorClass({
	code: 'INVALID_FILE_VERSION_ERROR',
	message:
		'Invalid file version: "{version}". Was expecting a version of the format "MAJOR.MINOR"',
	status: 400,
})

export const InvalidFileError = createErrorClass({
	code: 'INVALID_FILE_ERROR',
	message: 'Invalid categories file',
	status: 400,
})

export const MissingCategorySelectionError = createErrorClass({
	code: 'MISSING_CATEGORY_SELECTION_ERROR',
	message: 'Missing required category selection definitions.',
	status: 400,
})

export const MissingMetadataError = createErrorClass({
	code: 'MISSING_METADATA_ERROR',
	message: 'Missing required metadata definitions.',
	status: 400,
})

export const MissingCategoriesError = createErrorClass({
	code: 'MISSING_CATEGORIES_ERROR',
	message: 'No categories found',
	status: 400,
})

export const AddAfterFinishError = createErrorClass({
	code: 'ADD_AFTER_FINISH_ERROR',
	message: 'Cannot add more data after finish() has been called.',
	status: 500,
})

export const FieldTagKeyConflictError = createErrorClass({
	code: 'FIELD_TAG_KEY_CONFLICT_ERROR',
	message: 'Field tagKey collides with a category tag.',
	status: 400,
})

export const InvalidSvgError = createErrorClass({
	code: 'INVALID_SVG_ERROR',
	message: 'Invalid SVG content',
	status: 400,
})

export const DuplicateTagsError = createErrorClass({
	code: 'DUPLICATE_TAGS_ERROR',
	message: 'Multiple categories have identical tags',
	status: 400,
})

export const CategorySelectionRefError = createErrorClass({
	code: 'CATEGORY_SELECTION_REF_ERROR',
	message:
		'× Category "{categoryId}" referenced by "categorySelection.{documentType}" is missing.',
	status: 400,
})

export const IconSizeError = createErrorClass({
	code: 'ICON_SIZE_ERROR',
	message: `Icon "{iconId}" exceeds maximum size: {size} bytes (max: ${MAX_ICON_SIZE} bytes)`,
	status: 413,
})

export const JsonSizeError = createErrorClass({
	code: 'JSON_SIZE_ERROR',
	message: `JSON file "{fileName}" exceeds maximum size: {size} bytes (max: ${MAX_JSON_SIZE} bytes)`,
	status: 413,
})

export const VersionSizeError = createErrorClass({
	code: 'VERSION_SIZE_ERROR',
	message: `VERSION file exceeds maximum size: {size} bytes (max: ${MAX_VERSION_SIZE} bytes)`,
	status: 413,
})

export const InvalidZipFileError = createErrorClass({
	code: 'INVALID_ZIP_FILE_ERROR',
	message: 'File is not a valid zip archive.',
	status: 400,
})

export const TooManyEntriesError = createErrorClass({
	code: 'TOO_MANY_ENTRIES_ERROR',
	message: `File contains too many entries (max: ${MAX_ENTRIES}).`,
	status: 413,
})

/**
 * Build the message for an {@link UnsupportedFileVersionError}.
 * @param {object} params
 * @param {string} params.version - The unsupported version
 * @param {number[]} params.supportedVersions - List of supported major versions
 */
export function unsupportedFileVersionMessage({ version, supportedVersions }) {
	return `Unsupported file version: "${version}". Supported versions are: ${supportedVersions
		.map((v) => `"${v}.x"`)
		.join(', ')}.`
}

/**
 * Build the message for a {@link MissingCategoriesError}.
 * @param {string} [docType] - The document type that has no categories
 */
export function missingCategoriesMessage(docType) {
	let message = 'No categories found'
	if (docType) message += ` which apply to ${docType} documents`
	return message
}

/**
 * Build the message for a {@link CategoryRefError}.
 * @param {object} params
 * @param {Map<string, Set<string>>} params.missingRefs - Map of missing references
 * @param {string} params.property - The property that contains the references
 */
export function categoryRefMessage({ missingRefs, property }) {
	let message = ``
	for (const [ref, sources] of missingRefs) {
		message += `× Missing ${property} ref: "${ref}"\n`
		for (const source of sources) {
			message += `  → in ${CATEGORIES_DIR}/${source}\n`
		}
	}
	return message
}

/**
 * Build the message for an {@link InvalidCategorySelectionError}.
 * @param {object} params
 * @param {Map<string, Set<string>>} params.invalidRefs - Map of document type to category IDs that don't support that document type
 */
export function invalidCategorySelectionMessage({ invalidRefs }) {
	let message = `× Categories in categorySelection.json do not support the referenced document type:\n`
	for (const [documentType, categoryIds] of invalidRefs) {
		for (const categoryId of categoryIds) {
			message += `  → Category "${categoryId}" in categorySelection.${documentType} does not include "${documentType}" in its appliesTo array\n`
		}
	}
	return message
}

/**
 * Build the message for a {@link DuplicateTagsError}.
 * @param {object} params
 * @param {Array<{ categoryIds: string[], tags: Record<string, unknown> }>} params.duplicates - Array of duplicate tag groups
 */
export function duplicateTagsMessage({ duplicates }) {
	let message = '× Multiple categories have identical tags:\n'
	for (const { categoryIds, tags } of duplicates) {
		message += `  → Categories ${categoryIds.map((id) => `"${id}"`).join(', ')} share tags: ${JSON.stringify(tags)}\n`
	}
	return message
}

/**
 * A typeguard to check if an error is due to issues parsing input JSON
 * or validating it against a Valibot schema.
 *
 * @param {unknown} err - The error to check
 * @returns {err is JSONError | InstanceType<typeof SchemaError> | InstanceType<typeof CategoryRefError> | InstanceType<typeof InvalidCategorySelectionError>} True if the error is a parse or schema error
 */
export function isParseError(err) {
	if (!(err instanceof Error)) return false
	if (err.name === 'JSONError') return true
	const code = 'code' in err ? err.code : undefined
	return (
		code === SchemaError.code ||
		code === CategoryRefError.code ||
		code === InvalidCategorySelectionError.code
	)
}

/**
 * A typeguard to check if an error is due to the file being invalid
 * (e.g. missing required files, unsupported version, etc).
 * @param {unknown} err
 * @returns {err is InvalidFileErrors} True if the error is an invalid file error
 */
export function isInvalidFileError(err) {
	if (!(err instanceof Error) || !('code' in err)) return false
	return (
		err.code === InvalidFileVersionError.code ||
		err.code === UnsupportedFileVersionError.code ||
		err.code === MissingCategorySelectionError.code ||
		err.code === MissingCategoriesError.code
	)
}
