# CoMapeo Categories File Format Specification

**Version:** 1.0-pre.0
**Date:** 2025-10-01
**File Extension:** `.comapeocat`

## 1. Introduction

This document specifies the CoMapeo Categories file format, a ZIP-based archive format for packaging and distributing category definitions, custom fields, and icons for use in CoMapeo applications.

### 1.1. Purpose

The CoMapeo Categories file format provides a standardized way to:

- Define how map features are displayed to the user in CoMapeo applications
- Define the categories a user can choose from when creating or editing map features
- Define form fields for data entry and display for each category
- Package custom icons for map features

## 2. Conventions and Terminology

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

### 2.1. Definitions

- **Map Feature**: An observation, track, or other geographic entity displayed on a map in CoMapeo applications (e.g., a tree observation, a hiking trail, a forest boundary)
- **Category**: A category that determines how map features are displayed to the user and which fields are shown when creating or editing them
- **Field**: A form field definition that specifies data collection parameters and the user interface for editing tags associated with a map feature
- **Icon**: An SVG graphic representing a category
- **Tag**: A key-value pair used to identify and categorize map features
- **Document Type**: The type of CoMapeo document that a category applies to. One or more of `observation` or `track` (future versions may add more document types)

## 3. File Format Overview

A CoMapeo Categories file (`.comapeocat`) is a ZIP archive containing JSON configuration files and SVG icon resources. The archive uses DEFLATE compression.

### 3.1. MIME Type

The RECOMMENDED MIME type for `.comapeocat` files is:

```
application/vnd.comapeo.categories+zip
```

### 3.2. Character Encoding

All text content within the archive MUST use UTF-8 encoding.

## 4. Archive Structure

The archive MUST be a valid ZIP file and SHOULD use compression level 9 for optimal file size.

### 4.1. Directory Layout

```
archive.comapeocat
├── VERSION                  (required)
├── categories.json          (required)
├── categorySelection.json   (required)
├── metadata.json            (required)
├── fields.json              (optional)
├── icons/                   (optional)
│   ├── icon1.svg
│   ├── icon2.svg
│   └── ...
└── translations/            (optional)
    ├── en.json
    ├── es.json
    └── ...
```

### 4.2. File Naming

- File names MUST use forward slashes (`/`) as path separators
- File names MUST NOT contain leading or trailing whitespace
- Icon files MUST be located in the `icons/` directory
- Icon files MUST have the `.svg` extension
- Translation files MUST be located in the `translations/` directory
- Translation files MUST have the `.json` extension

## 5. Version File

### 5.1. Location

The version file MUST be named `VERSION` and MUST be located at the root of the archive.

### 5.2. Format

The version file MUST contain a version string in the format `MAJOR.MINOR` where:

- `MAJOR` is a positive integer representing the major version
- `MINOR` is a non-negative integer representing the minor version
- The format MUST match the regular expression: `^\d+\.\d+$`

### 5.3. Version Compatibility

Readers MUST:

- Accept files where the major version is less than or equal to the reader's supported major version
- Reject files where the major version is greater than the reader's supported major version
- Support all minor versions within a supported major version

**Current Specification Version:** 1.0

### 5.4. Example

```
1.0
```

## 6. Metadata File

### 6.1. Location

The metadata file MUST be named `metadata.json` and MUST be located at the root of the archive.

### 6.2. Schema

The metadata file MUST be a valid JSON object with the following structure:

```json
{
  "name": "string",
  "version": "string (optional)",
  "buildDateValue": number
}
```

### 6.3. Properties

- **name** (required): A human-readable name for the category set
  - MUST be a non-empty string
  - MUST NOT exceed 100 characters

- **version** (optional): A version identifier for the category set
  - MAY use semantic versioning or any other versioning scheme
  - MUST NOT exceed 20 characters

- **buildDateValue** (required): Build timestamp
  - MUST be a Unix timestamp in milliseconds
  - MUST be a positive integer

