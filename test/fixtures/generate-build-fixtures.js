import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { faker } from '@faker-js/faker'
import { Valimock } from 'valimock'

import { FieldSchema } from '../../src/schema/field.js'
import { PresetSchemaDeprecated } from '../../src/schema/preset.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Set a fixed seed for reproducible fixtures
faker.seed(123)

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

// Fixture 1: No defaults.json - should auto-generate based on preset order
const noDefaultsDir = join(FIXTURES_DIR, 'no-defaults')

const field1 = valimock.mock(FieldSchema)
const field2 = valimock.mock(FieldSchema)

writeJSON(join(noDefaultsDir, 'fields'), 'field1.json', field1)
writeJSON(join(noDefaultsDir, 'fields'), 'field2.json', field2)

const preset1 = valimock.mock(PresetSchemaDeprecated)
preset1.fields = ['field1']
// @ts-expect-error
preset1.geometry = ['point']
delete preset1.icon
delete preset1.sort

const preset2 = valimock.mock(PresetSchemaDeprecated)
preset2.fields = ['field2']
// @ts-expect-error
preset2.geometry = ['line']
delete preset2.icon
delete preset2.sort

const preset3 = valimock.mock(PresetSchemaDeprecated)
preset3.fields = ['field1', 'field2']
// @ts-expect-error
preset3.geometry = ['area']
delete preset3.icon
delete preset3.sort

writeJSON(join(noDefaultsDir, 'presets'), 'preset1.json', preset1)
writeJSON(join(noDefaultsDir, 'presets'), 'preset2.json', preset2)
writeJSON(join(noDefaultsDir, 'presets'), 'preset3.json', preset3)

writeJSON(noDefaultsDir, 'metadata.json', {
	name: 'No Defaults Test',
	version: '1.0.0',
})

// Fixture 2: With deprecated sort field - should use sort to determine defaults order
const withSortDir = join(FIXTURES_DIR, 'with-sort')

const sortField1 = valimock.mock(FieldSchema)
writeJSON(join(withSortDir, 'fields'), 'field1.json', sortField1)

// Create presets with sort field in specific order
const sortPreset1 = valimock.mock(PresetSchemaDeprecated)
sortPreset1.fields = ['field1']
// @ts-expect-error
sortPreset1.geometry = ['point']
sortPreset1.sort = 3 // Should appear third
delete sortPreset1.icon

const sortPreset2 = valimock.mock(PresetSchemaDeprecated)
sortPreset2.fields = ['field1']
// @ts-expect-error
sortPreset2.geometry = ['point']
sortPreset2.sort = 1 // Should appear first
delete sortPreset2.icon

const sortPreset3 = valimock.mock(PresetSchemaDeprecated)
sortPreset3.fields = ['field1']
// @ts-expect-error
sortPreset3.geometry = ['point']
sortPreset3.sort = 2 // Should appear second
delete sortPreset3.icon

writeJSON(join(withSortDir, 'presets'), 'preset1.json', sortPreset1)
writeJSON(join(withSortDir, 'presets'), 'preset2.json', sortPreset2)
writeJSON(join(withSortDir, 'presets'), 'preset3.json', sortPreset3)

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

const completePreset1 = valimock.mock(PresetSchemaDeprecated)
completePreset1.fields = ['field1', 'field2']
completePreset1.icon = 'icon1'
// @ts-expect-error
completePreset1.geometry = ['point']

const completePreset2 = valimock.mock(PresetSchemaDeprecated)
completePreset2.fields = ['field2']
completePreset2.icon = 'icon2'
// @ts-expect-error
completePreset2.geometry = ['line']

writeJSON(join(completeDir, 'presets'), 'preset1.json', completePreset1)
writeJSON(join(completeDir, 'presets'), 'preset2.json', completePreset2)

mkdirSync(join(completeDir, 'icons'), { recursive: true })
writeFileSync(
	join(completeDir, 'icons', 'icon1.svg'),
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"/></svg>',
)
writeFileSync(
	join(completeDir, 'icons', 'icon2.svg'),
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80"/></svg>',
)

writeJSON(completeDir, 'defaults.json', {
	point: ['preset1'],
	line: ['preset2'],
	area: [],
})

writeJSON(completeDir, 'metadata.json', {
	name: 'Complete Build Test',
	version: '1.0.0',
})

writeJSON(join(completeDir, 'messages'), 'en.json', {
	'preset.preset1.name': {
		message: completePreset1.name,
		description: "The name of category 'preset1'",
	},
})

console.log(`Generated build fixtures at ${FIXTURES_DIR}`)
console.log('Build fixtures:')
console.log('  - no-defaults (tests auto-generation of defaults.json)')
console.log('  - with-sort (tests deprecated sort field handling)')
console.log('  - complete (complete fixture with all components)')
