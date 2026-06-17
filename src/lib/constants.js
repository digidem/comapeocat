export const CATEGORIES_DIR = 'categories'
export const PRESETS_DIR = 'presets' // Deprecated: for backwards compatibility
export const FIELDS_DIR = 'fields'
export const ICONS_DIR = 'icons'
export const MESSAGES_DIR = 'messages'
export const TRANSLATIONS_DIR = 'translations'
export const CATEGORY_SELECTION_FILE = 'categorySelection.json'
export const METATADATA_FILE = 'metadata.json'
export const VERSION_FILE = 'VERSION'
/**
 * Container format version (see spec/container/): the structure of the ZIP
 * archive, file names, the VERSION file, and metadata.json. Written to the
 * VERSION file. Readers reject files with a higher major version.
 *
 * 2.0 introduced the minSchemaVersion gate: a major bump so that readers
 * which predate the gate (and so would import files using newer vocabulary
 * lossily) reject all files written from 2.0 onward.
 */
export const FILE_VERSION = '2.0'
/**
 * Schema (vocabulary) revision supported by this library (see spec/schema/):
 * the content schemas for categories, fields, categorySelection and
 * translations. A single integer, incremented for every revision; revisions
 * are always additive, so existing files stay valid. Readers reject files
 * whose `minSchemaVersion` (written to metadata.json, computed from the
 * features actually used in the file) is higher than this.
 */
export const SCHEMA_VERSION = 1
export const DOCUMENT_TYPES = /** @type {const} */ (['observation', 'track'])
export const DEPRECATED_GEOMETRY_TYPES = /** @type {const} */ ([
	'point',
	'line',
	'area',
])
/** Max number of entries permitted in a CoMapeo Categories file */
export const MAX_ENTRIES = 10_000
/** Max size of an icon file in bytes */
export const MAX_ICON_SIZE = 2_000_000 // 2MB
/** Max size of a JSON file in bytes */
export const MAX_JSON_SIZE = 10_000_000 // 10MB
/** Max size of the VERSION file in bytes */
export const MAX_VERSION_SIZE = 100 // 100 bytes
