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
	message: (/** @type {{ docType?: string }} */ { docType }) => {
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
