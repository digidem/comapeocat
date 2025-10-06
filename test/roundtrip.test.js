// @ts-nocheck
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { createWriteStream, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { describe, test, before, after } from 'node:test'

import { Reader } from '../src/reader.js'
import { Writer } from '../src/writer.js'
import { fixtures } from './fixtures.js'
import { createTestWriter } from './helpers.js'

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

		writer.addCategory('tree', fixtures.categories.treeComplete)
		writer.addCategory('forest', fixtures.categories.forest)
		writer.addCategory('river', {
			...fixtures.categories.river,
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

		writer.setCategorySelection({
			observation: ['tree'],
			track: ['river', 'forest'],
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

		// Verify categories
		const categories = await reader.categories()
		assert.equal(categories.size, 3)

		const tree = categories.get('tree')
		assert.deepEqual(tree, fixtures.categories.treeComplete)

		// Verify fields
		const fields = await reader.fields()
		assert.equal(fields.size, 6)

		assert.deepEqual(fields.get('species'), fixtures.fields.speciesComplete)
		assert.deepEqual(fields.get('height'), fixtures.fields.height)
		assert.deepEqual(fields.get('name'), {
			...fixtures.fields.name,
			// Expect default appearance to be set
			appearance: 'multiline',
		})
		assert.deepEqual(fields.get('area_size'), fixtures.fields.area_size)
		assert.deepEqual(fields.get('width'), fixtures.fields.width)
		assert.deepEqual(fields.get('condition'), fixtures.fields.condition)

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
		assert.equal(
			Object.keys(esTranslation.translations.category.tree).length,
			2,
		)
		assert.equal(
			Object.keys(esTranslation.translations.field.condition).length,
			4,
		)

		// Verify categorySelection
		const categorySelection = await reader.categorySelection()
		assert.deepEqual(categorySelection, {
			observation: ['tree'],
			track: ['river', 'forest'],
		})

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
		const writer = createTestWriter()

		writer.addCategory('poi', {
			name: 'Point of Interest',
			appliesTo: ['observation'],
			tags: { poi: 'yes' },
			fields: [],
		})

		writer.setMetadata({ name: 'Minimal' })
		writer.finish()

		await pipeline(writer.outputStream, createWriteStream(filepath))

		const reader = new Reader(filepath)
		const categories = await reader.categories()
		const fields = await reader.fields()
		const iconNames = await reader.iconNames()
		const metadata = await reader.metadata()

		assert.equal(categories.size, 1)
		assert.equal(fields.size, 0)
		assert.equal(iconNames.size, 0)
		assert.equal(metadata.name, 'Minimal')

		await reader.validate()
		await reader.close()
	})

	test('roundtrip validates category references', async () => {
		const filepath = join(TEST_DIR, 'roundtrip-valid-refs.comapeocat')
		const writer = createTestWriter()

		writer.addCategory('tree', {
			...fixtures.categories.tree,
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
		const writer = createTestWriter()

		writer.addCategory('multi_tag', {
			name: 'Multi Tag',
			appliesTo: ['observation'],
			tags: {
				string: 'value',
				number: 42,
				boolean: true,
				null_value: null,
			},
			fields: [],
		})

		writer.setMetadata({ name: 'Complex Tags' })
		writer.finish()

		await pipeline(writer.outputStream, createWriteStream(filepath))

		const reader = new Reader(filepath)
		const categories = await reader.categories()
		const category = categories.get('multi_tag')

		assert.equal(category.tags.string, 'value')
		assert.equal(category.tags.number, 42)
		assert.equal(category.tags.boolean, true)
		assert.equal(category.tags.null_value, null)

		await reader.close()
	})

	test('roundtrip with multiline text field', async () => {
		const filepath = join(TEST_DIR, 'roundtrip-multiline.comapeocat')
		const writer = createTestWriter()

		writer.addCategory('note', {
			name: 'Note',
			appliesTo: ['observation'],
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
		const writer = createTestWriter()

		writer.addCategory('survey', {
			name: 'Survey',
			appliesTo: ['observation'],
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
