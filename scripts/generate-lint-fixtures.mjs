#!/usr/bin/env node
// @ts-nocheck
import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { faker } from '@faker-js/faker'

import { CategorySchema } from '../src/schema/category.js'
import { FieldSchema } from '../src/schema/field.js'
import { Valimock } from './custom-valimock.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Set a fixed seed for reproducible fixtures
faker.seed(45)

const valimock = new Valimock()

const FIXTURES_DIR = join(__dirname, '../test/fixtures/lint')

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

// Generate valid fixtures using valimock

// Minimal valid fixture - no fields, no icons, no categorySelection, no metadata
const minimalDir = join(FIXTURES_DIR, 'valid', 'minimal')
const minimalPreset = valimock.mock(CategorySchema)
// Override to ensure no field/icon references and valid appliesTo
minimalPreset.fields = []
minimalPreset.appliesTo = ['observation', 'track']
delete minimalPreset.icon
writeJSON(join(minimalDir, 'categories'), 'preset1.json', minimalPreset)

// Complete valid fixture - with fields, icons, categorySelection, and metadata
const completeDir = join(FIXTURES_DIR, 'valid', 'complete')

// Generate fields first
const field1 = valimock.mock(FieldSchema)
const field2 = valimock.mock(FieldSchema)
const field3 = valimock.mock(FieldSchema)

writeJSON(join(completeDir, 'fields'), 'field1.json', field1)
writeJSON(join(completeDir, 'fields'), 'field2.json', field2)
writeJSON(join(completeDir, 'fields'), 'field3.json', field3)

// Generate presets that reference the fields and icons
const preset1 = valimock.mock(CategorySchema)
preset1.fields = ['field1', 'field2']
preset1.icon = 'icon1'
preset1.appliesTo = ['observation']

const preset2 = valimock.mock(CategorySchema)
preset2.fields = ['field2', 'field3']
preset2.icon = 'icon2'
preset2.appliesTo = ['track']

const preset3 = valimock.mock(CategorySchema)
preset3.fields = ['field1']
preset3.icon = 'icon3'
preset3.appliesTo = ['track']

writeJSON(join(completeDir, 'categories'), 'preset1.json', preset1)
writeJSON(join(completeDir, 'categories'), 'preset2.json', preset2)
writeJSON(join(completeDir, 'categories'), 'preset3.json', preset3)

// Generate icons
mkdirSync(join(completeDir, 'icons'), { recursive: true })
writeFileSync(
	join(completeDir, 'icons', 'icon1.svg'),
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"/></svg>',
)
writeFileSync(
	join(completeDir, 'icons', 'icon2.svg'),
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80"/></svg>',
)
writeFileSync(
	join(completeDir, 'icons', 'icon3.svg'),
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="50,10 90,90 10,90"/></svg>',
)

// Generate categorySelection
writeJSON(completeDir, 'categorySelection.json', {
	observation: ['preset1'],
	track: ['preset2', 'preset3'],
})

// Generate metadata
writeJSON(completeDir, 'metadata.json', {
	name: 'Test Categories',
	version: '1.0.0',
})

// Generate messages
writeJSON(join(completeDir, 'messages'), 'en.json', {
	'category.preset1.name': {
		message: preset1.name,
		description: "The name of category 'preset1'",
	},
	'field.field1.label': {
		message: field1.label,
		description: "Label for field 'field1'",
	},
})

// Generate fixture with category without fields property
const noFieldsDir = join(FIXTURES_DIR, 'valid', 'no-fields')
const noFieldsPreset = valimock.mock(CategorySchema)
// Remove the fields property entirely to test that it's optional
delete noFieldsPreset.fields
noFieldsPreset.appliesTo = ['observation', 'track']
delete noFieldsPreset.icon
writeJSON(join(noFieldsDir, 'categories'), 'preset1.json', noFieldsPreset)
writeJSON(noFieldsDir, 'categorySelection.json', {
	observation: ['preset1'],
	track: ['preset1'],
})
writeJSON(noFieldsDir, 'metadata.json', {
	name: 'Test',
	version: '1.0.0',
})

// Generate fixture with matching tags but non-overlapping appliesTo
const nonOverlappingDir = join(
	FIXTURES_DIR,
	'valid',
	'non-overlapping-applies-to',
)
const nonOverlappingPreset1 = valimock.mock(CategorySchema)
const nonOverlappingPreset2 = valimock.mock(CategorySchema)
// Set identical tags but different appliesTo values
const sharedTags = { category: 'water', type: 'natural' }
nonOverlappingPreset1.tags = sharedTags
nonOverlappingPreset2.tags = sharedTags
nonOverlappingPreset1.appliesTo = ['observation']
nonOverlappingPreset2.appliesTo = ['track']
nonOverlappingPreset1.fields = []
nonOverlappingPreset2.fields = []
delete nonOverlappingPreset1.icon
delete nonOverlappingPreset2.icon
writeJSON(
	join(nonOverlappingDir, 'categories'),
	'preset1.json',
	nonOverlappingPreset1,
)
writeJSON(
	join(nonOverlappingDir, 'categories'),
	'preset2.json',
	nonOverlappingPreset2,
)

console.log(`Generated lint fixtures at ${FIXTURES_DIR}`)
console.log('Valid fixtures:')
console.log(
	'  - valid/minimal (no fields, icons, categorySelection, or metadata)',
)
console.log(
	'  - valid/complete (with fields, icons, categorySelection, and metadata)',
)
console.log('  - valid/no-fields (category without fields property)')
console.log(
	'  - valid/non-overlapping-applies-to (matching tags, non-overlapping appliesTo)',
)
