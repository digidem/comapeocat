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

describe('Writer', () => {
	before(() => {
		mkdirSync(TEST_DIR, { recursive: true })
	})

	after(() => {
		rmSync(TEST_DIR, { recursive: true, force: true })
	})

	test('creates a valid minimal file', async () => {
		const filepath = join(TEST_DIR, 'writer-minimal.comapeocat')
		const writer = new Writer()

		writer.addCategory('tree', fixtures.categories.tree)
		writer.setCategorySelection(fixtures.categorySelection.observation)
		writer.setMetadata({ name: 'Test Categories' })
		writer.finish()

		await pipeline(writer.outputStream, createWriteStream(filepath))

		const reader = new Reader(filepath)
		await reader.opened()

		const categories = await reader.categories()
		assert.equal(categories.size, 1)
		assert.equal(categories.get('tree').name, 'Tree')

		const metadata = await reader.metadata()
		assert.equal(metadata.name, 'Test Categories')
		assert.ok(metadata.buildDateValue > 0)

		await reader.close()
	})

	test('creates file with all components', async () => {
		const filepath = join(TEST_DIR, 'writer-full.comapeocat')
		const writer = new Writer()

		writer.addCategory('tree', fixtures.categories.treeWithFields)
		writer.addCategory('river', fixtures.categories.riverWithFields)

		writer.addField('species', fixtures.fields.species)
		writer.addField('height', fixtures.fields.height)
		writer.addField('name', fixtures.fields.name)

		await writer.addIcon('tree', fixtures.icons.tree)
		await writer.addTranslations('es', fixtures.translations.es)

		writer.setCategorySelection({
			observation: ['tree'],
			track: ['river'],
		})

		writer.setMetadata({
			name: 'Full Test Categories',
			version: '1.0.0',
		})

		writer.finish()

		await pipeline(writer.outputStream, createWriteStream(filepath))

		const reader = new Reader(filepath)
		await reader.opened()

		const categories = await reader.categories()
		assert.equal(categories.size, 2)
		assert.equal(categories.get('tree').icon, 'tree')
		assert.equal(categories.get('tree').color, '#228B22')

		const fields = await reader.fields()
		assert.equal(fields.size, 3)
		assert.equal(fields.get('species').type, 'text')

		const iconNames = await reader.iconNames()
		assert.ok(iconNames.has('tree'))

		const translations = []
		for await (const t of reader.translations()) {
			translations.push(t)
		}
		assert.equal(translations.length, 1)
		assert.equal(translations[0].lang, 'es')

		const metadata = await reader.metadata()
		assert.equal(metadata.version, '1.0.0')

		await reader.close()
	})

	test('throws when no categorySelection set', async () => {
		const writer = new Writer()

		writer.addCategory('tree', fixtures.categories.tree)
		writer.setMetadata({ name: 'Test' })
		assert.throws(() => writer.finish(), {
			name: 'MissingCategorySelectionError',
		})
	})

	test('throws when adding after finish', async () => {
		const writer = createTestWriter()

		writer.addCategory('tree', fixtures.categories.tree)
		writer.finish()

		assert.throws(
			() => writer.addCategory('river', fixtures.categories.river),
			{
				name: 'AddAfterFinishError',
			},
		)
	})

	test('throws when missing metadata', async () => {
		const writer = new Writer()
		writer.addCategory('tree', fixtures.categories.tree)

		assert.throws(() => writer.finish(), { name: 'MissingMetadataError' })
	})

	test('throws when no categories added', async () => {
		const writer = new Writer()
		writer.setMetadata({ name: 'Test' })

		assert.throws(() => writer.finish(), { name: 'MissingCategoriesError' })
	})

	test('validates category references to fields', async () => {
		const writer = new Writer()

		writer.addCategory('tree', {
			...fixtures.categories.tree,
			fields: ['nonexistent'],
		})

		writer.setMetadata({ name: 'Test' })

		assert.throws(() => writer.finish(), { name: 'CategoryRefError' })
	})

	test('validates category references to icons', async () => {
		const writer = new Writer()

		writer.addCategory('tree', {
			...fixtures.categories.tree,
			icon: 'nonexistent',
		})

		writer.setMetadata({ name: 'Test' })

		assert.throws(() => writer.finish(), { name: 'CategoryRefError' })
	})

	test('validates field schema', async () => {
		const writer = new Writer()

		assert.throws(
			() => {
				writer.addField('invalid', {
					type: 'invalid-type',
					tagKey: 'test',
					label: 'Test',
				})
			},
			{ name: 'ValiError' },
		)
	})

	test('validates unique select option values', async () => {
		const writer = new Writer()

		assert.throws(
			() => {
				writer.addField('condition', {
					type: 'selectOne',
					tagKey: 'condition',
					label: 'Condition',
					options: [
						{ label: 'Good', value: 'good' },
						{ label: 'Bad', value: 'bad' },
						{ label: 'Also Good', value: 'good' }, // Duplicate value
					],
				})
			},
			{ name: 'ValiError' },
		)
	})

	test('validates category schema', async () => {
		const writer = new Writer()

		assert.throws(
			() => {
				writer.addCategory('invalid', { name: 'Test' })
			},
			{ name: 'ValiError' },
		)
	})

	test('validates SVG content', async () => {
		const writer = new Writer()

		await assert.rejects(
			async () => {
				await writer.addIcon('invalid', 'not valid svg')
			},
			{ name: 'InvalidSvgError' },
		)
	})

	test('allows valid SVG', async () => {
		const filepath = join(TEST_DIR, 'writer-svg.comapeocat')
		const writer = createTestWriter()

		writer.addCategory('tree', { ...fixtures.categories.tree, icon: 'tree' })
		await writer.addIcon('tree', fixtures.icons.complex)
		writer.finish()

		await pipeline(writer.outputStream, createWriteStream(filepath))

		const reader = new Reader(filepath)
		const icons = []
		for await (const icon of reader.icons()) {
			icons.push(icon)
		}

		assert.equal(icons.length, 1)
		assert.ok(icons[0].iconXml.includes('xmlns'))

		await reader.close()
	})

	test('validates translations schema', async () => {
		const writer = new Writer()

		await assert.rejects(
			async () => {
				await writer.addTranslations('es', {
					category: {
						tree: [{ propertyRef: 'name' }], // Missing message
					},
					field: {},
				})
			},
			{ name: 'ValiError' },
		)
	})

	test('validates metadata name length', async () => {
		const writer = new Writer()

		assert.throws(
			() => {
				writer.setMetadata({ name: 'A'.repeat(101) })
			},
			{ name: 'ValiError' },
		)
	})

	test('validates metadata version length', async () => {
		const writer = new Writer()

		assert.throws(
			() => {
				writer.setMetadata({
					name: 'Test',
					version: 'A'.repeat(21),
				})
			},
			{ name: 'ValiError' },
		)
	})

	test('handles multiple document types', async () => {
		const filepath = join(TEST_DIR, 'writer-multi-doc-types.comapeocat')
		const writer = createTestWriter()

		writer.addCategory('water', fixtures.categories.multiGeometry)
		writer.finish()

		await pipeline(writer.outputStream, createWriteStream(filepath))

		const reader = new Reader(filepath)
		const categories = await reader.categories()

		assert.ok(categories.get('water')?.appliesTo.includes('observation'))
		assert.ok(categories.get('water')?.appliesTo.includes('track'))

		await reader.close()
	})

	test('handles select field with options', async () => {
		const filepath = join(TEST_DIR, 'writer-select.comapeocat')
		const writer = createTestWriter()

		writer.addCategory('tree', {
			...fixtures.categories.tree,
			fields: ['condition'],
		})

		writer.addField('condition', fixtures.fields.condition)
		writer.finish()

		await pipeline(writer.outputStream, createWriteStream(filepath))

		const reader = new Reader(filepath)
		const fields = await reader.fields()
		const condition = fields.get('condition')

		assert.equal(condition.type, 'selectOne')
		assert.equal(condition.options.length, 3)
		assert.equal(condition.options[0].label, 'Healthy')

		await reader.close()
	})

	test('emits error event on invalid operations', async () => {
		const writer = new Writer()
		let errorEmitted = false

		writer.on('error', () => {
			errorEmitted = true
		})

		writer.finish = function () {
			this.emit('error', new Error('Test error'))
		}

		writer.finish()

		await new Promise((resolve) => setTimeout(resolve, 10))
		assert.ok(errorEmitted)
	})
})
