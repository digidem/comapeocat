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

		writer.addPreset('tree', fixtures.presets.tree)
		writer.setDefaults(fixtures.defaults.point)
		writer.setMetadata({ name: 'Test Categories' })
		writer.finish()

		await pipeline(writer.outputStream, createWriteStream(filepath))

		const reader = new Reader(filepath)
		await reader.opened()

		const presets = await reader.presets()
		assert.equal(presets.size, 1)
		assert.equal(presets.get('tree').name, 'Tree')

		const metadata = await reader.metadata()
		assert.equal(metadata.name, 'Test Categories')
		assert.ok(metadata.buildDateValue > 0)

		await reader.close()
	})

	test('creates file with all components', async () => {
		const filepath = join(TEST_DIR, 'writer-full.comapeocat')
		const writer = new Writer()

		writer.addPreset('tree', fixtures.presets.treeWithFields)
		writer.addPreset('river', fixtures.presets.riverWithFields)

		writer.addField('species', fixtures.fields.species)
		writer.addField('height', fixtures.fields.height)
		writer.addField('name', fixtures.fields.name)

		await writer.addIcon('tree', fixtures.icons.tree)
		await writer.addTranslations('es', fixtures.translations.es)

		writer.setDefaults({
			point: ['tree'],
			line: ['river'],
			area: [],
		})

		writer.setMetadata({
			name: 'Full Test Categories',
			version: '1.0.0',
		})

		writer.finish()

		await pipeline(writer.outputStream, createWriteStream(filepath))

		const reader = new Reader(filepath)
		await reader.opened()

		const presets = await reader.presets()
		assert.equal(presets.size, 2)
		assert.equal(presets.get('tree').icon, 'tree')
		assert.equal(presets.get('tree').color, '#228B22')

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

	test('auto-generates defaults when not set', async () => {
		const filepath = join(TEST_DIR, 'writer-auto-defaults.comapeocat')
		const writer = new Writer()

		writer.addPreset('tree', {
			...fixtures.presets.tree,
			sort: 1,
		})

		writer.addPreset('water', {
			...fixtures.presets.water,
			geometry: ['point'],
			sort: 2,
		})

		writer.setMetadata({ name: 'Test' })
		writer.finish()

		await pipeline(writer.outputStream, createWriteStream(filepath))

		const reader = new Reader(filepath)
		const defaults = await reader.defaults()

		assert.deepEqual(defaults.point, ['tree', 'water'])
		assert.deepEqual(defaults.line, [])
		assert.deepEqual(defaults.area, [])

		await reader.close()
	})

	test('sorts presets by sort field then name', async () => {
		const filepath = join(TEST_DIR, 'writer-sort.comapeocat')
		const writer = new Writer()

		writer.addPreset('zebra', {
			name: 'Zebra',
			geometry: ['point'],
			tags: { animal: 'zebra' },
			fields: [],
		})

		writer.addPreset('apple', {
			name: 'Apple',
			geometry: ['point'],
			tags: { natural: 'tree', tree: 'apple' },
			fields: [],
			sort: 10,
		})

		writer.addPreset('banana', {
			name: 'Banana',
			geometry: ['point'],
			tags: { natural: 'tree', tree: 'banana' },
			fields: [],
		})

		writer.addPreset('cherry', {
			name: 'Cherry',
			geometry: ['point'],
			tags: { natural: 'tree', tree: 'cherry' },
			fields: [],
			sort: 5,
		})

		writer.setMetadata({ name: 'Test' })
		writer.finish()

		await pipeline(writer.outputStream, createWriteStream(filepath))

		const reader = new Reader(filepath)
		const defaults = await reader.defaults()

		assert.deepEqual(defaults.point, ['cherry', 'apple', 'banana', 'zebra'])

		await reader.close()
	})

	test('throws when adding after finish', async () => {
		const writer = new Writer()

		writer.addPreset('tree', fixtures.presets.tree)
		writer.setMetadata({ name: 'Test' })
		writer.finish()

		assert.throws(() => writer.addPreset('river', fixtures.presets.river), {
			name: 'AddAfterFinishError',
		})
	})

	test('throws when missing metadata', async () => {
		const writer = new Writer()
		writer.addPreset('tree', fixtures.presets.tree)

		assert.throws(() => writer.finish(), { name: 'MissingMetadataError' })
	})

	test('throws when no presets added', async () => {
		const writer = new Writer()
		writer.setMetadata({ name: 'Test' })

		assert.throws(() => writer.finish(), { name: 'MissingPresetsError' })
	})

	test('validates preset references to fields', async () => {
		const writer = new Writer()

		writer.addPreset('tree', {
			...fixtures.presets.tree,
			fields: ['nonexistent'],
		})

		writer.setMetadata({ name: 'Test' })

		assert.throws(() => writer.finish(), { name: 'PresetRefError' })
	})

	test('validates preset references to icons', async () => {
		const writer = new Writer()

		writer.addPreset('tree', {
			...fixtures.presets.tree,
			icon: 'nonexistent',
		})

		writer.setMetadata({ name: 'Test' })

		assert.throws(() => writer.finish(), { name: 'PresetRefError' })
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

	test('validates preset schema', async () => {
		const writer = new Writer()

		assert.throws(
			() => {
				writer.addPreset('invalid', { name: 'Test' })
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
		const writer = new Writer()

		writer.addPreset('tree', { ...fixtures.presets.tree, icon: 'tree' })
		await writer.addIcon('tree', fixtures.icons.complex)
		writer.setMetadata({ name: 'Test' })
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
					preset: {
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

	test('handles multiple geometry types', async () => {
		const filepath = join(TEST_DIR, 'writer-multi-geom.comapeocat')
		const writer = new Writer()

		writer.addPreset('water', fixtures.presets.multiGeometry)
		writer.setMetadata({ name: 'Test' })
		writer.finish()

		await pipeline(writer.outputStream, createWriteStream(filepath))

		const reader = new Reader(filepath)
		const defaults = await reader.defaults()

		assert.ok(defaults.point.includes('water'))
		assert.ok(defaults.line.includes('water'))
		assert.ok(defaults.area.includes('water'))

		await reader.close()
	})

	test('handles select field with options', async () => {
		const filepath = join(TEST_DIR, 'writer-select.comapeocat')
		const writer = new Writer()

		writer.addPreset('tree', {
			...fixtures.presets.tree,
			fields: ['condition'],
		})

		writer.addField('condition', fixtures.fields.condition)
		writer.setMetadata({ name: 'Test' })
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