### 6.4. Example

```json
{
	"name": "Rainforest Monitoring Categories",
	"version": "2.1.0",
	"buildDateValue": 1727740800000
}
```

## 7. Categories File (categories.json)

### 7.1. Location

The categories file MUST be named `categories.json` and MUST be located at the root of the archive.

### 7.2. Format

The categories file MUST be a valid JSON object where:

- Keys are category IDs (non-empty strings)
- Values are category definition objects

### 7.3. Category Schema

Each category object MUST contain:

- **name** (required): Display name for the feature (string)
- **appliesTo** (required): Array of valid document types for this category
  - MUST contain one or more of: `"observation"`, `"track"`
  - MAY contain other document types in future versions
  - SHOULD contain only unique values
- **tags** (required): Object mapping tag keys to tag values
  - Used to match the category to existing map entities
  - Tag values MAY be: string, number, boolean or null
- **fields** (required): Array of field IDs to display for this category
  - Each field ID MUST be a non-empty string
  - Field IDs MUST reference fields defined in `fields.json`

Each category object MAY contain:

- **addTags** (optional): Tags added when creating an entity with this category
  - Defaults to the value of `tags` if not specified
- **removeTags** (optional): Tags removed when changing to another category
  - Defaults to the value of `addTags` if not specified
- **icon** (optional): ID of an icon to display for this category
  - MUST reference an icon in the `icons/` directory (without `.svg` extension)
- **terms** (optional): Array of search terms and synonyms (strings)
- **color** (optional): Color in hexadecimal format
  - MUST be a valid hex color string (e.g., `#rgb`, `#rrggbb`, or `#rrggbbaa`)
  - Case insensitive

### 7.4. Example

```json
{
	"tree": {
		"name": "Tree",
		"appliesTo": ["observation"],
		"tags": {
			"natural": "tree"
		},
		"fields": ["species", "height"],
		"icon": "tree",
		"terms": ["árbol", "arbre"],
		"color": "#228B22"
	}
}
```

## 8. Fields File

### 8.1. Location

The fields file, if present, MUST be named `fields.json` and MUST be located at the root of the archive.

### 8.2. Format

The fields file MUST be a valid JSON object where:

- Keys are field IDs (non-empty strings)
- Values are field definition objects

### 8.3. Field Schema

Each field object MUST contain:

- **type** (required): Field type, one of:
  - `"text"`: Free-form text input
  - `"number"`: Numeric input
  - `"selectOne"`: Single selection from options
  - `"selectMultiple"`: Multiple selections from options
- **tagKey** (required): The tag key this field modifies (non-empty string)
- **label** (required): Display label for the field (non-empty string)

Each field object MAY contain:

- **placeholder** (optional): Placeholder text shown before user input
- **helperText** (optional): Additional context or instructions

#### 8.3.1. Text Fields

Text fields MAY contain:

- **appearance** (optional): Either `"singleline"` or `"multiline"` (default: `"multiline"`)

#### 8.3.2. Select Fields

Select fields (`selectOne` and `selectMultiple`) MUST contain:

- **options** (required): Array of option objects
  - MUST contain at least one option
  - Each option MUST have:
    - **label** (required): Display text (non-empty string)
    - **value** (required): The value to store (string, number, boolean, or null)
  - Each option MUST be unique by its `value`

### 8.4. Example

```json
{
	"species": {
		"type": "text",
		"tagKey": "species",
		"label": "Species",
		"appearance": "singleline",
		"placeholder": "e.g., Quercus robur"
	},
	"condition": {
		"type": "selectOne",
		"tagKey": "condition",
		"label": "Tree Condition",
		"options": [
			{ "label": "Healthy", "value": "healthy" },
			{ "label": "Damaged", "value": "damaged" },
			{ "label": "Dead", "value": "dead" }
		]
	}
}
```

## 9. Category Selection File

### 9.1. Location

