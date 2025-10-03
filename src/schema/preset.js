import * as v from 'valibot'

import { GEOMETRY_TYPES } from '../lib/constants.js'

/** @typedef {v.InferOutput<typeof PresetSchema>} PresetOutput */
/** @typedef {v.InferInput<typeof PresetSchema>} PresetInput */
/** @typedef {v.InferOutput<typeof PresetSchemaDeprecated>} PresetDeprecatedOutput */
/** @typedef {v.InferInput<typeof PresetSchemaDeprecated>} PresetDeprecatedInput */

const TagsSchema = v.record(
	v.string(),
	v.union([v.boolean(), v.number(), v.string(), v.null()]),
)

/**
 * Check if a geometry type is valid
 * @param {string} type
 * @returns {type is typeof GEOMETRY_TYPES[number]} True if the type is valid
 */
function isValidGeometryType(type) {
	// @ts-expect-error
	return GEOMETRY_TYPES.includes(type)
}

// This is strictly typed, but we allow unknown geometry types as input for forward compatibility, but filter them out for current code.
const GeometrySchema =
	/** @type {v.GenericSchema<Array<typeof GEOMETRY_TYPES[number] | string>, Array<typeof GEOMETRY_TYPES[number]>>} */ (
		v.pipe(
			v.array(v.string()),
			v.filterItems((item) => isValidGeometryType(item)),
			v.minLength(1),
			v.check(
				(arr) => arr.length === new Set(arr).size,
				'Array must contain unique values',
			),
			v.description(
				`Geometry types for the feature - this preset will only match features of this geometry type. Known types: \`${GEOMETRY_TYPES.join('", "')}\`. Unknown types are accepted for forward compatibility.`,
			),
		)
	)

const RefSchema = v.pipe(v.string(), v.minLength(1))

export const PresetSchema = v.pipe(
	v.object({
		name: v.pipe(
			v.string(),
			v.minLength(1),
			v.description('Name for the feature in default language.'),
		),
		geometry: GeometrySchema,
		tags: v.pipe(
			TagsSchema,
			v.minEntries(1),
			v.description(
				'The tags are used to match the preset to existing map entities. You can match based on multiple tags E.g. if you have existing points with the tags `nature:tree` and `species:oak` then you can add both these tags here in order to match only oak trees.',
			),
		),
		addTags: v.optional(
			v.pipe(
				TagsSchema,
				v.description(
					"Tags that are added when changing to the preset (default is the same value as 'tags')",
				),
			),
			{},
		),
		removeTags: v.optional(
			v.pipe(
				TagsSchema,
				v.description(
					"Tags that are removed when changing to another preset (default is the same value as 'addTags' which in turn defaults to 'tags')",
				),
			),
			{},
		),
		fields: v.pipe(
			v.array(RefSchema),
			v.description('Array of field IDs to show for this preset.'),
		),
		icon: v.optional(
			v.pipe(
				RefSchema,
				v.description('ID of the icon to display for this preset.'),
			),
		),
		terms: v.optional(
			v.pipe(
				v.array(v.string()),
				v.description('Synonyms or related terms (used for search)'),
			),
			[],
		),
		color: v.optional(
			v.pipe(
				v.string(),
				v.hexColor(),
				v.description('Color in 24-bit RGB hex format, e.g. `#ff0000`'),
			),
		),
	}),
	v.metadata({
		title: 'Preset',
		description:
			'Presets define how map entities are displayed to the user. They define the icon used on the map, and the fields / questions shown to the user when they create or edit the entity on the map. The `tags` property of a preset is used to match the preset with observations, nodes, ways and relations. If multiple presets match, the one that matches the most tags is used.',
	}),
)

// We support reading this schema off disk when generating the comapeocat file,
// but we do not use this schema in the file format itself - deprecated fields
// are mapping to equivalents in the file format (e.g. sort is used to determine
// the order of defaults)
export const PresetSchemaDeprecated = v.pipe(
	v.object({
		...PresetSchema.entries,
		sort: v.optional(
			v.pipe(
				v.number(),
				v.metadata({
					description: 'Sort order (deprecated, use defaults.json instead)',
					deprecated: true,
				}),
			),
		),
	}),
	v.metadata(v.getMetadata(PresetSchema)),
)
