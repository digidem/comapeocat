// @ts-nocheck
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { describe, test, before, after } from 'node:test'
import { fileURLToPath } from 'node:url'

import { execa } from 'execa'

import { Reader } from '../src/reader.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURES_DIR = join(__dirname, 'fixtures', 'build')
const CLI_PATH = join(__dirname, '..', 'bin', 'comapeocat-build.mjs')

const TEST_DIR = join(
	tmpdir(),
	`comapeo-cat-test-${randomBytes(4).toString('hex')}`,
)

describe('CLI build command', () => {
	before(() => {
		mkdirSync(TEST_DIR, { recursive: true })
	})

	after(() => {
		rmSync(TEST_DIR, { recursive: true, force: true })
	})

	test('should build valid comapeocat file from complete fixture', async () => {
		const fixturePath = join(FIXTURES_DIR, 'complete')
		const outputPath = join(TEST_DIR, 'complete.comapeocat')

		const { exitCode } = await execa('node', [
			CLI_PATH,
			fixturePath,
			'--output',
			outputPath,
		])
		assert.equal(exitCode, 0)

		// Verify the file is valid by reading it
		const reader = new Reader(outputPath)
		await reader.opened()

		const categories = await reader.categories()
		assert.equal(categories.size, 2)

		const fields = await reader.fields()
		assert.equal(fields.size, 2)

		const iconNames = await reader.iconNames()
		assert.equal(iconNames.size, 2)

		const categorySelection = await reader.categorySelection()
		assert.equal(categorySelection.point.length, 1)
		assert.equal(categorySelection.line.length, 1)
		assert.equal(categorySelection.area.length, 0)

		const metadata = await reader.metadata()
		assert.equal(metadata.name, 'Complete Build Test')

		await reader.close()
	})

	test('should auto-generate categorySelection.json when missing', async () => {
		const fixturePath = join(FIXTURES_DIR, 'no-categorySelection')
		const outputPath = join(TEST_DIR, 'no-categorySelection.comapeocat')

		const { exitCode } = await execa('node', [
			CLI_PATH,
			fixturePath,
			'--output',
			outputPath,
		])
		assert.equal(exitCode, 0)

		// Verify categorySelection was auto-generated
		const reader = new Reader(outputPath)
		await reader.opened()

		const categorySelection = await reader.categorySelection()
		const categories = await reader.categories()

		// Check that categorySelection exists for each geometry type
		assert.ok(Array.isArray(categorySelection.point))
		assert.ok(Array.isArray(categorySelection.line))
		assert.ok(Array.isArray(categorySelection.area))

		// Verify that the generated categorySelection reference existing categories
		for (const categoryId of categorySelection.point) {
			assert.ok(categories.has(categoryId))
		}
		for (const categoryId of categorySelection.line) {
			assert.ok(categories.has(categoryId))
		}
		for (const categoryId of categorySelection.area) {
			assert.ok(categories.has(categoryId))
		}

		await reader.close()
	})

	test('should use deprecated sort field to determine categorySelection order', async () => {
		const fixturePath = join(FIXTURES_DIR, 'with-sort')
		const outputPath = join(TEST_DIR, 'with-sort.comapeocat')

		const { exitCode } = await execa('node', [
			CLI_PATH,
			fixturePath,
			'--output',
			outputPath,
		])
		assert.equal(exitCode, 0)

		// Verify that categorySelection is ordered by sort field
		const reader = new Reader(outputPath)
		await reader.opened()

		const categorySelection = await reader.categorySelection()

		// All three presets have geometry: ['point'] and sort values 1, 2, 3
		// So categorySelection.point should be ordered by sort: preset2, preset3, preset1
		assert.equal(categorySelection.point.length, 3)
		assert.equal(categorySelection.point[0], 'preset2') // sort: 1
		assert.equal(categorySelection.point[1], 'preset3') // sort: 2
		assert.equal(categorySelection.point[2], 'preset1') // sort: 3

		await reader.close()
	})

	test('should accept --name and --version options', async () => {
		const fixturePath = join(FIXTURES_DIR, 'complete')
		const outputPath = join(TEST_DIR, 'with-options.comapeocat')

		const { exitCode } = await execa('node', [
			CLI_PATH,
			fixturePath,
			'--output',
			outputPath,
			'--name',
			'Custom Name',
			'--version',
			'2.0.0',
		])
		assert.equal(exitCode, 0)

		// Verify metadata was overridden
		const reader = new Reader(outputPath)
		await reader.opened()

		const metadata = await reader.metadata()
		assert.equal(metadata.name, 'Custom Name')
		assert.equal(metadata.version, '2.0.0')

		await reader.close()
	})

	test('should validate and throw error for missing field reference', async () => {
		const fixturePath = join(
			FIXTURES_DIR,
			'..',
			'lint',
			'invalid',
			'missing-field-ref',
		)
		const outputPath = join(TEST_DIR, 'invalid.comapeocat')

		await assert.rejects(
			() =>
				execa('node', [
					CLI_PATH,
					fixturePath,
					'--output',
					outputPath,
					'--name',
					'Test',
				]),
			(error) => {
				assert.equal(error.exitCode, 1)
				assert.match(error.stderr, /Missing field ref/)
				return true
			},
		)
	})

	test('should support backwards compatibility with presets folder', async () => {
		const fixturePath = join(FIXTURES_DIR, 'backwards-compat-presets')
		const outputPath = join(TEST_DIR, 'backwards-compat.comapeocat')

		const { exitCode } = await execa('node', [
			CLI_PATH,
			fixturePath,
			'--output',
			outputPath,
			'--name',
			'Backwards Compat Test',
		])
		assert.equal(exitCode, 0)

		// Verify the file is valid by reading it
		const reader = new Reader(outputPath)
		await reader.opened()

		const categories = await reader.categories()
		assert.ok(
			categories.size > 0,
			'Should have loaded categories from presets folder',
		)

		await reader.close()
	})
})
