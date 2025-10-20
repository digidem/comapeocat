import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, test, before, after } from 'node:test'

import { Reader } from '../src/reader.js'
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
					'categories.json': { tree: fixtures.categories.tree },
					'categorySelection.json': fixtures.categorySelection.observation,
					'metadata.json': fixtures.metadata.minimal,
				},
			})

			const reader = new Reader(filepath)
			await assert.doesNotReject(() => reader.opened())
			assert.equal(await reader.fileVersion(), '1.0')
			await reader.close()
		})

		test('accepts valid version 1.5', async () => {
			const filepath = join(TEST_DIR, 'version-1.5.comapeocat')
			await createTestZip({
				filepath,
				version: '1.5',
				files: {
					'categories.json': { tree: fixtures.categories.tree },
					'categorySelection.json': fixtures.categorySelection.observation,
					'metadata.json': fixtures.metadata.minimal,
				},
			})

			const reader = new Reader(filepath)
			await assert.doesNotReject(() => reader.opened())
			assert.equal(await reader.fileVersion(), '1.5')
			await reader.close()
		})

		test('rejects version with major > 1', async () => {
			const filepath = join(TEST_DIR, 'version-2.0.comapeocat')
			await createTestZip({
				filepath,
				version: '2.0',
				files: {
					'categories.json': { tree: fixtures.categories.tree },
					'categorySelection.json': fixtures.categorySelection.observation,
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

		test('rejects missing VERSION file', async () => {
			const filepath = join(TEST_DIR, 'no-version.comapeocat')
			await createTestZip({
				filepath,
				version: null,
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
	})

	describe('Required files validation', () => {
		test('rejects missing categories.json', async () => {
			const filepath = join(TEST_DIR, 'no-categories.comapeocat')
			await createTestZip({
				filepath,
				files: {
					'categorySelection.json': { observation: [], track: [] },
					'metadata.json': fixtures.metadata.minimal,
				},
			})

			const reader = new Reader(filepath)
			await assert.rejects(() => reader.opened(), {
				name: 'MissingCategoriesError',
			})
			await reader.close()
		})

		test('rejects missing categorySelection.json', async () => {
			const filepath = join(TEST_DIR, 'no-categorySelection.comapeocat')
			await createTestZip({
				filepath,
				files: {
					'categories.json': { tree: fixtures.categories.tree },
					'metadata.json': fixtures.metadata.minimal,
				},
			})

			const reader = new Reader(filepath)
			await assert.rejects(() => reader.opened(), {
				name: 'MissingCategorySelectionError',
			})
			await reader.close()
		})

		test('rejects missing metadata.json', async () => {
			const filepath = join(TEST_DIR, 'no-metadata.comapeocat')
			await createTestZip({
				filepath,
				files: {
					'categories.json': { tree: fixtures.categories.tree },
					'categorySelection.json': fixtures.categorySelection.observation,
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
		test('reads categories', async () => {
			const filepath = join(TEST_DIR, 'read-categories.comapeocat')
			await createTestZip({
				filepath,
				files: {
					'categories.json': {
						tree: fixtures.categories.tree,
						water: fixtures.categories.water,
					},
					'categorySelection.json': {
						observation: ['tree'],
						track: ['water'],
					},
					'metadata.json': fixtures.metadata.minimal,
				},
			})

			const reader = new Reader(filepath)
			const categories = await reader.categories()

			assert.equal(categories.size, 2)
			assert.equal(categories.get('tree')?.name, 'Tree')
			assert.deepEqual(categories.get('tree')?.appliesTo, [
				'observation',
				'track',
			])
			assert.equal(categories.get('water')?.name, 'Water')

			await reader.close()
		})

		test('reads fields', async () => {
			const filepath = join(TEST_DIR, 'read-fields.comapeocat')
			await createTestZip({
				filepath,
				files: {
					'categories.json': {
						tree: {
							...fixtures.categories.tree,
							fields: ['species'],
						},
					},
					'fields.json': { species: fixtures.fields.species },
					'categorySelection.json': fixtures.categorySelection.observation,
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
					'categories.json': { tree: fixtures.categories.tree },
					'categorySelection.json': fixtures.categorySelection.observation,
					'metadata.json': fixtures.metadata.minimal,
				},
			})

			const reader = new Reader(filepath)
			const fields = await reader.fields()

			assert.equal(fields.size, 0)
			await reader.close()
		})

		test('reads categorySelection', async () => {
			const filepath = join(TEST_DIR, 'read-categorySelection.comapeocat')
			await createTestZip({
				filepath,
				files: {
					'categories.json': {
						tree: fixtures.categories.tree,
						river: fixtures.categories.river,
					},
					'categorySelection.json': {
						observation: ['tree'],
						track: ['river'],
					},
					'metadata.json': fixtures.metadata.minimal,
				},
			})

			const reader = new Reader(filepath)
			const categorySelection = await reader.categorySelection()

			assert.deepEqual(categorySelection.observation, ['tree'])
			assert.deepEqual(categorySelection.track, ['river'])

			await reader.close()
		})

		test('reads metadata', async () => {
			const filepath = join(TEST_DIR, 'read-metadata.comapeocat')
			await createTestZip({
				filepath,
				files: {
					'categories.json': { tree: fixtures.categories.tree },
					'categorySelection.json': fixtures.categorySelection.observation,
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

		test('reads metadata with builder fields', async () => {
			const filepath = join(TEST_DIR, 'read-metadata-builder.comapeocat')
			await createTestZip({
				filepath,
				files: {
					'categories.json': { tree: fixtures.categories.tree },
					'categorySelection.json': fixtures.categorySelection.observation,
					'metadata.json': fixtures.metadata.withBuilder,
				},
			})

			const reader = new Reader(filepath)
			const metadata = await reader.metadata()

			assert.equal(metadata.name, 'Test Categories')
			assert.equal(metadata.version, '1.2.3')
			assert.equal(metadata.buildDateValue, 1234567890)
			assert.equal(metadata.builderName, 'comapeocat')
			assert.equal(metadata.builderVersion, '1.0.0')

			await reader.close()
		})

		test('reads icon names', async () => {
			const filepath = join(TEST_DIR, 'read-icons.comapeocat')
			await createTestZip({
				filepath,
				files: {
					'categories.json': {
						tree: { ...fixtures.categories.tree, icon: 'tree' },
					},
					'categorySelection.json': fixtures.categorySelection.observation,
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
					'categories.json': { tree: fixtures.categories.tree },
					'categorySelection.json': fixtures.categorySelection.observation,
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

		test('gets icon by ID', async () => {
			const filepath = join(TEST_DIR, 'get-icon.comapeocat')
			await createTestZip({
				filepath,
				files: {
					'categories.json': {
						tree: { ...fixtures.categories.tree, icon: 'tree' },
					},
					'categorySelection.json': fixtures.categorySelection.observation,
					'metadata.json': fixtures.metadata.minimal,
					'icons/tree.svg': fixtures.icons.tree,
					'icons/water.svg': fixtures.icons.simple,
				},
			})

			const reader = new Reader(filepath)

			const treeIcon = await reader.getIcon('tree')
			assert.ok(treeIcon)
			assert.ok(treeIcon.includes('<svg'))

			const waterIcon = await reader.getIcon('water')
			assert.ok(waterIcon)
			assert.ok(waterIcon.includes('<svg'))

			await reader.close()
		})

		test('returns null for non-existent icon', async () => {
			const filepath = join(TEST_DIR, 'get-missing-icon.comapeocat')
			await createTestZip({
				filepath,
				files: {
					'categories.json': { tree: fixtures.categories.tree },
					'categorySelection.json': fixtures.categorySelection.observation,
					'metadata.json': fixtures.metadata.minimal,
					'icons/tree.svg': fixtures.icons.tree,
				},
			})

			const reader = new Reader(filepath)
			const icon = await reader.getIcon('nonexistent')

			assert.equal(icon, null)

			await reader.close()
		})

		test('iterates translations', async () => {
			const filepath = join(TEST_DIR, 'iterate-translations.comapeocat')
			await createTestZip({
				filepath,
				files: {
					'categories.json': { tree: fixtures.categories.tree },
					'categorySelection.json': fixtures.categorySelection.observation,
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
					'categories.json': { tree: fixtures.categories.tree },
					'categorySelection.json': fixtures.categorySelection.observation,
					'metadata.json': fixtures.metadata.minimal,
					'translations/es.json': fixtures.translations.es,
					'translations/invalid!!.json': {
						category: {
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
					'categories.json': {
						tree: fixtures.categories.treeWithFields,
						river: fixtures.categories.river,
					},
					'fields.json': {
						species: fixtures.fields.species,
						height: fixtures.fields.height,
					},
					'categorySelection.json': fixtures.categorySelection.observation,
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
					'categories.json': {
						tree: {
							...fixtures.categories.tree,
							fields: ['nonexistent'],
						},
					},
					'categorySelection.json': fixtures.categorySelection.observation,
					'metadata.json': fixtures.metadata.minimal,
				},
			})

			const reader = new Reader(filepath)
			await assert.rejects(() => reader.validate(), {
				name: 'CategoryRefError',
			})
			await reader.close()
		})

		test('validate() rejects missing icon reference', async () => {
			const filepath = join(TEST_DIR, 'validate-missing-icon.comapeocat')
			await createTestZip({
				filepath,
				files: {
					'categories.json': {
						tree: {
							...fixtures.categories.tree,
							icon: 'nonexistent',
						},
					},
					'categorySelection.json': fixtures.categorySelection.observation,
					'metadata.json': fixtures.metadata.minimal,
				},
			})

			const reader = new Reader(filepath)
			await assert.rejects(() => reader.validate(), {
				name: 'CategoryRefError',
			})
			await reader.close()
		})

		test('validate() rejects categories with no observation categories', async () => {
			const filepath = join(TEST_DIR, 'validate-no-observation-cats.comapeocat')
			await createTestZip({
				filepath,
				files: {
					'categories.json': {
						river: {
							...fixtures.categories.river,
							appliesTo: ['track'],
						},
					},
					'categorySelection.json': {
						// Add invalid ref here so we don't trigger a different error
						observation: ['_placeholder_'],
						track: ['river'],
					},
					'metadata.json': fixtures.metadata.minimal,
				},
			})

			const reader = new Reader(filepath)
			await assert.rejects(() => reader.validate(), {
				name: 'MissingCategoriesError',
				message: 'No categories found which apply to observation documents',
			})
			await reader.close()
		})

		test('validate() rejects categories with no track categories', async () => {
			const filepath = join(TEST_DIR, 'validate-no-track-cats.comapeocat')
			await createTestZip({
				filepath,
				files: {
					'categories.json': {
						tree: {
							...fixtures.categories.tree,
							appliesTo: ['observation'],
						},
					},
					'categorySelection.json': {
						observation: ['tree'],
						// Add invalid ref here so we don't trigger a different error
						track: ['_placeholder_'],
					},
					'metadata.json': fixtures.metadata.minimal,
				},
			})

			const reader = new Reader(filepath)
			await assert.rejects(() => reader.validate(), {
				name: 'MissingCategoriesError',
				message: 'No categories found which apply to track documents',
			})
			await reader.close()
		})
	})

	describe('Caching', () => {
		test('categories are cached', async () => {
			const filepath = join(TEST_DIR, 'cache-categories.comapeocat')
			await createTestZip({
				filepath,
				files: {
					'categories.json': { tree: fixtures.categories.tree },
					'categorySelection.json': fixtures.categorySelection.observation,
					'metadata.json': fixtures.metadata.minimal,
				},
			})

			const reader = new Reader(filepath)
			const categories1 = await reader.categories()
			const categories2 = await reader.categories()

			assert.equal(categories1, categories2)
			await reader.close()
		})

		test('fields are cached', async () => {
			const filepath = join(TEST_DIR, 'cache-fields.comapeocat')
			await createTestZip({
				filepath,
				files: {
					'categories.json': {
						tree: {
							...fixtures.categories.tree,
							fields: ['species'],
						},
					},
					'fields.json': { species: fixtures.fields.species },
					'categorySelection.json': fixtures.categorySelection.observation,
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
		test('rejects invalid category schema', async () => {
			const filepath = join(TEST_DIR, 'invalid-category-schema.comapeocat')
			await createTestZip({
				filepath,
				files: {
					'categories.json': {
						tree: { name: 'Tree' }, // Missing required fields
					},
					'categorySelection.json': fixtures.categorySelection.observation,
					'metadata.json': fixtures.metadata.minimal,
				},
			})

			const reader = new Reader(filepath)
			await assert.rejects(() => reader.categories())
			await reader.close()
		})

		test('rejects invalid metadata schema - name too long', async () => {
			const filepath = join(TEST_DIR, 'invalid-metadata-name.comapeocat')
			await createTestZip({
				filepath,
				files: {
					'categories.json': { tree: fixtures.categories.tree },
					'categorySelection.json': fixtures.categorySelection.observation,
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
					'categories.json': '{ invalid json }',
					'categorySelection.json': { observation: [], track: [] },
					'metadata.json': fixtures.metadata.minimal,
				},
			})

			const reader = new Reader(filepath)
			await assert.rejects(() => reader.categories())
			await reader.close()
		})
	})
})
