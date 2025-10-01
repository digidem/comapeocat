# CoMapeo Categories File Format Specification

**Version:** 1.0
**Date:** 2025-10-01
**File Extension:** `.comapeocat`

## 1. Introduction

This document specifies the CoMapeo Categories file format, a ZIP-based archive format for packaging and distributing category definitions (presets), custom fields, and icons for use in CoMapeo applications.

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
- **Preset**: A category definition that determines how map features are displayed to the user and which fields are shown when creating or editing them
- **Field**: A form field definition that specifies data collection parameters and the user interface for editing tags associated with a map feature
- **Icon**: An SVG graphic representing a category
- **Tag**: A key-value pair used to identify and categorize map features
- **Geometry Type**: One of `point`, `line`, or `area`

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
├── VERSION              (required)
├── presets.json         (required)
├── defaults.json        (required)
├── metadata.json        (required)
├── fields.json          (optional)
├── icons/               (optional)
│   ├── icon1.svg
│   ├── icon2.svg
│   └── ...
└── translations/        (optional)
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

## 7. Presets File

### 7.1. Location

The presets file MUST be named `presets.json` and MUST be located at the root of the archive.

### 7.2. Format

The presets file MUST be a valid JSON object where:

- Keys are preset IDs (non-empty strings)
- Values are preset definition objects

### 7.3. Preset Schema

Each preset object MUST contain:

- **name** (required): Display name for the feature (string)
- **geometry** (required): Array of valid geometry types for this preset
  - MUST contain one or more of: `"point"`, `"line"`, `"area"`
  - SHOULD contain only unique values
- **tags** (required): Object mapping tag keys to tag values
  - Used to match the preset to existing map entities
  - Tag values MAY be: string, number, boolean, null, or arrays thereof
- **fields** (required): Array of field IDs to display for this preset
  - Each field ID MUST be a non-empty string
  - Field IDs MUST reference fields defined in `fields.json`

Each preset object MAY contain:

- **addTags** (optional): Tags added when creating an entity with this preset
  - Defaults to the value of `tags` if not specified
- **removeTags** (optional): Tags removed when changing to another preset
  - Defaults to the value of `addTags` if not specified
- **icon** (optional): ID of an icon to display for this preset
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
		"geometry": ["point"],
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

## 9. Defaults File

### 9.1. Location

The defaults file MUST be named `defaults.json` and MUST be located at the root of the archive.

### 9.2. Schema

The defaults file MUST be a valid JSON object with the following structure:

```json
{
  "point": ["preset-id-1", "preset-id-2", ...],
  "line": ["preset-id-1", "preset-id-2", ...],
  "area": ["preset-id-1", "preset-id-2", ...]
}
```

### 9.3. Properties

Each geometry type property:

- MUST be present (`point`, `line`, and `area`)
- MUST be an array of preset IDs (non-empty strings)
- Preset IDs SHOULD reference presets defined in `presets.json`
- Each referenced preset MUST include the corresponding geometry type in its `geometry` array
  - For example, a preset referenced in `defaults.point` MUST have `"point"` in its `geometry` array

The order of preset IDs in each array determines the display order of categories shown to the user in CoMapeo applications for that geometry type.

### 9.4. Example

```json
{
	"point": ["tree", "waterhole", "camp"],
	"line": ["river", "trail"],
	"area": ["forest", "lake"]
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

Icon file names (without the `.svg` extension) are used as icon IDs when referenced from presets.

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
- SHOULD use only language and region subtags (e.g., `en.json`, `es.json`, `en-US.json`)
- MAY use other BCP 47 subtags (script, variant, extension) for forward compatibility

### 11.3. Format

Each translation file MUST be a valid JSON object with the following structure:

```json
{
  "preset": {
    "preset-id": [ ... ],
    ...
  },
  "field": {
    "field-id": [ ... ],
    ...
  }
}
```

Where:

- **preset** (required): Object mapping preset IDs to arrays of translation objects
- **field** (required): Object mapping field IDs to arrays of translation objects

### 11.4. Translation Object Schema

Each translation object in the arrays MUST contain:

- **propertyRef** (required): Reference to the property being translated (non-empty string)
  - Uses dot notation for nested properties (e.g., `"options.0"`)
- **message** (required): The translated text (string)

### 11.5. Valid Property References

#### 11.5.1. Preset Property References

For presets, valid `propertyRef` values are:

- `"name"` - Preset name
- `"terms"` - Preset search terms

#### 11.5.2. Field Property References

For fields, valid `propertyRef` values are:

- `"name"` - Field name
- `"label"` - Field label
- `"placeholder"` - Field placeholder text
- `"helperText"` - Field helper text
- `"options.{index}"` - Field option label, where `{index}` is a zero-based integer (e.g., `"options.0"`, `"options.1"`)

### 11.6. Validation

Readers:

- MUST ignore translation files with invalid or unsupported BCP 47 language tags
- SHOULD ignore translation objects with `propertyRef` values that do not correspond to existing properties
- SHOULD ignore preset or field IDs that do not exist in `presets.json` or `fields.json`
- MAY provide different coverage across languages (not all languages need to translate the same properties)

Writers:

- SHOULD only include translation files with valid BCP 47 language tags
- SHOULD only use language and region subtags unless other subtags are needed

### 11.7. Example

File: `translations/es.json`

```json
{
	"preset": {
		"tree": [
			{
				"propertyRef": "name",
				"message": "Árbol"
			},
			{
				"propertyRef": "terms",
				"message": "arbre"
			}
		],
		"waterhole": [
			{
				"propertyRef": "name",
				"message": "Pozo de agua"
			}
		]
	},
	"field": {
		"species": [
			{
				"propertyRef": "label",
				"message": "Especie"
			},
			{
				"propertyRef": "placeholder",
				"message": "ej. Quercus robur"
			}
		],
		"condition": [
			{
				"propertyRef": "label",
				"message": "Condición del árbol"
			},
			{
				"propertyRef": "options.0",
				"message": "Saludable"
			},
			{
				"propertyRef": "options.1",
				"message": "Dañado"
			},
			{
				"propertyRef": "options.2",
				"message": "Muerto"
			}
		]
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
- `presets.json`
- `defaults.json`
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
- All preset references to fields and icons are valid (fields exist in `fields.json`, icons exist in `icons/` directory)

### 13.4. Reference Validation

Readers SHOULD validate that:

- All field IDs referenced in presets exist in `fields.json`
- All icon IDs referenced in presets exist in the `icons/` directory

Readers MAY issue warnings for:

- Fields defined in `fields.json` that are not referenced by any preset
- Icons in the `icons/` directory that are not referenced by any preset

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
