import { DuplicateTagsError } from '../../src/lib/errors.js'

/**
 * Validate that all preset tags are unique
 * @param {Map<string, import('../../src/schema/preset.js').PresetInput>} presetsMap
 */
export function validatePresetTags(presetsMap) {
	/** @type {Map<string, { presetIds: string[], tags: Record<string, unknown> }>} */
	const tagGroups = new Map()

	// Group presets by their normalized tags
	for (const [presetId, preset] of presetsMap) {
		const normalizedTags = stableStringifyTags(preset.tags)

		if (tagGroups.has(normalizedTags)) {
			tagGroups.get(normalizedTags)?.presetIds.push(presetId)
		} else {
			tagGroups.set(normalizedTags, {
				presetIds: [presetId],
				tags: preset.tags,
			})
		}
	}

	// Find all groups with duplicates (more than one preset)
	const duplicates = []
	for (const group of tagGroups.values()) {
		if (group.presetIds.length > 1) {
			duplicates.push(group)
		}
	}

	if (duplicates.length > 0) {
		throw new DuplicateTagsError({ duplicates })
	}
}

/**
 * Stable stringify tags object for comparison
 * @param {import('../../src/schema/preset.js').PresetOutput['tags']} tags
 */
function stableStringifyTags(tags) {
	// Sort by keys to ensure consistent ordering
	const sortedKeys = Object.keys(tags).sort()
	const sortedEntries = sortedKeys.map((key) => [key, tags[key]])
	return JSON.stringify(sortedEntries)
}
