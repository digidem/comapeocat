# CoMapeo Categories

A JavaScript library for reading and writing CoMapeo Categories files (`.comapeocat`). These files package category definitions (presets), custom fields, icons, and translations for use in [CoMapeo](https://www.comapeo.app) applications.

## Features

- **Read** `.comapeocat` files and access presets, fields, icons, and translations
- **Write** `.comapeocat` files with full validation
- **Validate** category files against the specification
- **CLI tool** for creating and inspecting category files
- Full TypeScript type definitions
- Comprehensive validation with helpful error messages

## Installation

```bash
npm install comapeocat
```

## Quick Start

### Reading a Categories File

```javascript
import { Reader } from 'comapeocat'

const reader = new Reader('path/to/categories.comapeocat')

// Wait for the file to be opened
await reader.opened()

// Read presets
const presets = await reader.presets()
for (const [id, preset] of presets) {
	console.log(id, preset.name, preset.geometry)
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

### Writing a Categories File

```javascript
import { Writer } from 'comapeocat'
import { createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'

const writer = new Writer()

// Add presets
writer.addPreset('tree', {
	name: 'Tree',
	geometry: ['point'],
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
	preset: {
		tree: [{ propertyRef: 'name', message: 'Árbol' }],
	},
	field: {
		species: [{ propertyRef: 'label', message: 'Especie' }],
	},
})

// Set defaults (or omit to auto-generate)
writer.setDefaults({
	point: ['tree'],
	line: [],
	area: [],
})

// Set metadata
writer.setMetadata({
	name: 'Forest Monitoring',
	version: '1.0.0',
})

// Finalize and write
writer.finish()
await pipeline(writer.outputStream, createWriteStream('output.comapeocat'))
```

## API Reference

### Reader

#### `new Reader(filepath)`

Creates a new reader for a `.comapeocat` file.

- **filepath**: `string` | `ZipFile` - Path to the file or an open yauzl ZipFile instance

#### `async reader.opened()`

Returns a promise that resolves when the file has been successfully opened and validated.

#### `async reader.presets()`

Returns a `Promise<Map<string, Preset>>` of all presets in the file.

#### `async reader.fields()`

Returns a `Promise<Map<string, Field>>` of all fields in the file.

#### `async reader.defaults()`

Returns a `Promise<Defaults>` - the defaults object mapping geometry types to preset IDs.

#### `async reader.metadata()`

Returns a `Promise<Metadata>` - the metadata object with name, version, and buildDateValue.

#### `async reader.iconNames()`

Returns a `Promise<Set<string>>` of all icon names (without `.svg` extension).

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

#### `writer.addPreset(id, preset)` _(synchronous)_

Adds a preset definition. Throws if called after `finish()`.

#### `writer.addField(id, field)` _(synchronous)_

Adds a field definition. Throws if called after `finish()`.

#### `async writer.addIcon(id, svg)`

Adds an SVG icon. Returns a promise that resolves when the icon is added. Throws if SVG is invalid or if called after `finish()`.

#### `async writer.addTranslations(lang, translations)`

Adds translations for a language. Returns a promise that resolves when translations are added. Throws if called after `finish()`.

#### `writer.setDefaults(defaults)` _(synchronous)_

Sets the defaults object. If not called, defaults are auto-generated based on preset sort order and name. Throws if called after `finish()`.

#### `writer.setMetadata(metadata)` _(synchronous)_

Sets the metadata (required). Throws if called after `finish()`.

#### `writer.finish()` _(synchronous)_

Finalizes the archive. Must be called before reading from `outputStream`. Validates all references and throws if validation fails. After calling this, no more data can be added.

#### `writer.outputStream` _(property)_

Readable stream containing the `.comapeocat` file data. Only readable after calling `finish()`.

## CLI Tool

The package includes a `comapeocat` CLI tool for managing category files.

### Commands

#### `comapeocat build [inputDir]`

Build a `.comapeocat` file from a directory containing JSON files and icons.

**Arguments:**

- `[inputDir]` - Directory containing presets, fields, defaults, icons, and messages (default: current directory)

**Options:**

- `-o, --output <file>` - Output file path (default: stdout)
- `--name <name>` - Name of the category set (overrides metadata.json)
- `--version <version>` - Version of the category set (overrides metadata.json)

**Directory structure:**

```
inputDir/
├── presets/
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
├── defaults.json
└── metadata.json
```

**Example:**

```bash
# Build from current directory to stdout
comapeocat build

# Build to a specific file
comapeocat build ./categories -o output.comapeocat

# Override metadata
comapeocat build --name "My Categories" --version "1.0.0" -o output.comapeocat
```

#### `comapeocat lint [inputDir]`

Lint preset and field JSON files to validate against schemas and check references.

**Arguments:**

- `[inputDir]` - Directory containing presets and fields (default: current directory)

**Example:**

```bash
# Lint files in current directory
comapeocat lint

# Lint files in specific directory
comapeocat lint ./categories
```

#### `comapeocat messages [inputDir]`

Extract translatable messages from presets and fields for a given language.

**Arguments:**

- `[inputDir]` - Directory containing presets and fields (default: current directory)

**Options:**

- `--lang <lang>` - Language code for the messages (default: `en`)

**Example:**

```bash
# Extract English messages (default)
comapeocat messages

# Extract Spanish messages
comapeocat messages --lang es

# Extract messages from specific directory
comapeocat messages ./categories --lang fr
```

This creates a `messages/<lang>.json` file with all translatable strings extracted from presets and fields.

## File Format Specification

The `.comapeocat` file format is a ZIP archive containing JSON configuration files and SVG icons. See the [full specification](./spec/1.0/README.md) for details.

### Required Files

- `VERSION` - Format version (e.g., "1.0")
- `presets.json` - Preset definitions
- `defaults.json` - Default presets for each geometry type
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

## Testing

```bash
npm test
```

Tests use Node.js's built-in test runner and cover:

- Reading all file components
- Writing and validating files
- Roundtrip read-write-read consistency
- Error handling and validation
- Edge cases

## License

ISC

## Contributing

Issues and pull requests welcome at [github.com/digidem/comapeocat](https://github.com/digidem/comapeocat).
