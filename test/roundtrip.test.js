// @ts-nocheck

import { describe, test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { Writer } from '../src/writer.js'
import { Reader } from '../src/reader.js'
import { createWriteStream, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomBytes } from 'node:crypto'
import { pipeline } from 'node:stream/promises'
import { fixtures } from './fixtures.js'

const TEST_DIR = join(
	tmpdir(),
	`comapeo-cat-test-${randomBytes(4).toString('hex')}`,
)

describe('Writer -> Reader roundtrip tests', () => {
	before(() => {
		mkdirSync(TEST_DIR, { recursive: true })
	})

	after(() => {
		rmSync(TEST_DIR, { recursive: true, force: true })
	})

	test('roundtrip preserves all data', async () => {
		const filepath = join(TEST_DIR, 'roundtrip-full.comapeocat')
		const writer = new Writer()

		writer.addPreset('tree', fixtures.presets.treeComplete)
		writer.addPreset('forest', fixtures.presets.forest)
		writer.addPreset('river', {
			...fixtures.presets.river,
			fields: ['name', 'width'],
		})

		writer.addField('species', fixtures.fields.speciesComplete)
		writer.addField('height', fixtures.fields.height)
		writer.addField('condition', fixtures.fields.condition)
		writer.addField('name', fixtures.fields.name)
		writer.addField('area_size', fixtures.fields.area_size)
		writer.addField('width', fixtures.fields.width)

		await writer.addIcon('tree', fixtures.icons.tree)
		await writer.addIcon('forest', fixtures.icons.forest)

		await writer.addTranslations('es', fixtures.translations.esComplete)
		await writer.addTranslations('fr', fixtures.translations.fr)

		writer.setDefaults({
			point: ['tree'],
			line: ['river'],
			area: ['forest'],
		})

		writer.setMetadata({
			name: 'Comprehensive Test Categories',
			version: '2.1.0',
		})

		writer.finish()

		await pipeline(writer.outputStream, createWriteStream(filepath))

		// Read back and verify
		const reader = new Reader(filepath)
		await reader.opened()

		// Verify presets
		const presets = await reader.presets()
		assert.equal(presets.size, 3)

		const tree = presets.get('tree')
		assert.equal(tree.name, 'Tree')
		assert.deepEqual(tree.geometry, ['point'])
		assert.deepEqual(tree.tags, { natural: 'tree' })
		assert.deepEqual(tree.addTags, { natural: 'tree', source: 'survey' })
		assert.deepEqual(tree.removeTags, { natural: 'tree', source: 'survey' })
		assert.deepEqual(tree.fields, ['species', 'height', 'condition'])
		assert.equal(tree.icon, 'tree')
		assert.equal(tree.color, '#228B22')
		assert.deepEqual(tree.terms, ['árbol', 'arbre'])
		assert.equal(tree.sort, 1)

		// Verify fields
		const fields = await reader.fields()
		assert.equal(fields.size, 6)

		const species = fields.get('species')
		assert.equal(species.type, 'text')
		assert.equal(species.tagKey, 'species')
		assert.equal(species.label, 'Species')
		assert.equal(species.appearance, 'singleline')
		assert.equal(species.placeholder, 'e.g., Quercus robur')

		const condition = fields.get('condition')
		assert.equal(condition.type, 'selectOne')
		assert.equal(condition.options.length, 3)
		assert.equal(condition.options[1].label, 'Damaged')

		// Verify icons
		const iconNames = await reader.iconNames()
		assert.equal(iconNames.size, 2)
		assert.ok(iconNames.has('tree'))
		assert.ok(iconNames.has('forest'))

		// Verify translations
		const translations = []
		for await (const t of reader.translations()) {
			translations.push(t)
		}
		assert.equal(translations.length, 2)

		const esTranslation = translations.find((t) => t.lang === 'es')
		assert.ok(esTranslation)
		assert.equal(esTranslation.translations.preset.tree.length, 2)
		assert.equal(esTranslation.translations.field.condition.length, 4)

		// Verify defaults
		const defaults = await reader.defaults()
		assert.deepEqual(defaults.point, ['tree'])
		assert.deepEqual(defaults.line, ['river'])
		assert.deepEqual(defaults.area, ['forest'])

		// Verify metadata
		const metadata = await reader.metadata()
		assert.equal(metadata.name, 'Comprehensive Test Categories')
		assert.equal(metadata.version, '2.1.0')
		assert.ok(metadata.buildDateValue > 0)

		// Validate the file
		await assert.doesNotReject(() => reader.validate())

		await reader.close()
	})

	test('roundtrip with minimal data', async () => {
		const filepath = join(TEST_DIR, 'roundtrip-minimal.comapeocat')
		const writer = new Writer()

		writer.addPreset('poi', {
			name: 'Point of Interest',
			geometry: ['point'],
			tags: { poi: 'yes' },
			fields: [],
		})

		writer.setMetadata({ name: 'Minimal' })
		writer.finish()

		await pipeline(writer.outputStream, createWriteStream(filepath))

		const reader = new Reader(filepath)
		const presets = await reader.presets()
		const fields = await reader.fields()
		const iconNames = await reader.iconNames()
		const metadata = await reader.metadata()

		assert.equal(presets.size, 1)
		assert.equal(fields.size, 0)
		assert.equal(iconNames.size, 0)
		assert.equal(metadata.name, 'Minimal')

		await reader.validate()
		await reader.close()
	})

	test('roundtrip with auto-generated defaults', async () => {
		const filepath = join(TEST_DIR, 'roundtrip-auto-defaults.comapeocat')
		const writer = new Writer()

		writer.addPreset('a_point', {
			name: 'A Point',
			geometry: ['point'],
			tags: { test: 'a' },
			fields: [],
			sort: 2,
		})

		writer.addPreset('b_point', {
			name: 'B Point',
			geometry: ['point'],
			tags: { test: 'b' },
			fields: [],
			sort: 1,
		})

		writer.addPreset('c_line', {
			name: 'C Line',
			geometry: ['line'],
			tags: { test: 'c' },
			fields: [],
		})

		writer.setMetadata({ name: 'Auto Defaults Test' })
		writer.finish()

		await pipeline(writer.outputStream, createWriteStream(filepath))

		const reader = new Reader(filepath)
		const defaults = await reader.defaults()

		assert.deepEqual(defaults.point, ['b_point', 'a_point'])
		assert.deepEqual(defaults.line, ['c_line'])
		assert.deepEqual(defaults.area, [])

		await reader.close()
	})

	test('roundtrip validates preset references', async () => {
		const filepath = join(TEST_DIR, 'roundtrip-valid-refs.comapeocat')
		const writer = new Writer()

		writer.addPreset('tree', {
			...fixtures.presets.tree,
			fields: ['height'],
			icon: 'tree_icon',
		})

		writer.addField('height', fixtures.fields.height)
		await writer.addIcon('tree_icon', fixtures.icons.simple)

		writer.setMetadata({ name: 'Test' })
		writer.finish()

		await pipeline(writer.outputStream, createWriteStream(filepath))

		const reader = new Reader(filepath)
		await assert.doesNotReject(() => reader.validate())
		await reader.close()
	})

	test('roundtrip with complex tags', async () => {
		const filepath = join(TEST_DIR, 'roundtrip-complex-tags.comapeocat')
		const writer = new Writer()

		writer.addPreset('multi_tag', {
			name: 'Multi Tag',
			geometry: ['point'],
			tags: {
				string: 'value',
				number: 42,
				boolean: true,
				null_value: null,
				array: ['a', 'b', 'c'],
			},
			fields: [],
		})

		writer.setMetadata({ name: 'Complex Tags' })
		writer.finish()

		await pipeline(writer.outputStream, createWriteStream(filepath))

		const reader = new Reader(filepath)
		const presets = await reader.presets()
		const preset = presets.get('multi_tag')

		assert.equal(preset.tags.string, 'value')
		assert.equal(preset.tags.number, 42)
		assert.equal(preset.tags.boolean, true)
		assert.equal(preset.tags.null_value, null)
		assert.deepEqual(preset.tags.array, ['a', 'b', 'c'])

		await reader.close()
	})

	test('roundtrip with multiline text field', async () => {
		const filepath = join(TEST_DIR, 'roundtrip-multiline.comapeocat')
		const writer = new Writer()

		writer.addPreset('note', {
			name: 'Note',
			geometry: ['point'],
			tags: { note: 'yes' },
			fields: ['description'],
		})

		writer.addField('description', fixtures.fields.description)
		writer.setMetadata({ name: 'Test' })
		writer.finish()

		await pipeline(writer.outputStream, createWriteStream(filepath))

		const reader = new Reader(filepath)
		const fields = await reader.fields()
		const description = fields.get('description')

		assert.equal(description.appearance, 'multiline')

		await reader.close()
	})

	test('roundtrip with selectMultiple field', async () => {
		const filepath = join(TEST_DIR, 'roundtrip-select-multiple.comapeocat')
		const writer = new Writer()

		writer.addPreset('survey', {
			name: 'Survey',
			geometry: ['point'],
			tags: { survey: 'yes' },
			fields: ['features'],
		})

		writer.addField('features', fixtures.fields.features)
		writer.setMetadata({ name: 'Test' })
		writer.finish()

		await pipeline(writer.outputStream, createWriteStream(filepath))

		const reader = new Reader(filepath)
		const fields = await reader.fields()
		const features = fields.get('features')

		assert.equal(features.type, 'selectMultiple')
		assert.equal(features.options.length, 3)

		await reader.close()
	})
})
