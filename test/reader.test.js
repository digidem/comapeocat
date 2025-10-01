import { describe, test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { Reader } from '../src/reader.js'
import { mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomBytes } from 'node:crypto'
import { createTestZip, fixtures } from './fixtures.js'

const TEST_DIR = join(
	tmpdir(),
	`comapeo-cat-test-${randomBytes(4).toString('hex')}`,
)

describe('Reader', () => {
	before(() => {
		mkdirSync(TEST_DIR, { recursive: true })
	})

	after(() => {
		rmSync(TEST_DIR, { recursive: true, force: true })
	})

	describe('Version validation', () => {
		test('accepts valid version 1.0', async () => {
			const filepath = join(TEST_DIR, 'version-1.0.comapeocat')
			await createTestZip({
				filepath,
				version: '1.0',
				files: {
					'presets.json': { tree: fixtures.presets.tree },
					'defaults.json': fixtures.defaults.point,
					'metadata.json': fixtures.metadata.minimal,
				},
			})

			const reader = new Reader(filepath)
			await assert.doesNotReject(() => reader.opened())
			await reader.close()
		})

		test('accepts valid version 1.5', async () => {
			const filepath = join(TEST_DIR, 'version-1.5.comapeocat')
			await createTestZip({
				filepath,
				version: '1.5',
				files: {
					'presets.json': { tree: fixtures.presets.tree },
					'defaults.json': fixtures.defaults.point,
					'metadata.json': fixtures.metadata.minimal,
				},
			})

			const reader = new Reader(filepath)
			await assert.doesNotReject(() => reader.opened())
			await reader.close()
		})

		test('rejects version with major > 1', async () => {
			const filepath = join(TEST_DIR, 'version-2.0.comapeocat')
			await createTestZip({
				filepath,
				version: '2.0',
				files: {
					'presets.json': { tree: fixtures.presets.tree },
					'defaults.json': fixtures.defaults.point,
					'metadata.json': fixtures.metadata.minimal,
				},
			})

			const reader = new Reader(filepath)
			await assert.rejects(() => reader.opened(), {
				name: 'UnsupportedFileVersionError',
			})
			await reader.close()
		})

		test('rejects invalid version format', async () => {
			const filepath = join(TEST_DIR, 'version-invalid.comapeocat')
			await createTestZip({
				filepath,
				version: 'invalid',
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

		test('rejects missing VERSION file', async () => {
			const filepath = join(TEST_DIR, 'no-version.comapeocat')
			await createTestZip({
				filepath,
				version: null,
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
	})

	describe('Required files validation', () => {
		test('rejects missing presets.json', async () => {
			const filepath = join(TEST_DIR, 'no-presets.comapeocat')
			await createTestZip({
				filepath,
				files: {
					'defaults.json': { point: [], line: [], area: [] },
					'metadata.json': fixtures.metadata.minimal,
				},
			})

			const reader = new Reader(filepath)
			await assert.rejects(() => reader.opened(), {
				name: 'MissingPresetsError',
			})
			await reader.close()
		})

		test('rejects missing defaults.json', async () => {
			const filepath = join(TEST_DIR, 'no-defaults.comapeocat')
			await createTestZip({
				filepath,
				files: {
					'presets.json': { tree: fixtures.presets.tree },
					'metadata.json': fixtures.metadata.minimal,
				},
			})

			const reader = new Reader(filepath)
			await assert.rejects(() => reader.opened(), {
				name: 'MissingDefaultsError',
			})
			await reader.close()
		})

		test('rejects missing metadata.json', async () => {
			const filepath = join(TEST_DIR, 'no-metadata.comapeocat')
			await createTestZip({
				filepath,
				files: {
					'presets.json': { tree: fixtures.presets.tree },
					'defaults.json': fixtures.defaults.point,
				},
			})

			const reader = new Reader(filepath)
			await assert.rejects(() => reader.opened(), {
				name: 'MissingMetadataError',
			})
			await reader.close()
		})
	})

	describe('Reading data', () => {
		test('reads presets', async () => {
			const filepath = join(TEST_DIR, 'read-presets.comapeocat')
			await createTestZip({
				filepath,
				files: {
					'presets.json': {
						tree: fixtures.presets.tree,
						water: fixtures.presets.water,
					},
					'defaults.json': { point: ['tree'], line: [], area: ['water'] },
					'metadata.json': fixtures.metadata.minimal,
				},
			})

			const reader = new Reader(filepath)
			const presets = await reader.presets()

			assert.equal(presets.size, 2)
			assert.equal(presets.get('tree')?.name, 'Tree')
			assert.deepEqual(presets.get('tree')?.geometry, ['point'])
			assert.equal(presets.get('water')?.name, 'Water')

			await reader.close()
		})

		test('reads fields', async () => {
			const filepath = join(TEST_DIR, 'read-fields.comapeocat')
			await createTestZip({
				filepath,
				files: {
					'presets.json': {
						tree: {
							...fixtures.presets.tree,
							fields: ['species'],
						},
					},
					'fields.json': { species: fixtures.fields.species },
					'defaults.json': fixtures.defaults.point,
					'metadata.json': fixtures.metadata.minimal,
				},
			})

			const reader = new Reader(filepath)
			const fields = await reader.fields()

			assert.equal(fields.size, 1)
			assert.equal(fields.get('species')?.type, 'text')
			assert.equal(fields.get('species')?.label, 'Species')

			await reader.close()
		})

		test('reads empty fields when fields.json missing', async () => {
			const filepath = join(TEST_DIR, 'no-fields.comapeocat')
			await createTestZip({
				filepath,
				files: {
					'presets.json': { tree: fixtures.presets.tree },
					'defaults.json': fixtures.defaults.point,
					'metadata.json': fixtures.metadata.minimal,
				},
			})

			const reader = new Reader(filepath)
			const fields = await reader.fields()

			assert.equal(fields.size, 0)
			await reader.close()
		})

		test('reads defaults', async () => {
			const filepath = join(TEST_DIR, 'read-defaults.comapeocat')
			await createTestZip({
				filepath,
				files: {
					'presets.json': {
						tree: fixtures.presets.tree,
						river: fixtures.presets.river,
					},
					'defaults.json': { point: ['tree'], line: ['river'], area: [] },
					'metadata.json': fixtures.metadata.minimal,
				},
			})

			const reader = new Reader(filepath)
			const defaults = await reader.defaults()

			assert.deepEqual(defaults.point, ['tree'])
			assert.deepEqual(defaults.line, ['river'])
			assert.deepEqual(defaults.area, [])

			await reader.close()
		})

		test('reads metadata', async () => {
			const filepath = join(TEST_DIR, 'read-metadata.comapeocat')
			await createTestZip({
				filepath,
				files: {
					'presets.json': { tree: fixtures.presets.tree },
					'defaults.json': fixtures.defaults.point,
					'metadata.json': fixtures.metadata.complete,
				},
			})

			const reader = new Reader(filepath)
			const metadata = await reader.metadata()

			assert.equal(metadata.name, 'Test Categories')
			assert.equal(metadata.version, '1.2.3')
			assert.equal(metadata.buildDateValue, 1234567890)

			await reader.close()
		})

		test('reads icon names', async () => {
			const filepath = join(TEST_DIR, 'read-icons.comapeocat')
			await createTestZip({
				filepath,
				files: {
					'presets.json': { tree: { ...fixtures.presets.tree, icon: 'tree' } },
					'defaults.json': fixtures.defaults.point,
					'metadata.json': fixtures.metadata.minimal,
					'icons/tree.svg': fixtures.icons.tree,
					'icons/water.svg': fixtures.icons.simple,
				},
			})

			const reader = new Reader(filepath)
			const iconNames = await reader.iconNames()

			assert.equal(iconNames.size, 2)
			assert.ok(iconNames.has('tree'))
			assert.ok(iconNames.has('water'))

			await reader.close()
		})

		test('iterates icons', async () => {
			const filepath = join(TEST_DIR, 'iterate-icons.comapeocat')
			await createTestZip({
				filepath,
				files: {
					'presets.json': { tree: fixtures.presets.tree },
					'defaults.json': fixtures.defaults.point,
					'metadata.json': fixtures.metadata.minimal,
					'icons/tree.svg': fixtures.icons.tree,
				},
			})

			const reader = new Reader(filepath)
			const icons = []
			for await (const icon of reader.icons()) {
				icons.push(icon)
			}

			assert.equal(icons.length, 1)
			assert.equal(icons[0].name, 'tree')
			assert.ok(icons[0].iconXml.includes('<svg'))

			await reader.close()
		})

		test('iterates translations', async () => {
			const filepath = join(TEST_DIR, 'iterate-translations.comapeocat')
			await createTestZip({
				filepath,
				files: {
					'presets.json': { tree: fixtures.presets.tree },
					'defaults.json': fixtures.defaults.point,
					'metadata.json': fixtures.metadata.minimal,
					'translations/es.json': fixtures.translations.es,
					'translations/fr.json': fixtures.translations.fr,
				},
			})

			const reader = new Reader(filepath)
			const translations = []
			for await (const translation of reader.translations()) {
				translations.push(translation)
			}

			assert.equal(translations.length, 2)
			const langs = translations.map((t) => t.lang).sort()
			assert.deepEqual(langs, ['es', 'fr'])

			await reader.close()
		})

		test('ignores invalid BCP 47 translation files', async () => {
			const filepath = join(TEST_DIR, 'invalid-bcp47.comapeocat')
			await createTestZip({
				filepath,
				files: {
					'presets.json': { tree: fixtures.presets.tree },
					'defaults.json': fixtures.defaults.point,
					'metadata.json': fixtures.metadata.minimal,
					'translations/es.json': fixtures.translations.es,
					'translations/invalid!!.json': {
						preset: {
							tree: [{ propertyRef: 'name', message: 'Should be ignored' }],
						},
						field: {},
					},
				},
			})

			const reader = new Reader(filepath)
			const translations = []
			for await (const translation of reader.translations()) {
				translations.push(translation)
			}

			assert.equal(translations.length, 1)
			assert.equal(translations[0].lang, 'es')

			await reader.close()
		})
	})

	describe('Validation', () => {
		test('validate() passes for valid file', async () => {
			const filepath = join(TEST_DIR, 'validate-valid.comapeocat')
			await createTestZip({
				filepath,
				files: {
					'presets.json': { tree: fixtures.presets.treeWithFields },
					'fields.json': {
						species: fixtures.fields.species,
						height: fixtures.fields.height,
					},
					'defaults.json': fixtures.defaults.point,
					'metadata.json': fixtures.metadata.minimal,
					'icons/tree.svg': fixtures.icons.tree,
				},
			})

			const reader = new Reader(filepath)
			await assert.doesNotReject(() => reader.validate())
			await reader.close()
		})

		test('validate() rejects missing field reference', async () => {
			const filepath = join(TEST_DIR, 'validate-missing-field.comapeocat')
			await createTestZip({
				filepath,
				files: {
					'presets.json': {
						tree: {
							...fixtures.presets.tree,
							fields: ['nonexistent'],
						},
					},
					'defaults.json': fixtures.defaults.point,
					'metadata.json': fixtures.metadata.minimal,
				},
			})

			const reader = new Reader(filepath)
			await assert.rejects(() => reader.validate(), {
				name: 'PresetRefError',
			})
			await reader.close()
		})

		test('validate() rejects missing icon reference', async () => {
			const filepath = join(TEST_DIR, 'validate-missing-icon.comapeocat')
			await createTestZip({
				filepath,
				files: {
					'presets.json': {
						tree: {
							...fixtures.presets.tree,
							icon: 'nonexistent',
						},
					},
					'defaults.json': fixtures.defaults.point,
					'metadata.json': fixtures.metadata.minimal,
				},
			})

			const reader = new Reader(filepath)
			await assert.rejects(() => reader.validate(), {
				name: 'PresetRefError',
			})
			await reader.close()
		})
	})

	describe('Caching', () => {
		test('presets are cached', async () => {
			const filepath = join(TEST_DIR, 'cache-presets.comapeocat')
			await createTestZip({
				filepath,
				files: {
					'presets.json': { tree: fixtures.presets.tree },
					'defaults.json': fixtures.defaults.point,
					'metadata.json': fixtures.metadata.minimal,
				},
			})

			const reader = new Reader(filepath)
			const presets1 = await reader.presets()
			const presets2 = await reader.presets()

			assert.equal(presets1, presets2)
			await reader.close()
		})

		test('fields are cached', async () => {
			const filepath = join(TEST_DIR, 'cache-fields.comapeocat')
			await createTestZip({
				filepath,
				files: {
					'presets.json': {
						tree: {
							...fixtures.presets.tree,
							fields: ['species'],
						},
					},
					'fields.json': { species: fixtures.fields.species },
					'defaults.json': fixtures.defaults.point,
					'metadata.json': fixtures.metadata.minimal,
				},
			})

			const reader = new Reader(filepath)
			const fields1 = await reader.fields()
			const fields2 = await reader.fields()

			assert.equal(fields1, fields2)
			await reader.close()
		})
	})

	describe('Schema validation', () => {
		test('rejects invalid preset schema', async () => {
			const filepath = join(TEST_DIR, 'invalid-preset-schema.comapeocat')
			await createTestZip({
				filepath,
				files: {
					'presets.json': {
						tree: { name: 'Tree' }, // Missing required fields
					},
					'defaults.json': fixtures.defaults.point,
					'metadata.json': fixtures.metadata.minimal,
				},
			})

			const reader = new Reader(filepath)
			await assert.rejects(() => reader.presets())
			await reader.close()
		})

		test('rejects invalid metadata schema - name too long', async () => {
			const filepath = join(TEST_DIR, 'invalid-metadata-name.comapeocat')
			await createTestZip({
				filepath,
				files: {
					'presets.json': { tree: fixtures.presets.tree },
					'defaults.json': fixtures.defaults.point,
					'metadata.json': {
						name: 'A'.repeat(101),
						buildDateValue: 1000000,
					},
				},
			})

			const reader = new Reader(filepath)
			await assert.rejects(() => reader.metadata())
			await reader.close()
		})

		test('rejects invalid JSON', async () => {
			const filepath = join(TEST_DIR, 'invalid-json.comapeocat')
			await createTestZip({
				filepath,
				files: {
					'presets.json': '{ invalid json }',
					'defaults.json': { point: [], line: [], area: [] },
					'metadata.json': fixtures.metadata.minimal,
				},
			})

			const reader = new Reader(filepath)
			await assert.rejects(() => reader.presets())
			await reader.close()
		})
	})
})
