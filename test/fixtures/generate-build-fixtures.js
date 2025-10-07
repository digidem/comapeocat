// @ts-nocheck
import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { faker } from '@faker-js/faker'
import { execaSync } from 'execa'
import { Valimock } from 'valimock'

import {
	CategorySchema,
	CategorySchemaDeprecatedSort,
	CategorySchemaDeprecatedGeometry,
} from '../../src/schema/category.js'
import { FieldSchema } from '../../src/schema/field.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CLI_PATH = join(__dirname, '..', '..', 'bin', 'comapeocat.mjs')

// Set a fixed seed for reproducible fixtures
faker.seed(42)

const valimock = new Valimock()

const FIXTURES_DIR = join(__dirname, 'build')

/**
 * Helper to write a JSON file
 * @param {string} dirPath
 * @param {string} filename
 * @param {unknown} content
 */
function writeJSON(dirPath, filename, content) {
	mkdirSync(dirPath, { recursive: true })
	writeFileSync(join(dirPath, filename), JSON.stringify(content, null, 2))
}

// Fixture 1: No categorySelection.json - should auto-generate based on preset order
const noCategorySelectionDir = join(FIXTURES_DIR, 'no-categorySelection')

const field1 = valimock.mock(FieldSchema)
const field2 = valimock.mock(FieldSchema)

writeJSON(join(noCategorySelectionDir, 'fields'), 'field1.json', field1)
writeJSON(join(noCategorySelectionDir, 'fields'), 'field2.json', field2)

const preset1 = valimock.mock(CategorySchema)
preset1.fields = ['field1']
preset1.appliesTo = ['observation']
delete preset1.icon
delete preset1.sort

const preset2 = valimock.mock(CategorySchema)
preset2.fields = ['field2']
preset2.appliesTo = ['track']
delete preset2.icon
delete preset2.sort

const preset3 = valimock.mock(CategorySchema)
preset3.fields = ['field1', 'field2']
preset3.appliesTo = ['track']
delete preset3.icon
delete preset3.sort

writeJSON(join(noCategorySelectionDir, 'categories'), 'preset1.json', preset1)
writeJSON(join(noCategorySelectionDir, 'categories'), 'preset2.json', preset2)
writeJSON(join(noCategorySelectionDir, 'categories'), 'preset3.json', preset3)

writeJSON(noCategorySelectionDir, 'metadata.json', {
	name: 'No CategorySelection Test',
	version: '1.0.0',
})

// Fixture 2: With deprecated sort field - should use sort to determine categorySelection order
const withSortDir = join(FIXTURES_DIR, 'with-sort')

const sortField1 = valimock.mock(FieldSchema)
writeJSON(join(withSortDir, 'fields'), 'field1.json', sortField1)

// Create presets with sort field in specific order
const sortPreset1 = valimock.mock(CategorySchemaDeprecatedSort)
sortPreset1.fields = ['field1']
sortPreset1.appliesTo = ['observation']
sortPreset1.sort = 3 // Should appear third
delete sortPreset1.icon

const sortPreset2 = valimock.mock(CategorySchemaDeprecatedSort)
sortPreset2.fields = ['field1']
sortPreset2.appliesTo = ['observation']
sortPreset2.sort = 1 // Should appear first
delete sortPreset2.icon

const sortPreset3 = valimock.mock(CategorySchemaDeprecatedSort)
sortPreset3.fields = ['field1']
sortPreset3.appliesTo = ['observation']
sortPreset3.sort = 2 // Should appear second
delete sortPreset3.icon

writeJSON(join(withSortDir, 'categories'), 'preset1.json', sortPreset1)
writeJSON(join(withSortDir, 'categories'), 'preset2.json', sortPreset2)
writeJSON(join(withSortDir, 'categories'), 'preset3.json', sortPreset3)

writeJSON(withSortDir, 'metadata.json', {
	name: 'With Sort Test',
	version: '1.0.0',
})

// Fixture 3: Complete valid fixture for general build tests
const completeDir = join(FIXTURES_DIR, 'complete')

const completeField1 = valimock.mock(FieldSchema)
const completeField2 = valimock.mock(FieldSchema)

writeJSON(join(completeDir, 'fields'), 'field1.json', completeField1)
writeJSON(join(completeDir, 'fields'), 'field2.json', completeField2)

const completePreset1 = valimock.mock(CategorySchema)
completePreset1.fields = ['field1', 'field2']
completePreset1.icon = 'icon1'
completePreset1.appliesTo = ['observation']

const completePreset2 = valimock.mock(CategorySchema)
completePreset2.fields = ['field2']
completePreset2.icon = 'icon2'
completePreset2.appliesTo = ['track']

writeJSON(join(completeDir, 'categories'), 'preset1.json', completePreset1)
writeJSON(join(completeDir, 'categories'), 'preset2.json', completePreset2)

mkdirSync(join(completeDir, 'icons'), { recursive: true })
writeFileSync(
	join(completeDir, 'icons', 'icon1.svg'),
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"/></svg>',
)
writeFileSync(
	join(completeDir, 'icons', 'icon2.svg'),
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80"/></svg>',
)

writeJSON(completeDir, 'categorySelection.json', {
	observation: ['preset1'],
	track: ['preset2'],
})

writeJSON(completeDir, 'metadata.json', {
	name: 'Complete Build Test',
	version: '1.0.0',
})

execaSync('node', [
	CLI_PATH,
	'messages',
	completeDir,
	'--output',
	join(completeDir, 'messages', 'en.json'),
])

// Fixture 4: With deprecated geometry field - should migrate to appliesTo
const withGeometryDir = join(FIXTURES_DIR, 'with-geometry')

const geometryField1 = valimock.mock(FieldSchema)
writeJSON(join(withGeometryDir, 'fields'), 'field1.json', geometryField1)

// Create categories with deprecated geometry field
const geometryPreset1 = valimock.mock(CategorySchemaDeprecatedGeometry)
geometryPreset1.fields = ['field1']
geometryPreset1.geometry = ['point']
delete geometryPreset1.icon

const geometryPreset2 = valimock.mock(CategorySchemaDeprecatedGeometry)
geometryPreset2.fields = ['field1']
geometryPreset2.geometry = ['line']
delete geometryPreset2.icon

const geometryPreset3 = valimock.mock(CategorySchemaDeprecatedGeometry)
geometryPreset3.fields = ['field1']
geometryPreset3.geometry = ['point', 'line']
delete geometryPreset3.icon

writeJSON(join(withGeometryDir, 'categories'), 'preset1.json', geometryPreset1)
writeJSON(join(withGeometryDir, 'categories'), 'preset2.json', geometryPreset2)
writeJSON(join(withGeometryDir, 'categories'), 'preset3.json', geometryPreset3)

writeJSON(withGeometryDir, 'metadata.json', {
	name: 'With Geometry Test',
	version: '1.0.0',
})

console.log(`Generated build fixtures at ${FIXTURES_DIR}`)
console.log('Build fixtures:')
console.log(
	'  - no-categorySelection (tests auto-generation of categorySelection.json)',
)
console.log('  - with-sort (tests deprecated sort field handling)')
console.log('  - complete (complete fixture with all components)')
console.log(
	'  - with-geometry (tests deprecated geometry field migration to appliesTo)',
)
