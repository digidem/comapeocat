export const CATEGORIES_DIR = 'categories'
export const PRESETS_DIR = 'presets' // Deprecated: for backwards compatibility
export const FIELDS_DIR = 'fields'
export const ICONS_DIR = 'icons'
export const MESSAGES_DIR = 'messages'
export const TRANSLATIONS_DIR = 'translations'
export const CATEGORY_SELECTION_FILE = 'categorySelection.json'
export const METATADATA_FILE = 'metadata.json'
export const VERSION_FILE = 'VERSION'
export const DOCUMENT_TYPES = /** @type {const} */ (['observation', 'track'])
/** Max number of entries permitted in a CoMapeo Categories file */
export const MAX_ENTRIES = 10_000
/** Max size of an icon file in bytes */
export const MAX_ICON_SIZE = 2_000_000 // 2MB
