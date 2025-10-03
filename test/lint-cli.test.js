// @ts-nocheck
import assert from 'node:assert/strict'
import { join, dirname } from 'node:path'
import { describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'

import { execa } from 'execa'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURES_DIR = join(__dirname, 'fixtures', 'lint')
const CLI_PATH = join(__dirname, '..', 'bin', 'comapeocat-lint.mjs')

describe('CLI lint command', () => {
	describe('valid fixtures', () => {
		test('should succeed for minimal valid fixture', async () => {
			const fixturePath = join(FIXTURES_DIR, 'valid', 'minimal')
			const { exitCode } = await execa('node', [CLI_PATH, fixturePath])
			assert.equal(exitCode, 0)
		})

		test('should succeed for complete valid fixture', async () => {
			const fixturePath = join(FIXTURES_DIR, 'valid', 'complete')
			const { exitCode } = await execa('node', [CLI_PATH, fixturePath])
			assert.equal(exitCode, 0)
		})
	})

	describe('invalid fixtures - missing references', () => {
		test('should throw PresetRefError for missing field reference', async () => {
			const fixturePath = join(FIXTURES_DIR, 'invalid', 'missing-field-ref')
			await assert.rejects(
				() => execa('node', [CLI_PATH, fixturePath]),
				(error) => {
					assert.equal(error.exitCode, 1)
					assert.match(error.stderr, /Missing field ref: "nonexistent_field"/)
					return true
				},
			)
		})

		test('should throw PresetRefError for missing icon reference', async () => {
			const fixturePath = join(FIXTURES_DIR, 'invalid', 'missing-icon-ref')
			await assert.rejects(
				() => execa('node', [CLI_PATH, fixturePath]),
				(error) => {
					assert.equal(error.exitCode, 1)
					assert.match(error.stderr, /Missing icon ref: "missing_icon"/)
					return true
				},
			)
		})

		test('should throw DefaultsRefError for missing preset in defaults', async () => {
			const fixturePath = join(
				FIXTURES_DIR,
				'invalid',
				'defaults-missing-preset',
			)
			await assert.rejects(
				() => execa('node', [CLI_PATH, fixturePath]),
				(error) => {
					assert.equal(error.exitCode, 1)
					assert.match(error.stderr, /Preset "nonexistent_preset"/)
					return true
				},
			)
		})

		test('should throw InvalidDefaultsError for invalid geometry in defaults', async () => {
			const fixturePath = join(
				FIXTURES_DIR,
				'invalid',
				'defaults-invalid-geometry',
			)
			await assert.rejects(
				() => execa('node', [CLI_PATH, fixturePath]),
				(error) => {
					assert.equal(error.exitCode, 1)
					assert.match(
						error.stderr,
						/does not include "point" in its geometry array/,
					)
					return true
				},
			)
		})
	})

	describe('invalid fixtures - schema validation', () => {
		test('should throw SchemaError for invalid preset schema', async () => {
			const fixturePath = join(FIXTURES_DIR, 'invalid', 'invalid-preset-schema')
			await assert.rejects(
				() => execa('node', [CLI_PATH, fixturePath]),
				(error) => {
					assert.equal(error.exitCode, 1)
					assert.match(error.stderr, /Error in file/)
					return true
				},
			)
		})

		test('should throw SchemaError for invalid field schema', async () => {
			const fixturePath = join(FIXTURES_DIR, 'invalid', 'invalid-field-schema')
			await assert.rejects(
				() => execa('node', [CLI_PATH, fixturePath]),
				(error) => {
					assert.equal(error.exitCode, 1)
					assert.match(error.stderr, /Error in file/)
					return true
				},
			)
		})
	})
})