The category selection file MUST be named `categorySelection.json` and MUST be located at the root of the archive.

### 9.2. Schema

The category selection file MUST be a valid JSON object with the following structure:

```json
{
  "observation": ["category-id-1", "category-id-2", ...],
  "track": ["category-id-1", "category-id-2", ...],
}
```

### 9.3. Properties

Each document type property:

- MUST be present (`observation` and `track`)
- MUST be an array of category IDs (non-empty strings)
- Category IDs MUST reference categories defined in `categories.json`
- Each referenced category MUST include the corresponding document type in its `appliesTo` array
  - For example, a category referenced in `categorySelection.observation` MUST have `"observation"` in its `appliesTo` array

The order of category IDs in each array determines the display order of categories shown to the user in CoMapeo applications for that document type.

### 9.4. Example

```json
{
	"observation": ["tree", "waterhole", "camp"],
	"track": ["river", "trail"]
}
```

## 10. Icons

### 10.1. Location

Icon files, if present, MUST be located in the `icons/` directory at the root of the archive.

### 10.2. Format

Icon files:

- MUST have the `.svg` extension
- MUST contain valid SVG XML content
- MUST use UTF-8 encoding
- SHOULD be optimized for display at medium sizes (e.g., 100x100 pixels)

### 10.3. Size Constraints

Individual icon files:

- MUST NOT exceed 2,000,000 bytes (2 MB) in size

### 10.4. Naming

Icon file names (without the `.svg` extension) are used as icon IDs when referenced from categories.

### 10.5. Example

