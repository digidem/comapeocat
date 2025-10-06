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
import { createTestZip, fixtures } from './fixtures.js'
import { createTestWriter } from './helpers.js'

const TEST_DIR = join(
	tmpdir(),
	`comapeo-cat-test-${randomBytes(4).toString('hex')}`,
)

describe('Edge cases and untested spec details', () => {
	before(() => {
		mkdirSync(TEST_DIR, { recursive: true })
	})

	after(() => {
		rmSync(TEST_DIR, { recursive: true, force: true })
	})

	describe('Special characters in IDs', () => {
		test('handles UTF-8 characters in category IDs', async () => {
			const filepath = join(TEST_DIR, 'category-id-utf8.comapeocat')
			const writer = createTestWriter()

			writer.addCategory('árbol_🌳', {
				name: 'Tree',
				appliesTo: ['observation'],
				tags: { natural: 'tree' },
				fields: [],
			})
			writer.finish()

			await pipeline(writer.outputStream, createWriteStream(filepath))

			const reader = new Reader(filepath)
			const categories = await reader.categories()

			assert.ok(categories.has('árbol_🌳'))

			await reader.close()
		})

		test('handles UTF-8 characters in field names and values', async () => {
			const filepath = join(TEST_DIR, 'field-utf8.comapeocat')
			const writer = createTestWriter()

			writer.addCategory('test', {
				name: 'Test',
				appliesTo: ['observation'],
				tags: { test: 'value' },
				fields: ['espèce'],
			})

			writer.addField('espèce', {
				type: 'text',
				tagKey: 'species',
				label: 'Espèce (UTF-8)',
				placeholder: 'par exemple: Quercus robur',
			})

			writer.finish()

			await pipeline(writer.outputStream, createWriteStream(filepath))

			const reader = new Reader(filepath)
			const fields = await reader.fields()

			assert.ok(fields.has('espèce'))
			assert.equal(fields.get('espèce').label, 'Espèce (UTF-8)')

			await reader.close()
		})
	})

	describe('Version format validation', () => {
		test('rejects version with three segments', async () => {
			const filepath = join(TEST_DIR, 'version-three-segments.comapeocat')
			await createTestZip({
				filepath,
				version: '1.0.0',
				files: {
					'categories.json': { tree: fixtures.categories.tree },
					'categorySelection.json': fixtures.categorySelection.observation,
					'metadata.json': fixtures.metadata.minimal,
				},
			})

			const reader = new Reader(filepath)
			await assert.rejects(() => reader.opened(), {
				name: 'InvalidFileVersionError',
			})
			await reader.close()
		})

		test('rejects version with only major number', async () => {
			const filepath = join(TEST_DIR, 'version-only-major.comapeocat')
			await createTestZip({
				filepath,
				version: '1',
				files: {
					'categories.json': { tree: fixtures.categories.tree },
					'categorySelection.json': fixtures.categorySelection.observation,
					'metadata.json': fixtures.metadata.minimal,
				},
			})

			const reader = new Reader(filepath)
			await assert.rejects(() => reader.opened(), {
				name: 'InvalidFileVersionError',
			})
			await reader.close()
		})

		test('rejects empty version', async () => {
			const filepath = join(TEST_DIR, 'version-empty.comapeocat')
			await createTestZip({
				filepath,
				version: '',
				files: {
					'categories.json': { tree: fixtures.categories.tree },
					'categorySelection.json': fixtures.categorySelection.observation,
					'metadata.json': fixtures.metadata.minimal,
				},
			})

			const reader = new Reader(filepath)
			await assert.rejects(() => reader.opened())
			await reader.close()
		})

		test('rejects version with spaces', async () => {
			const filepath = join(TEST_DIR, 'version-spaces.comapeocat')
			await createTestZip({
				filepath,
				version: '1 . 0',
				files: {
					'categories.json': { tree: fixtures.categories.tree },
					'categorySelection.json': fixtures.categorySelection.observation,
					'metadata.json': fixtures.metadata.minimal,
				},
			})

			const reader = new Reader(filepath)
			await assert.rejects(() => reader.opened(), {
				name: 'InvalidFileVersionError',
			})
			await reader.close()
		})
	})

	describe('Document type validation', () => {
		test('rejects category with empty appliesTo array', async () => {
			const writer = new Writer()

			assert.throws(
				() => {
					writer.addCategory('invalid', {
						name: 'Invalid',
						appliesTo: [],
						tags: { test: 'value' },
						fields: [],
					})
				},
				{ name: 'ValiError' },
			)
		})

		test('filters out invalid document types', async () => {
			const writer = new Writer()

			assert.throws(
				() => {
					writer.addCategory('invalid', {
						name: 'Invalid',
						appliesTo: ['invalid_type'],
						tags: { test: 'value' },
						fields: [],
					})
				},
				{ name: 'ValiError' },
			)
		})

		test('accepts category with both document types', async () => {
			const filepath = join(TEST_DIR, 'both-doc-types.comapeocat')
			const writer = createTestWriter()

			writer.addCategory('multi', {
				name: 'Multi Type',
				appliesTo: ['observation', 'track'],
				tags: { test: 'value' },
				fields: [],
			})
			writer.finish()

			await pipeline(writer.outputStream, createWriteStream(filepath))

			const reader = new Reader(filepath)
			const categories = await reader.categories()

			assert.deepEqual(categories.get('multi').appliesTo, [
				'observation',
				'track',
			])

			await reader.close()
		})

		test('filters out invalid document types', async () => {
			const filepath = join(TEST_DIR, 'invalid-doc-types.comapeocat')
			const writer = createTestWriter()

			writer.addCategory('filtered', {
				name: 'Filtered',
				appliesTo: ['observation', 'invalid_type'],
				tags: { test: 'value' },
				fields: [],
			})

			writer.finish()

			await pipeline(writer.outputStream, createWriteStream(filepath))

			const reader = new Reader(filepath)
			const categories = await reader.categories()

			assert.deepEqual(categories.get('filtered').appliesTo, ['observation'])

			await reader.close()
		})
	})

	describe('CategorySelection validation', () => {
		test('allows categorySelection with non-existent category IDs', async () => {
			const filepath = join(
				TEST_DIR,
				'categorySelection-nonexistent.comapeocat',
			)
			await createTestZip({
				filepath,
				files: {
					'categories.json': { tree: fixtures.categories.tree },
					'categorySelection.json': {
						observation: ['tree', 'nonexistent'],
						track: [],
					},
					'metadata.json': fixtures.metadata.minimal,
				},
			})

			const reader = new Reader(filepath)
			const categorySelection = await reader.categorySelection()

			assert.deepEqual(categorySelection.observation, ['tree', 'nonexistent'])

			await reader.close()
		})

		test('allows category in categorySelection without matching document type', async () => {
			const filepath = join(
				TEST_DIR,
				'categorySelection-wrong-doc-type.comapeocat',
			)
			await createTestZip({
				filepath,
				files: {
					'categories.json': {
						tree: fixtures.categories.tree, // appliesTo: ['observation']
					},
					'categorySelection.json': {
						observation: [],
						track: ['tree'], // tree is observation, not track
					},
					'metadata.json': fixtures.metadata.minimal,
				},
			})

			const reader = new Reader(filepath)
			const categorySelection = await reader.categorySelection()

			assert.deepEqual(categorySelection.track, ['tree'])

			await reader.close()
		})

		test('rejects categorySelection missing required document types', async () => {
			const filepath = join(
				TEST_DIR,
				'categorySelection-missing-type.comapeocat',
			)
			await createTestZip({
				filepath,
				files: {
					'categories.json': { tree: fixtures.categories.tree },
					'categorySelection.json': {
						observation: ['tree'],
						// Missing track
					},
					'metadata.json': fixtures.metadata.minimal,
				},
			})

			const reader = new Reader(filepath)
			await assert.rejects(() => reader.categorySelection())

			await reader.close()
		})
	})

	describe('Color validation', () => {
		test('accepts 3-digit hex color', async () => {
			const filepath = join(TEST_DIR, 'color-3-digit.comapeocat')
			const writer = createTestWriter()

			writer.addCategory('test', {
				name: 'Test',
				appliesTo: ['observation'],
				tags: { test: 'value' },
				fields: [],
				color: '#abc',
			})

			writer.finish()

			await pipeline(writer.outputStream, createWriteStream(filepath))

			const reader = new Reader(filepath)
			const categories = await reader.categories()

			assert.equal(categories.get('test').color, '#abc')

			await reader.close()
		})

		test('accepts 6-digit hex color', async () => {
			const filepath = join(TEST_DIR, 'color-6-digit.comapeocat')
			const writer = createTestWriter()

			writer.addCategory('test', {
				name: 'Test',
				appliesTo: ['observation'],
				tags: { test: 'value' },
				fields: [],
				color: '#aabbcc',
			})

			writer.finish()

			await pipeline(writer.outputStream, createWriteStream(filepath))

			const reader = new Reader(filepath)
			const categories = await reader.categories()

			assert.equal(categories.get('test').color, '#aabbcc')

			await reader.close()
		})

		test('accepts 8-digit hex color with alpha', async () => {
			const filepath = join(TEST_DIR, 'color-8-digit.comapeocat')
			const writer = createTestWriter()

			writer.addCategory('test', {
				name: 'Test',
				appliesTo: ['observation'],
				tags: { test: 'value' },
				fields: [],
				color: '#aabbccdd',
			})

			writer.finish()

			await pipeline(writer.outputStream, createWriteStream(filepath))

			const reader = new Reader(filepath)
			const categories = await reader.categories()

			assert.equal(categories.get('test').color, '#aabbccdd')

			await reader.close()
		})

		test('accepts uppercase hex color', async () => {
			const filepath = join(TEST_DIR, 'color-uppercase.comapeocat')
			const writer = createTestWriter()

			writer.addCategory('test', {
				name: 'Test',
				appliesTo: ['observation'],
				tags: { test: 'value' },
				fields: [],
				color: '#AABBCC',
			})

			writer.finish()

			await pipeline(writer.outputStream, createWriteStream(filepath))

			const reader = new Reader(filepath)
			const categories = await reader.categories()

			assert.equal(categories.get('test').color, '#AABBCC')

			await reader.close()
		})

		test('rejects invalid hex color', async () => {
			const writer = createTestWriter()

			assert.throws(
				() => {
					writer.addCategory('test', {
						name: 'Test',
						appliesTo: ['observation'],
						tags: { test: 'value' },
						fields: [],
						color: 'red',
					})
				},
				{ name: 'ValiError' },
			)
		})

		test('rejects hex color without hash', async () => {
			const writer = createTestWriter()

			assert.throws(
				() => {
					writer.addCategory('test', {
						name: 'Test',
						appliesTo: ['observation'],
						tags: { test: 'value' },
						fields: [],
						color: 'aabbcc',
					})
				},
				{ name: 'ValiError' },
			)
		})

		test('rejects invalid hex digits', async () => {
			const writer = createTestWriter()

			assert.throws(
				() => {
					writer.addCategory('test', {
						name: 'Test',
						appliesTo: ['observation'],
						tags: { test: 'value' },
						fields: [],
						color: '#gghhii',
					})
				},
				{ name: 'ValiError' },
			)
		})
	})

	describe('Field options validation', () => {
		test('rejects selectOne field with no options', async () => {
			const writer = createTestWriter()

			assert.throws(
				() => {
					writer.addField('invalid', {
						type: 'selectOne',
						tagKey: 'test',
						label: 'Test',
						options: [],
					})
				},
				{ name: 'ValiError' },
			)
		})

		test('rejects selectMultiple field with no options', async () => {
			const writer = createTestWriter()

			assert.throws(
				() => {
					writer.addField('invalid', {
						type: 'selectMultiple',
						tagKey: 'test',
						label: 'Test',
						options: [],
					})
				},
				{ name: 'ValiError' },
			)
		})

		test('accepts option values of different types', async () => {
			const filepath = join(TEST_DIR, 'options-mixed-types.comapeocat')
			const writer = createTestWriter()

			writer.addCategory('test', {
				name: 'Test',
				appliesTo: ['observation'],
				tags: { test: 'value' },
				fields: ['mixed'],
			})

			writer.addField('mixed', {
				type: 'selectOne',
				tagKey: 'test',
				label: 'Mixed Options',
				options: [
					{ label: 'String', value: 'text' },
					{ label: 'Number', value: 42 },
					{ label: 'Boolean', value: true },
					{ label: 'Null', value: null },
				],
			})

			writer.finish()

			await pipeline(writer.outputStream, createWriteStream(filepath))

			const reader = new Reader(filepath)
			const fields = await reader.fields()
			const field = fields.get('mixed')

			assert.equal(field.options[0].value, 'text')
			assert.equal(field.options[1].value, 42)
			assert.equal(field.options[2].value, true)
			assert.equal(field.options[3].value, null)

			await reader.close()
		})
	})

	describe('Metadata validation', () => {
		test('accepts metadata with minimal required fields', async () => {
			const filepath = join(TEST_DIR, 'metadata-minimal.comapeocat')
			const writer = createTestWriter()

			writer.addCategory('test', {
				name: 'Test',
				appliesTo: ['observation'],
				tags: { test: 'value' },
				fields: [],
			})

			writer.finish()

			await pipeline(writer.outputStream, createWriteStream(filepath))

			const reader = new Reader(filepath)
			const metadata = await reader.metadata()

			assert.ok(metadata.name)
			assert.ok(metadata.buildDateValue > 0)

			await reader.close()
		})

		test('rejects metadata with empty name', async () => {
			const writer = createTestWriter()

			assert.throws(
				() => {
					writer.setMetadata({ name: '' })
				},
				{ name: 'ValiError' },
			)
		})

		test('rejects metadata version exactly 21 characters', async () => {
			const writer = createTestWriter()

			assert.throws(
				() => {
					writer.setMetadata({
						name: 'Test',
						version: 'a'.repeat(21),
					})
				},
				{ name: 'ValiError' },
			)
		})

		test('accepts metadata version exactly 20 characters', async () => {
			const filepath = join(TEST_DIR, 'metadata-version-20.comapeocat')
			const writer = createTestWriter()

			writer.addCategory('test', {
				name: 'Test',
				appliesTo: ['observation'],
				tags: { test: 'value' },
				fields: [],
			})

			writer.setMetadata({
				name: 'Test',
				version: 'a'.repeat(20),
			})
			writer.finish()

			await pipeline(writer.outputStream, createWriteStream(filepath))

			const reader = new Reader(filepath)
			const metadata = await reader.metadata()

			assert.equal(metadata.version.length, 20)

			await reader.close()
		})

		test('accepts metadata name exactly 100 characters', async () => {
			const filepath = join(TEST_DIR, 'metadata-name-100.comapeocat')
			const writer = createTestWriter()

			writer.addCategory('test', {
				name: 'Test',
				appliesTo: ['observation'],
				tags: { test: 'value' },
				fields: [],
			})

			writer.setMetadata({
				name: 'a'.repeat(100),
			})
			writer.finish()

			await pipeline(writer.outputStream, createWriteStream(filepath))

			const reader = new Reader(filepath)
			const metadata = await reader.metadata()

			assert.equal(metadata.name.length, 100)

			await reader.close()
		})
	})

	describe('Translation validation', () => {
		test('accepts valid BCP 47 language codes', async () => {
			const filepath = join(TEST_DIR, 'translation-bcp47-valid.comapeocat')
			const writer = createTestWriter()

			writer.addCategory('tree', fixtures.categories.tree)

			await writer.addTranslations('en', fixtures.translations.es)
			await writer.addTranslations('en-US', fixtures.translations.es)
			await writer.addTranslations('en-GB', fixtures.translations.es)
			await writer.addTranslations('zh-Hans', fixtures.translations.es)

			writer.setMetadata({ name: 'Test' })
			writer.finish()

			await pipeline(writer.outputStream, createWriteStream(filepath))

			const reader = new Reader(filepath)
			const translations = []
			for await (const t of reader.translations()) {
				translations.push(t.lang)
			}

			assert.ok(translations.includes('en'))
			assert.ok(translations.includes('en-US'))
			assert.ok(translations.includes('en-GB'))
			assert.ok(translations.includes('zh-Hans'))

			await reader.close()
		})

		test('allows translation for non-existent preset', async () => {
			const filepath = join(
				TEST_DIR,
				'translation-nonexistent-preset.comapeocat',
			)
			await createTestZip({
				filepath,
				files: {
					'categories.json': { tree: fixtures.categories.tree },
					'categorySelection.json': fixtures.categorySelection.observation,
					'metadata.json': fixtures.metadata.minimal,
					'translations/es.json': {
						category: {
							nonexistent: { name: 'No existe' },
						},
						field: {},
					},
				},
			})

			const reader = new Reader(filepath)
			const translations = []
			for await (const t of reader.translations()) {
				translations.push(t)
			}

			assert.equal(translations.length, 1)
			assert.ok(translations[0].translations.category.nonexistent)

			await reader.close()
		})

		test('allows translation for non-existent field', async () => {
			const filepath = join(
				TEST_DIR,
				'translation-nonexistent-field.comapeocat',
			)
			await createTestZip({
				filepath,
				files: {
					'categories.json': { tree: fixtures.categories.tree },
					'categorySelection.json': fixtures.categorySelection.observation,
					'metadata.json': fixtures.metadata.minimal,
					'translations/es.json': {
						category: {},
						field: {
							nonexistent: { label: 'No existe' },
						},
					},
				},
			})

			const reader = new Reader(filepath)
			const translations = []
			for await (const t of reader.translations()) {
				translations.push(t)
			}

			assert.equal(translations.length, 1)
			assert.ok(translations[0].translations.field.nonexistent)

			await reader.close()
		})
	})

	describe('Tag value types', () => {
		test('accepts all valid tag value types', async () => {
			const filepath = join(TEST_DIR, 'tags-all-types.comapeocat')
			const writer = createTestWriter()

			writer.addCategory('test', {
				name: 'Test',
				appliesTo: ['observation'],
				tags: {
					string_tag: 'value',
					number_tag: 123,
					boolean_tag: true,
					null_tag: null,
				},
				fields: [],
			})

			writer.setMetadata({ name: 'Test' })
			writer.finish()

			await pipeline(writer.outputStream, createWriteStream(filepath))

			const reader = new Reader(filepath)
			const categories = await reader.categories()
			const tags = categories.get('test').tags

			assert.equal(tags.string_tag, 'value')
			assert.equal(tags.number_tag, 123)
			assert.equal(tags.boolean_tag, true)
			assert.equal(tags.null_tag, null)

			await reader.close()
		})
	})

	describe('Text field appearance', () => {
		test('text field appearance defaults to multiline', async () => {
			const filepath = join(TEST_DIR, 'text-appearance-default.comapeocat')
			const writer = createTestWriter()

			writer.addCategory('test', {
				name: 'Test',
				appliesTo: ['observation'],
				tags: { test: 'value' },
				fields: ['notes'],
			})

			writer.addField('notes', {
				type: 'text',
				tagKey: 'notes',
				label: 'Notes',
			})

			writer.setMetadata({ name: 'Test' })
			writer.finish()

			await pipeline(writer.outputStream, createWriteStream(filepath))

			const reader = new Reader(filepath)
			const fields = await reader.fields()
			const field = fields.get('notes')

			// Should default to multiline
			assert.equal(field.appearance, 'multiline')

			await reader.close()
		})

		test('accepts singleline appearance', async () => {
			const filepath = join(TEST_DIR, 'text-appearance-singleline.comapeocat')
			const writer = createTestWriter()

			writer.addCategory('test', {
				name: 'Test',
				appliesTo: ['observation'],
				tags: { test: 'value' },
				fields: ['name'],
			})

			writer.addField('name', {
				type: 'text',
				tagKey: 'name',
				label: 'Name',
				appearance: 'singleline',
			})

			writer.setMetadata({ name: 'Test' })
			writer.finish()

			await pipeline(writer.outputStream, createWriteStream(filepath))

			const reader = new Reader(filepath)
			const fields = await reader.fields()

			assert.equal(fields.get('name').appearance, 'singleline')

			await reader.close()
		})
	})
})
