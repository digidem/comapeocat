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
		test('handles preset IDs with dots', async () => {
			const filepath = join(TEST_DIR, 'preset-id-dots.comapeocat')
			const writer = new Writer()

			writer.addPreset('category.subcategory', {
				name: 'Category Subcategory',
				geometry: ['point'],
				tags: { test: 'value' },
				fields: [],
			})

			writer.setMetadata({ name: 'Test' })
			writer.finish()

			await pipeline(writer.outputStream, createWriteStream(filepath))

			const reader = new Reader(filepath)
			const presets = await reader.presets()

			assert.ok(presets.has('category.subcategory'))
			assert.equal(
				presets.get('category.subcategory').name,
				'Category Subcategory',
			)

			await reader.close()
		})

		test('handles field IDs with dots', async () => {
			const filepath = join(TEST_DIR, 'field-id-dots.comapeocat')
			const writer = new Writer()

			writer.addPreset('test', {
				name: 'Test',
				geometry: ['point'],
				tags: { test: 'value' },
				fields: ['field.name'],
			})

			writer.addField('field.name', {
				type: 'text',
				tagKey: 'test',
				label: 'Test Field',
			})

			writer.setMetadata({ name: 'Test' })
			writer.finish()

			await pipeline(writer.outputStream, createWriteStream(filepath))

			const reader = new Reader(filepath)
			const fields = await reader.fields()

			assert.ok(fields.has('field.name'))
			assert.equal(fields.get('field.name').label, 'Test Field')

			await reader.close()
		})

		test('handles icon IDs with dots in filename', async () => {
			const filepath = join(TEST_DIR, 'icon-id-dots.comapeocat')
			const writer = new Writer()

			writer.addPreset('test', {
				name: 'Test',
				geometry: ['point'],
				tags: { test: 'value' },
				fields: [],
				icon: 'icon.category',
			})

			await writer.addIcon('icon.category', fixtures.icons.simple)
			writer.setMetadata({ name: 'Test' })
			writer.finish()

			await pipeline(writer.outputStream, createWriteStream(filepath))

			const reader = new Reader(filepath)
			const iconNames = await reader.iconNames()

			assert.ok(iconNames.has('icon.category'))

			await reader.close()
		})

		test('handles preset IDs with backslashes (escaped)', async () => {
			const filepath = join(TEST_DIR, 'preset-id-backslash.comapeocat')
			const writer = new Writer()

			writer.addPreset('category\\subcategory', {
				name: 'Category Backslash',
				geometry: ['point'],
				tags: { test: 'value' },
				fields: [],
			})

			writer.setMetadata({ name: 'Test' })
			writer.finish()

			await pipeline(writer.outputStream, createWriteStream(filepath))

			const reader = new Reader(filepath)
			const presets = await reader.presets()

			assert.ok(presets.has('category\\subcategory'))

			await reader.close()
		})

		test('handles field IDs with underscores and hyphens', async () => {
			const filepath = join(TEST_DIR, 'field-id-special.comapeocat')
			const writer = new Writer()

			writer.addPreset('test', {
				name: 'Test',
				geometry: ['point'],
				tags: { test: 'value' },
				fields: ['field_name', 'field-name'],
			})

			writer.addField('field_name', {
				type: 'text',
				tagKey: 'test1',
				label: 'Underscore Field',
			})

			writer.addField('field-name', {
				type: 'text',
				tagKey: 'test2',
				label: 'Hyphen Field',
			})

			writer.setMetadata({ name: 'Test' })
			writer.finish()

			await pipeline(writer.outputStream, createWriteStream(filepath))

			const reader = new Reader(filepath)
			const fields = await reader.fields()

			assert.ok(fields.has('field_name'))
			assert.ok(fields.has('field-name'))

			await reader.close()
		})

		test('handles UTF-8 characters in preset IDs', async () => {
			const filepath = join(TEST_DIR, 'preset-id-utf8.comapeocat')
			const writer = new Writer()

			writer.addPreset('árbol_🌳', {
				name: 'Tree',
				geometry: ['point'],
				tags: { natural: 'tree' },
				fields: [],
			})

			writer.setMetadata({ name: 'Test' })
			writer.finish()

			await pipeline(writer.outputStream, createWriteStream(filepath))

			const reader = new Reader(filepath)
			const presets = await reader.presets()

			assert.ok(presets.has('árbol_🌳'))

			await reader.close()
		})

		test('handles UTF-8 characters in field names and values', async () => {
			const filepath = join(TEST_DIR, 'field-utf8.comapeocat')
			const writer = new Writer()

			writer.addPreset('test', {
				name: 'Test',
				geometry: ['point'],
				tags: { test: 'value' },
				fields: ['espèce'],
			})

			writer.addField('espèce', {
				type: 'text',
				tagKey: 'species',
				label: 'Espèce (UTF-8)',
				placeholder: 'par exemple: Quercus robur',
			})

			writer.setMetadata({ name: 'Test UTF-8' })
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
					'presets.json': { tree: fixtures.presets.tree },
					'defaults.json': fixtures.defaults.point,
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
					'presets.json': { tree: fixtures.presets.tree },
					'defaults.json': fixtures.defaults.point,
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
					'presets.json': { tree: fixtures.presets.tree },
					'defaults.json': fixtures.defaults.point,
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
					'presets.json': { tree: fixtures.presets.tree },
					'defaults.json': fixtures.defaults.point,
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

	describe('Geometry validation', () => {
		test('rejects preset with empty geometry array', async () => {
			const writer = new Writer()

			assert.throws(
				() => {
					writer.addPreset('invalid', {
						name: 'Invalid',
						geometry: [],
						tags: { test: 'value' },
						fields: [],
					})
				},
				{ name: 'ValiError' },
			)
		})

		test('accepts geometry with all three types', async () => {
			const filepath = join(TEST_DIR, 'geometry-all-types.comapeocat')
			const writer = new Writer()

			writer.addPreset('multi', {
				name: 'Multi Geometry',
				geometry: ['point', 'line', 'area'],
				tags: { test: 'value' },
				fields: [],
			})

			writer.setMetadata({ name: 'Test' })
			writer.finish()

			await pipeline(writer.outputStream, createWriteStream(filepath))

			const reader = new Reader(filepath)
			const presets = await reader.presets()

			assert.deepEqual(presets.get('multi').geometry, ['point', 'line', 'area'])

			await reader.close()
		})

		test('rejects invalid geometry type', async () => {
			const writer = new Writer()

			assert.throws(
				() => {
					writer.addPreset('invalid', {
						name: 'Invalid',
						geometry: ['polygon'],
						tags: { test: 'value' },
						fields: [],
					})
				},
				{ name: 'ValiError' },
			)
		})
	})

	describe('Defaults validation', () => {
		test('allows defaults with non-existent preset IDs', async () => {
			const filepath = join(TEST_DIR, 'defaults-nonexistent.comapeocat')
			await createTestZip({
				filepath,
				files: {
					'presets.json': { tree: fixtures.presets.tree },
					'defaults.json': {
						point: ['tree', 'nonexistent'],
						line: [],
						area: [],
					},
					'metadata.json': fixtures.metadata.minimal,
				},
			})

			const reader = new Reader(filepath)
			const defaults = await reader.defaults()

			assert.deepEqual(defaults.point, ['tree', 'nonexistent'])

			await reader.close()
		})

		test('allows preset in defaults without matching geometry', async () => {
			const filepath = join(TEST_DIR, 'defaults-wrong-geometry.comapeocat')
			await createTestZip({
				filepath,
				files: {
					'presets.json': {
						tree: fixtures.presets.tree, // geometry: ['point']
					},
					'defaults.json': {
						point: [],
						line: ['tree'], // tree is point, not line
						area: [],
					},
					'metadata.json': fixtures.metadata.minimal,
				},
			})

			const reader = new Reader(filepath)
			const defaults = await reader.defaults()

			assert.deepEqual(defaults.line, ['tree'])

			await reader.close()
		})

		test('rejects defaults missing required geometry types', async () => {
			const filepath = join(TEST_DIR, 'defaults-missing-type.comapeocat')
			await createTestZip({
				filepath,
				files: {
					'presets.json': { tree: fixtures.presets.tree },
					'defaults.json': {
						point: ['tree'],
						line: [],
						// Missing area
					},
					'metadata.json': fixtures.metadata.minimal,
				},
			})

			const reader = new Reader(filepath)
			await assert.rejects(() => reader.defaults())

			await reader.close()
		})
	})

	describe('Color validation', () => {
		test('accepts 3-digit hex color', async () => {
			const filepath = join(TEST_DIR, 'color-3-digit.comapeocat')
			const writer = new Writer()

			writer.addPreset('test', {
				name: 'Test',
				geometry: ['point'],
				tags: { test: 'value' },
				fields: [],
				color: '#abc',
			})

			writer.setMetadata({ name: 'Test' })
			writer.finish()

			await pipeline(writer.outputStream, createWriteStream(filepath))

			const reader = new Reader(filepath)
			const presets = await reader.presets()

			assert.equal(presets.get('test').color, '#abc')

			await reader.close()
		})

		test('accepts 6-digit hex color', async () => {
			const filepath = join(TEST_DIR, 'color-6-digit.comapeocat')
			const writer = new Writer()

			writer.addPreset('test', {
				name: 'Test',
				geometry: ['point'],
				tags: { test: 'value' },
				fields: [],
				color: '#aabbcc',
			})

			writer.setMetadata({ name: 'Test' })
			writer.finish()

			await pipeline(writer.outputStream, createWriteStream(filepath))

			const reader = new Reader(filepath)
			const presets = await reader.presets()

			assert.equal(presets.get('test').color, '#aabbcc')

			await reader.close()
		})

		test('accepts 8-digit hex color with alpha', async () => {
			const filepath = join(TEST_DIR, 'color-8-digit.comapeocat')
			const writer = new Writer()

			writer.addPreset('test', {
				name: 'Test',
				geometry: ['point'],
				tags: { test: 'value' },
				fields: [],
				color: '#aabbccdd',
			})

			writer.setMetadata({ name: 'Test' })
			writer.finish()

			await pipeline(writer.outputStream, createWriteStream(filepath))

			const reader = new Reader(filepath)
			const presets = await reader.presets()

			assert.equal(presets.get('test').color, '#aabbccdd')

			await reader.close()
		})

		test('accepts uppercase hex color', async () => {
			const filepath = join(TEST_DIR, 'color-uppercase.comapeocat')
			const writer = new Writer()

			writer.addPreset('test', {
				name: 'Test',
				geometry: ['point'],
				tags: { test: 'value' },
				fields: [],
				color: '#AABBCC',
			})

			writer.setMetadata({ name: 'Test' })
			writer.finish()

			await pipeline(writer.outputStream, createWriteStream(filepath))

			const reader = new Reader(filepath)
			const presets = await reader.presets()

			assert.equal(presets.get('test').color, '#AABBCC')

			await reader.close()
		})

		test('rejects invalid hex color', async () => {
			const writer = new Writer()

			assert.throws(
				() => {
					writer.addPreset('test', {
						name: 'Test',
						geometry: ['point'],
						tags: { test: 'value' },
						fields: [],
						color: 'red',
					})
				},
				{ name: 'ValiError' },
			)
		})

		test('rejects hex color without hash', async () => {
			const writer = new Writer()

			assert.throws(
				() => {
					writer.addPreset('test', {
						name: 'Test',
						geometry: ['point'],
						tags: { test: 'value' },
						fields: [],
						color: 'aabbcc',
					})
				},
				{ name: 'ValiError' },
			)
		})

		test('rejects invalid hex digits', async () => {
			const writer = new Writer()

			assert.throws(
				() => {
					writer.addPreset('test', {
						name: 'Test',
						geometry: ['point'],
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
			const writer = new Writer()

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
			const writer = new Writer()

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
			const writer = new Writer()

			writer.addPreset('test', {
				name: 'Test',
				geometry: ['point'],
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

			writer.setMetadata({ name: 'Test' })
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
			const writer = new Writer()

			writer.addPreset('test', {
				name: 'Test',
				geometry: ['point'],
				tags: { test: 'value' },
				fields: [],
			})

			writer.setMetadata({ name: 'Test' })
			writer.finish()

			await pipeline(writer.outputStream, createWriteStream(filepath))

			const reader = new Reader(filepath)
			const metadata = await reader.metadata()

			assert.ok(metadata.name)
			assert.ok(metadata.buildDateValue > 0)

			await reader.close()
		})

		test('rejects metadata with empty name', async () => {
			const writer = new Writer()

			assert.throws(
				() => {
					writer.setMetadata({ name: '' })
				},
				{ name: 'ValiError' },
			)
		})

		test('rejects metadata version exactly 21 characters', async () => {
			const writer = new Writer()

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
			const writer = new Writer()

			writer.addPreset('test', {
				name: 'Test',
				geometry: ['point'],
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
			const writer = new Writer()

			writer.addPreset('test', {
				name: 'Test',
				geometry: ['point'],
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
			const writer = new Writer()

			writer.addPreset('tree', fixtures.presets.tree)

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
					'presets.json': { tree: fixtures.presets.tree },
					'defaults.json': fixtures.defaults.point,
					'metadata.json': fixtures.metadata.minimal,
					'translations/es.json': {
						preset: {
							nonexistent: [{ propertyRef: 'name', message: 'No existe' }],
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
			assert.ok(translations[0].translations.preset.nonexistent)

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
					'presets.json': { tree: fixtures.presets.tree },
					'defaults.json': fixtures.defaults.point,
					'metadata.json': fixtures.metadata.minimal,
					'translations/es.json': {
						preset: {},
						field: {
							nonexistent: [{ propertyRef: 'label', message: 'No existe' }],
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
			const writer = new Writer()

			writer.addPreset('test', {
				name: 'Test',
				geometry: ['point'],
				tags: {
					string_tag: 'value',
					number_tag: 123,
					boolean_tag: true,
					null_tag: null,
					array_string: ['a', 'b', 'c'],
					array_number: [1, 2, 3],
					array_boolean: [true, false],
					array_null: [null, null],
					array_mixed: ['text', 42, true, null],
				},
				fields: [],
			})

			writer.setMetadata({ name: 'Test' })
			writer.finish()

			await pipeline(writer.outputStream, createWriteStream(filepath))

			const reader = new Reader(filepath)
			const presets = await reader.presets()
			const tags = presets.get('test').tags

			assert.equal(tags.string_tag, 'value')
			assert.equal(tags.number_tag, 123)
			assert.equal(tags.boolean_tag, true)
			assert.equal(tags.null_tag, null)
			assert.deepEqual(tags.array_string, ['a', 'b', 'c'])
			assert.deepEqual(tags.array_number, [1, 2, 3])
			assert.deepEqual(tags.array_boolean, [true, false])
			assert.deepEqual(tags.array_null, [null, null])
			assert.deepEqual(tags.array_mixed, ['text', 42, true, null])

			await reader.close()
		})
	})

	describe('Text field appearance', () => {
		test('text field appearance defaults to multiline', async () => {
			const filepath = join(TEST_DIR, 'text-appearance-default.comapeocat')
			const writer = new Writer()

			writer.addPreset('test', {
				name: 'Test',
				geometry: ['point'],
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
			const writer = new Writer()

			writer.addPreset('test', {
				name: 'Test',
				geometry: ['point'],
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