File: `icons/tree.svg`

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path d="M12 2C9.79 2 8 3.79 8 6c0 1.48.81 2.75 2 3.45V21h4v-11.55c1.19-.7 2-1.97 2-3.45 0-2.21-1.79-4-4-4z"/>
</svg>
```

## 11. Translations

### 11.1. Location

Translation files, if present, MUST be located in the `translations/` directory at the root of the archive.

### 11.2. File Naming

Translation file names:

- MUST have the `.json` extension
- MUST be named using a valid BCP 47 language tag (without the `.json` extension)
- SHOULD only use ISO 639-1 or ISO 639-3 language codes for the primary language subtag (translations with other primary language subtags MAY be ignored by readers)
- SHOULD use only language and region subtags (e.g., `en.json`, `es.json`, `en-US.json`)
- MAY use other BCP 47 subtags (script, variant, extension) for forward compatibility

### 11.3. Format

Each translation file MUST be a valid JSON object with the following structure:

```json
{
  "[docType]": {
    "[docId]": {
			"[propertyRef]": "string",
		},
    ...
  }
}
```

Where:

- `[docType]` is either `"category"` or `"field"`
- `[docId]` is the ID of the category or field being translated
- `[propertyRef]` is the name of the property being translated, using dot-notation for nested properties, and referencing array items with a filter notation e.g. `options[value="healthy"].label` to translate the label of the option with value `"healthy"`
- Each translation for a given docId MAY have multiple propertyRef entries.
- Each propertyRef entry SHOULD reference an existing property in the corresponding category or field definition
- A reader MAY ignore propertyRef entries that do not correspond to existing properties

### 11.4. Validation

Readers:

- SHOULD ignore translation files with invalid or unsupported BCP 47 language tags
- MAY ignore translation objects with `propertyRef` values that do not correspond to existing properties
- SHOULD ignore category or field IDs that do not exist in `categories.json` or `fields.json`
- MAY provide different coverage across languages (not all languages need to translate the same properties)

Writers:

- SHOULD only include translation files with valid BCP 47 language tags
- SHOULD only use language and region subtags unless other subtags are needed

### 11.6. Example

File: `translations/es.json`

```json
{
	"category": {
		"tree": {
			"name": "Árbol",
			"terms": "arbre"
		},
		"waterhole": {
			"name": "Pozo de agua"
		}
	},
	"field": {
		"species": {
			"label": "Especie",
			"placeholder": "ej. Quercus robur"
		},
		"condition": {
			"label": "Condición del árbol",
			"options[value=\"healthy\"].label": "Saludable",
			"options[value=\"damaged\"].label": "Dañado",
			"options[value=\"dead\"].label": "Muerto"
		}
	}
}
```

## 12. Archive Constraints

### 12.1. Entry Limits

The total number of entries (files) in the archive MUST NOT exceed 10,000.

### 12.2. Compression

Writers:

- SHOULD use DEFLATE compression with level 9
- MAY use other compression levels supported by the ZIP format

Readers:

- MUST support uncompressed (stored) entries
- MUST support DEFLATE compression

## 13. Validation Requirements

### 13.1. Required Files

Readers MUST verify that the following files are present:

- `VERSION`
- `categories.json`
- `categorySelection.json`
- `metadata.json`

If any required file is missing, readers MUST reject the file.

### 13.2. Version Validation

Readers MUST:

1. Parse the `VERSION` file
2. Verify the format matches `MAJOR.MINOR`
3. Verify the major version is supported
4. Reject files with unsupported major versions

### 13.3. Schema Validation

Readers MUST validate that:

- All JSON files are well-formed
- All JSON files conform to their respective schemas
- All category references to fields and icons are valid (fields exist in `fields.json`, icons exist in `icons/` directory)

### 13.4. Reference Validation

Readers SHOULD validate that:

- All field IDs referenced in categories exist in `fields.json`
- All icon IDs referenced in categories exist in the `icons/` directory

Readers MAY issue warnings for:

- Fields defined in `fields.json` that are not referenced by any category
- Icons in the `icons/` directory that are not referenced by any category

## 14. Error Handling

Readers MUST reject files that fail validation as specified in Section 13. The specific error types, messages, and reporting mechanisms are implementation-defined.

Readers SHOULD provide informative error messages to aid users in diagnosing and correcting invalid files.

## 15. Security Considerations

### 15.1. Archive Extraction

Implementations MUST:

- Validate that extracted file paths do not escape the extraction directory (e.g., via `../` sequences)
- Enforce file size limits to prevent ZIP bombs
- Enforce entry count limits to prevent resource exhaustion

### 15.2. SVG Content

Implementations that render SVG icons SHOULD:

- Sanitize SVG content to remove potentially malicious scripts
- Disable script execution in SVG rendering contexts
- Apply sandboxing or isolation when rendering untrusted SVGs

### 15.3. JSON Parsing

Implementations MUST:

- Use a secure JSON parser
- Enforce reasonable size limits on JSON files
- Handle deeply nested structures safely

## 16. Extensibility

### 16.1. Unknown Properties

Readers:

- SHOULD ignore unknown properties in JSON files
- SHOULD NOT reject files solely due to unknown properties

### 16.2. Future Versions

Future major versions MAY:

- Add new required files
- Change existing file schemas in backward-incompatible ways
- Modify validation rules

Future minor versions MAY:

- Add optional files
- Add optional properties to existing schemas
- Add new constraints that are backward-compatible

## 17. Conformance

A file conforms to this specification if:

1. It is a valid ZIP archive with the `.comapeocat` extension
2. It contains all required files in the correct locations
3. The `VERSION` file contains a valid version string with major version ≤ 1
4. All JSON files are well-formed and conform to their respective schemas
5. All references between files are valid
6. All constraints specified in this document are satisfied

An implementation conforms to this specification as a writer if it produces files that conform to this specification.

An implementation conforms to this specification as a reader if it correctly processes conforming files and correctly rejects non-conforming files according to the validation requirements.

## 18. References

- [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) - Key words for use in RFCs to Indicate Requirement Levels
- [ZIP File Format Specification](https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT)
- [JSON Specification](https://www.json.org/)
- [SVG Specification](https://www.w3.org/TR/SVG2/)
