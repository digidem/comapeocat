// @ts-nocheck
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { DuplicateTagsError } from '../src/lib/errors.js'
import { validatePresetTags } from '../src/lib/validate-preset-tags.js'

describe('validatePresetTags', () => {
	test('accepts presets with unique tags', () => {
		const presetsMap = new Map([
			[
				'tree',
				{
					name: 'Tree',
					geometry: ['point'],
					tags: { natural: 'tree' },
					fields: [],
				},
			],
			[
				'water',
				{
					name: 'Water',
					geometry: ['area'],
					tags: { natural: 'water' },
					fields: [],
				},
			],
			[
				'building',
				{
					name: 'Building',
					geometry: ['area'],
					tags: { building: 'yes' },
					fields: [],
				},
			],
		])

		assert.doesNotThrow(() => validatePresetTags(presetsMap))
	})

	test('rejects two presets with identical tags', () => {
		const presetsMap = new Map([
			[
				'tree1',
				{
					name: 'Tree 1',
					geometry: ['point'],
					tags: { natural: 'tree' },
					fields: [],
				},
			],
			[
				'tree2',
				{
					name: 'Tree 2',
					geometry: ['point'],
					tags: { natural: 'tree' },
					fields: [],
				},
			],
		])

		assert.throws(() => validatePresetTags(presetsMap), DuplicateTagsError)
	})

	test('rejects three presets with identical tags', () => {
		const presetsMap = new Map([
			[
				'tree1',
				{
					name: 'Tree 1',
					geometry: ['point'],
					tags: { natural: 'tree' },
					fields: [],
				},
			],
			[
				'tree2',
				{
					name: 'Tree 2',
					geometry: ['point'],
					tags: { natural: 'tree' },
					fields: [],
				},
			],
			[
				'tree3',
				{
					name: 'Tree 3',
					geometry: ['point'],
					tags: { natural: 'tree' },
					fields: [],
				},
			],
		])

		assert.throws(() => validatePresetTags(presetsMap), DuplicateTagsError)
	})

	test('reports multiple duplicate groups', () => {
		const presetsMap = new Map([
			[
				'tree1',
				{
					name: 'Tree 1',
					geometry: ['point'],
					tags: { natural: 'tree' },
					fields: [],
				},
			],
			[
				'tree2',
				{
					name: 'Tree 2',
					geometry: ['point'],
					tags: { natural: 'tree' },
					fields: [],
				},
			],
			[
				'water1',
				{
					name: 'Water 1',
					geometry: ['area'],
					tags: { natural: 'water' },
					fields: [],
				},
			],
			[
				'water2',
				{
					name: 'Water 2',
					geometry: ['area'],
					tags: { natural: 'water' },
					fields: [],
				},
			],
		])

		assert.throws(() => validatePresetTags(presetsMap), DuplicateTagsError)
	})

	test('detects duplicates regardless of tag key order', () => {
		const presetsMap = new Map([
			[
				'preset1',
				{
					name: 'Preset 1',
					geometry: ['point'],
					tags: { natural: 'tree', type: 'oak' },
					fields: [],
				},
			],
			[
				'preset2',
				{
					name: 'Preset 2',
					geometry: ['point'],
					tags: { type: 'oak', natural: 'tree' },
					fields: [],
				},
			],
		])

		assert.throws(() => validatePresetTags(presetsMap), DuplicateTagsError)
	})

	test('accepts tags with different values', () => {
		const presetsMap = new Map([
			[
				'oak',
				{
					name: 'Oak',
					geometry: ['point'],
					tags: { natural: 'tree', type: 'oak' },
					fields: [],
				},
			],
			[
				'pine',
				{
					name: 'Pine',
					geometry: ['point'],
					tags: { natural: 'tree', type: 'pine' },
					fields: [],
				},
			],
		])

		assert.doesNotThrow(() => validatePresetTags(presetsMap))
	})

	test('handles tags with different types of values', () => {
		const presetsMap = new Map([
			[
				'preset1',
				{
					name: 'Preset 1',
					geometry: ['point'],
					tags: { string: 'value', number: 42, boolean: true, null_val: null },
					fields: [],
				},
			],
			[
				'preset2',
				{
					name: 'Preset 2',
					geometry: ['point'],
					tags: { string: 'value', number: 42, boolean: true, null_val: null },
					fields: [],
				},
			],
		])

		assert.throws(() => validatePresetTags(presetsMap), DuplicateTagsError)
	})

	test('accepts empty presets map', () => {
		const presetsMap = new Map()
		assert.doesNotThrow(() => validatePresetTags(presetsMap))
	})

	test('accepts single preset', () => {
		const presetsMap = new Map([
			[
				'tree',
				{
					name: 'Tree',
					geometry: ['point'],
					tags: { natural: 'tree' },
					fields: [],
				},
			],
		])

		assert.doesNotThrow(() => validatePresetTags(presetsMap))
	})
})
