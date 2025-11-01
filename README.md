# CoMapeo Categories File Utilities `comapeocat`

[![npm version](https://img.shields.io/npm/v/comapeocat.svg)](https://www.npmjs.com/package/comapeocat)
[![Build Status](https://img.shields.io/github/actions/workflow/status/digidem/comapeocat/node.yml?branch=main)](https://github.com/digidem/comapeocat/actions)

A JavaScript library for reading and writing CoMapeo Categories files (`.comapeocat`). These files package category definitions, custom fields, icons, and translations for use in [CoMapeo](https://www.comapeo.app) applications.

## Features

- **Read** `.comapeocat` files and access categories, fields, icons, and translations
- **Write** `.comapeocat` files with full validation
- **Validate** category files against the specification
- **CLI tool** for creating and linting category files

## Contents

- [Quick Start](#quick-start)
- [CLI Usage](#cli-usage)
  - [Installation](#installation)
  - [Commands](#commands)
    - [`npx comapeocat build [inputDir]`](#npx-comapeocat-build-inputdir)
    - [`npx comapeocat lint [inputDir]`](#npx-comapeocat-lint-inputdir)
    - [`npx comapeocat validate [file]`](#npx-comapeocat-validate-file)
    - [`npx comapeocat messages [inputDir]`](#npx-comapeocat-messages-inputdir)
- [VSCode settings for JSON Schema Validation](#vscode-settings-for-json-schema-validation)
- [API Reference](#api-reference)
  - [Installation](#installation-1)
  - [Quick Start](#quick-start-1)
    - [Reading a Categories File](#reading-a-categories-file)
    - [Writing a Categories File](#writing-a-categories-file)
  - [Reader](#reader)
    - [`new Reader(filepath)`](#new-readerfilepath)
    - [`async reader.opened()`](#async-readeropened)
    - [`async reader.categories()`](#async-readercategories)
    - [`async reader.fields()`](#async-readerfields)
    - [`async reader.categorySelection()`](#async-readercategoryselection)
    - [`async reader.metadata()`](#async-readermetadata)
    - [`async reader.iconNames()`](#async-readericonnames)
    - [`async reader.getIcon(iconId)`](#async-readergeticoniconid)
    - [`async *reader.icons()`](#async-readericons)
    - [`async *reader.translations()`](#async-readertranslations)
    - [`async reader.validate()`](#async-readervalidate)
    - [`async reader.close()`](#async-readerclose)
  - [Writer](#writer)
    - [`new Writer(options?)`](#new-writeroptions)
    - [`writer.addCategory(id, category)` _(synchronous)_](#writeraddcategoryid-category-synchronous)
    - [`writer.addField(id, field)` _(synchronous)_](#writeraddfieldid-field-synchronous)
    - [`async writer.addIcon(id, svg)`](#async-writeraddiconid-svg)
    - [`async writer.addTranslations(lang, translations)`](#async-writeraddtranslationslang-translations)
    - [`writer.setCategorySelection(categorySelection)` _(synchronous)_](#writersetcategoryselectioncategoryselection-synchronous)
    - [`writer.setMetadata(metadata)` _(synchronous)_](#writersetmetadatametadata-synchronous)
    - [`writer.finish()` _(synchronous)_](#writerfinish-synchronous)
    - [`writer.outputStream` _(property)_](#writeroutputstream-property)
- [File Format Specification](#file-format-specification)
  - [Required Files](#required-files)
  - [Optional Files](#optional-files)
- [Validation](#validation)
- [License](#license)
- [Contributing](#contributing)

## Quick Start

Build a `.comapeocat` file from a directory of JSON files and icons:

```bash
npx comapeocat build --output mycategories.comapeocat
```

Extract messages for translation:

```bash
npx comapeocat messages --output messages/en.json
```

## CLI Usage

### Installation

Install the CLI globally for offline-use and convenience (you can always use `npx comapeocat` without installing):

```bash
npm install -g comapeocat
```

### Commands

#### `npx comapeocat build [inputDir]`

Build a `.comapeocat` file from a directory containing JSON files and icons.

**Arguments:**

- `[inputDir]` - Directory containing categories, fields, categorySelection, icons, and messages (default: current directory)

**Options:**

- `-o, --output <file>` - Output file path (default: stdout)
- `--name <name>` - Name of the category set (overrides metadata.json)
- `--version <version>` - Version of the category set (overrides metadata.json)
- `--addCategoryIdTags` - Add a `categoryId` tag to each category's `addTags` property

**Directory structure:**

```
inputDir/
├── categories/
│   ├── tree.json
│   └── river.json
├── fields/
│   ├── species.json
│   └── height.json
├── icons/
│   ├── tree.svg
│   └── river.svg
├── messages/
│   ├── en.json
│   └── es.json
├── categorySelection.json
└── metadata.json
```

**Example:**

```bash
# Build from current directory to stdout
npx comapeocat build

# Build to a specific file
npx comapeocat build ./my_categories --output output.comapeocat

# Override metadata
npx comapeocat build --name "My Categories" --version "1.0.0" --output output.comapeocat

# Add categoryId tags to categories
npx comapeocat build --addCategoryIdTags --output output.comapeocat
```

#### `npx comapeocat lint [inputDir]`

Lint category and field JSON files to validate against schemas and check references.

**Arguments:**

- `[inputDir]` - Directory containing categories and fields (default: current directory)

**Example:**

```bash
# Lint files in current directory
npx comapeocat lint
```

#### `npx comapeocat validate [file]`

Validate a `.comapeocat` archive file.

**Arguments:**

- `[file]` - Path to the `.comapeocat` file (required)

**Example:**

```bash
# Validate a specific .comapeocat file
npx comapeocat validate mycategories.comapeocat
```

#### `npx comapeocat messages [inputDir]`

Extract translatable messages from categories and fields for a given language.

**Arguments:**

- `[inputDir]` - Directory containing categories and fields (default: current directory)

**Options:**

- `-o, --output <file>` - Output file path (default: stdout)

**Example:**

```bash
comapeocat messages --output messages/en.json
```

This creates a `messages/<lang>.json` file with all translatable strings extracted from categories and fields. The filename should be a valid BCP 47 language code (e.g., `en`, `es-PE`, `fr`) and the file should be placed in a `messages` subdirectory of the input directory to be picked up by the `build` command.

## VSCode settings for JSON Schema Validation

To enable JSON schema validation in VSCode for the various JSON files used in a `.comapeocat` project, add the following to your workspace settings (`.vscode/settings.json`):

```json
{
	"json.schemas": [
		{
			"fileMatch": ["categories/**/*.json", "presets/**/*.json"],
			"url": "./node_modules/comapeocat/dist/schema/category.json"
		},
		{
			"fileMatch": ["fields/**/*.json"],
			"url": "./node_modules/comapeocat/dist/schema/field.json"
		},
		{
			"fileMatch": ["messages/*.json"],
			"url": "./node_modules/comapeocat/dist/schema/messages.json"
		},
		{
			"fileMatch": ["categorySelection.json"],
			"url": "./node_modules/comapeocat/dist/schema/categorySelection.json"
		},
		{
			"fileMatch": ["metadata.json"],
			"url": "./node_modules/comapeocat/dist/schema/metadata.json"
		}
	]
}
```

## API Reference

### Installation

```bash
npm install comapeocat
```

### Quick Start

#### Reading a Categories File

```javascript
import { Reader } from 'comapeocat'

const reader = new Reader('path/to/categories.comapeocat')

// Wait for the file to be opened
await reader.opened()

// Read categories
const categories = await reader.categories()
for (const [id, category] of categories) {
	console.log(id, category.name, category.appliesTo)
}

// Read fields
const fields = await reader.fields()
const species = fields.get('species')
console.log(species.label, species.type)

// Read icons
for await (const { name, iconXml } of reader.icons()) {
	console.log(name, iconXml)
}

// Read translations
for await (const { lang, translations } of reader.translations()) {
	console.log(lang, translations)
}

// Validate the file
await reader.validate()

// Always close when done
await reader.close()
```

#### Writing a Categories File

```javascript
import { Writer } from 'comapeocat'
import { createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'

const writer = new Writer()

// Add categories
writer.addCategory('tree', {
	name: 'Tree',
	appliesTo: ['observation'],
	tags: { natural: 'tree' },
	fields: ['species', 'height'],
	icon: 'tree',
	color: '#228B22',
})

// Add fields
writer.addField('species', {
	type: 'text',
	tagKey: 'species',
	label: 'Species',
	appearance: 'singleline',
})

writer.addField('height', {
	type: 'number',
	tagKey: 'height',
	label: 'Height (meters)',
})

// Add icons (async)
await writer.addIcon('tree', '<svg>...</svg>')

// Add translations (async)
await writer.addTranslations('es', {
	category: {
		tree: { name: 'Árbol' },
	},
	field: {
		species: { label: 'Especie' },
	},
})

// Set category selection
writer.setCategorySelection({
	observation: ['tree'],
	track: [],
})

// Set metadata
writer.setMetadata({
	name: 'Forest Monitoring',
	version: '1.0.0',
	builderName: 'comapeocat',
	builderVersion: '1.0.0',
})

// Finalize and write
writer.finish()
await pipeline(writer.outputStream, createWriteStream('output.comapeocat'))
```

### Reader

#### `new Reader(filepath)`

Creates a new reader for a `.comapeocat` file.

- **filepath**: `string` | `ZipFile` - Path to the file or an open yauzl ZipFile instance

#### `async reader.opened()`

Returns a promise that resolves when the file has been successfully opened and validated.

#### `async reader.categories()`

Returns a `Promise<Map<string, Category>>` of all categories in the file.

#### `async reader.fields()`

Returns a `Promise<Map<string, Field>>` of all fields in the file.

#### `async reader.categorySelection()`

Returns a `Promise<CategorySelection>` - the category selection object mapping document types to category IDs.

#### `async reader.metadata()`

Returns a `Promise<Metadata>` - the metadata object containing:

- `name` - Human-readable name for the category set
- `version` - Version identifier (optional)
- `buildDateValue` - Build timestamp in milliseconds
- `builderName` - Name of the tool used to build the archive (optional)
- `builderVersion` - Version of the tool used to build the archive (optional)

#### `reader.supportedFileVersion()`

Returns the supported file version string (e.g., `"1.0"`).

- **Returns**: `string` - The supported file version

```javascript
const reader = new Reader('path/to/categories.comapeocat')
const supportedVersion = reader.supportedFileVersion()
console.log('Supported version:', supportedVersion) // "1.0"
```

#### `async reader.fileVersion()`

Returns the actual file version string from the archive.

- **Returns**: `Promise<string>` - The file version (e.g., `"1.0"`, `"1.5"`)

```javascript
const reader = new Reader('path/to/categories.comapeocat')
await reader.opened()
const fileVersion = await reader.fileVersion()
console.log('File version:', fileVersion)
```

#### `async reader.iconNames()`

Returns a `Promise<Set<string>>` of all icon names (without `.svg` extension).

#### `async reader.getIcon(iconId)`

Returns the SVG XML content of an icon by its ID, or `null` if the icon doesn't exist.

- **iconId**: `string` - Icon ID (without `.svg` extension)
- **Returns**: `Promise<string | null>` - SVG XML content or null

```javascript
const iconXml = await reader.getIcon('tree')
if (iconXml) {
	console.log('Icon found:', iconXml)
}
```

#### `async *reader.icons()`

Returns an async generator that yields `{ name, iconXml }` objects.

```javascript
for await (const { name, iconXml } of reader.icons()) {
	// Process each icon
}
```

#### `async *reader.translations()`

Returns an async generator that yields `{ lang, translations }` objects.

```javascript
for await (const { lang, translations } of reader.translations()) {
	// Process each translation
}
```

#### `async reader.validate()`

Validates the file structure and all references. Throws errors if validation fails.

#### `async reader.close()`

Closes the underlying zip file.

### Writer

#### `new Writer(options?)`

Creates a new writer.

- **options.highWaterMark**: `number` - Stream high water mark (default: 1MB)

#### `writer.addCategory(id, category)` _(synchronous)_

Adds a category definition. Throws if called after `finish()`.

#### `writer.addField(id, field)` _(synchronous)_

Adds a field definition. Throws if called after `finish()`.

#### `async writer.addIcon(id, svg)`

Adds an SVG icon. Returns a promise that resolves when the icon is added. Throws if SVG is invalid or if called after `finish()`.

#### `async writer.addTranslations(lang, translations)`

Adds translations for a language. Returns a promise that resolves when translations are added. Throws if called after `finish()`.

#### `writer.setCategorySelection(categorySelection)` _(synchronous)_

Sets the category selection object mapping document types to category IDs. Throws if called after `finish()`.

#### `writer.setMetadata(metadata)` _(synchronous)_

Sets the metadata (required). Throws if called after `finish()`.

- **metadata.name**: `string` (required) - Human-readable name for the category set (max 100 characters)
- **metadata.version**: `string` (optional) - Version identifier (max 20 characters)
- **metadata.builderName**: `string` (optional) - Name of the tool used to build the archive (max 100 characters)
- **metadata.builderVersion**: `string` (optional) - Version of the tool (max 20 characters)

#### `writer.finish()` _(synchronous)_

Finalizes the archive. Must be called before reading from `outputStream`. Validates all references and throws if validation fails. After calling this, no more data can be added.

#### `writer.outputStream` _(property)_

Readable stream containing the `.comapeocat` file data. Only readable after calling `finish()`.

## File Format Specification

The `.comapeocat` file format is a ZIP archive containing JSON configuration files and SVG icons. See the [full specification](./spec/1.0/README.md) for details.

### Required Files

- `VERSION` - Format version (e.g., "1.0")
- `categories.json` - Category definitions
- `categorySelection.json` - Category selection for each document type
- `metadata.json` - Package metadata

### Optional Files

- `fields.json` - Field definitions
- `icons/*.svg` - Icon files
- `translations/*.json` - Translation files

## Validation

Both Reader and Writer perform comprehensive validation:

- **Schema validation** - All JSON files are validated against their schemas
- **Reference validation** - Field and icon references are checked
- **Version validation** - File format version is checked
- **SVG validation** - Icon files are validated and sanitized

Error messages include file names and specific issues to help debug problems.

## License

MIT

## Contributing

Issues and pull requests welcome at [github.com/digidem/comapeocat](https://github.com/digidem/comapeocat).
