// @ts-nocheck
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { validateCategoryTags } from '../bin/helpers/validate-category-tags.js'
import { DuplicateTagsError } from '../src/lib/errors.js'

describe('validateCategoryTags', () => {
	test('accepts categories with unique tags', () => {
		const categoriesMap = new Map([
			[
				'tree',
				{
					name: 'Tree',
					appliesTo: ['observation'],
					tags: { natural: 'tree' },
					fields: [],
				},
			],
			[
				'water',
				{
					name: 'Water',
					appliesTo: ['track'],
					tags: { natural: 'water' },
					fields: [],
				},
			],
			[
				'building',
				{
					name: 'Building',
					appliesTo: ['track'],
					tags: { building: 'yes' },
					fields: [],
				},
			],
		])

		assert.doesNotThrow(() => validateCategoryTags(categoriesMap))
	})

	test('rejects two categories with identical tags', () => {
		const categoriesMap = new Map([
			[
				'tree1',
				{
					name: 'Tree 1',
					appliesTo: ['observation'],
					tags: { natural: 'tree' },
					fields: [],
				},
			],
			[
				'tree2',
				{
					name: 'Tree 2',
					appliesTo: ['observation'],
					tags: { natural: 'tree' },
					fields: [],
				},
			],
		])

		assert.throws(() => validateCategoryTags(categoriesMap), DuplicateTagsError)
	})

	test('rejects three categories with identical tags', () => {
		const categoriesMap = new Map([
			[
				'tree1',
				{
					name: 'Tree 1',
					appliesTo: ['observation'],
					tags: { natural: 'tree' },
					fields: [],
				},
			],
			[
				'tree2',
				{
					name: 'Tree 2',
					appliesTo: ['observation'],
					tags: { natural: 'tree' },
					fields: [],
				},
			],
			[
				'tree3',
				{
					name: 'Tree 3',
					appliesTo: ['observation'],
					tags: { natural: 'tree' },
					fields: [],
				},
			],
		])

		assert.throws(() => validateCategoryTags(categoriesMap), DuplicateTagsError)
	})

	test('reports multiple duplicate groups', () => {
		const categoriesMap = new Map([
			[
				'tree1',
				{
					name: 'Tree 1',
					appliesTo: ['observation'],
					tags: { natural: 'tree' },
					fields: [],
				},
			],
			[
				'tree2',
				{
					name: 'Tree 2',
					appliesTo: ['observation'],
					tags: { natural: 'tree' },
					fields: [],
				},
			],
			[
				'water1',
				{
					name: 'Water 1',
					appliesTo: ['track'],
					tags: { natural: 'water' },
					fields: [],
				},
			],
			[
				'water2',
				{
					name: 'Water 2',
					appliesTo: ['track'],
					tags: { natural: 'water' },
					fields: [],
				},
			],
		])

		assert.throws(() => validateCategoryTags(categoriesMap), DuplicateTagsError)
	})

	test('detects duplicates regardless of tag key order', () => {
		const categoriesMap = new Map([
			[
				'preset1',
				{
					name: 'Preset 1',
					appliesTo: ['observation'],
					tags: { natural: 'tree', type: 'oak' },
					fields: [],
				},
			],
			[
				'preset2',
				{
					name: 'Preset 2',
					appliesTo: ['observation'],
					tags: { type: 'oak', natural: 'tree' },
					fields: [],
				},
			],
		])

		assert.throws(() => validateCategoryTags(categoriesMap), DuplicateTagsError)
	})

	test('accepts tags with different values', () => {
		const categoriesMap = new Map([
			[
				'oak',
				{
					name: 'Oak',
					appliesTo: ['observation'],
					tags: { natural: 'tree', type: 'oak' },
					fields: [],
				},
			],
			[
				'pine',
				{
					name: 'Pine',
					appliesTo: ['observation'],
					tags: { natural: 'tree', type: 'pine' },
					fields: [],
				},
			],
		])

		assert.doesNotThrow(() => validateCategoryTags(categoriesMap))
	})

	test('handles tags with different types of values', () => {
		const categoriesMap = new Map([
			[
				'preset1',
				{
					name: 'Preset 1',
					appliesTo: ['observation'],
					tags: { string: 'value', number: 42, boolean: true, null_val: null },
					fields: [],
				},
			],
			[
				'preset2',
				{
					name: 'Preset 2',
					appliesTo: ['observation'],
					tags: { string: 'value', number: 42, boolean: true, null_val: null },
					fields: [],
				},
			],
		])

		assert.throws(() => validateCategoryTags(categoriesMap), DuplicateTagsError)
	})

	test('accepts empty categories map', () => {
		const categoriesMap = new Map()
		assert.doesNotThrow(() => validateCategoryTags(categoriesMap))
	})

	test('accepts single category', () => {
		const categoriesMap = new Map([
			[
				'tree',
				{
					name: 'Tree',
					appliesTo: ['observation'],
					tags: { natural: 'tree' },
					fields: [],
				},
			],
		])

		assert.doesNotThrow(() => validateCategoryTags(categoriesMap))
	})
})
