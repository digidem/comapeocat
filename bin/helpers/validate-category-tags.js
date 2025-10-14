import stableStringify from 'safe-stable-stringify'

import { DuplicateTagsError } from '../../src/lib/errors.js'

/**
 * Validate that all category tags are unique
 * @param {Map<string, Pick<import('../../src/schema/category.js').CategoryInput, 'tags' | 'appliesTo'>>} categoriesMap
 */
export function validateCategoryTags(categoriesMap) {
	/** @type {Map<string, { categoryIds: string[], tags: Record<string, unknown> }>} */
	const tagGroups = new Map()

	// Group categories by their normalized tags
	for (const [categoryId, category] of categoriesMap) {
		for (const dataType of category.appliesTo) {
			const normalizedTags = stableStringify(category.tags) + '|' + dataType
			if (tagGroups.has(normalizedTags)) {
				tagGroups.get(normalizedTags)?.categoryIds.push(categoryId)
			} else {
				tagGroups.set(normalizedTags, {
					categoryIds: [categoryId],
					tags: category.tags,
				})
			}
		}
	}

	// Find all groups with duplicates (more than one category)
	const duplicates = []
	for (const group of tagGroups.values()) {
		if (group.categoryIds.length > 1) {
			duplicates.push(group)
		}
	}

	if (duplicates.length > 0) {
		throw new DuplicateTagsError({ duplicates })
	}
}
