import * as v from 'valibot'
import { GEOMETRY_TYPES } from '../lib/constants.js'

/** @typedef {v.InferOutput<typeof PresetSchema>} PresetOutput */
/** @typedef {v.InferInput<typeof PresetSchema>} PresetInput */
/** @typedef {v.InferOutput<typeof PresetSchemaStrict>} PresetStrictOutput */
/** @typedef {v.InferInput<typeof PresetSchemaStrict>} PresetStrictInput */

const TagValueSchema = v.union([
	v.boolean(),
	v.number(),
	v.string(),
	v.null(),
	v.array(v.union([v.boolean(), v.number(), v.string(), v.null()])),
])

const TagsSchema = v.record(v.string(), TagValueSchema)

const RefSchema = v.pipe(v.string(), v.minLength(1))

export const PresetSchema = v.pipe(
	v.object({
		name: v.pipe(
			v.string(),
			v.description('Name for the feature in default language.'),
		),
		geometry: v.pipe(
			v.array(v.string()),
			v.minLength(1),
			v.check(
				(arr) => arr.length === new Set(arr).size,
				'Array must contain unique values',
			),
			v.description(
				`Geometry types for the feature - this preset will only match features of this geometry type. Known types: \`${GEOMETRY_TYPES.join('", "')}\`. Unknown types are accepted for forward compatibility.`,
			),
		),
		tags: v.pipe(
			TagsSchema,
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
		sort: v.optional(v.pipe(v.number(), v.description('Sort order'))),
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

export const PresetSchemaStrict = v.pipe(
	v.strictObject({
		...PresetSchema.entries,
		geometry: v.pipe(
			v.array(v.picklist(GEOMETRY_TYPES)),
			v.minLength(1),
			v.check(
				(arr) => arr.length === new Set(arr).size,
				'Array must contain unique values',
			),
			v.description(
				`Valid geometry types for the feature - this preset will only match features of this geometry type \`${GEOMETRY_TYPES.join('", "')}\``,
			),
		),
	}),
	v.metadata(v.getMetadata(PresetSchema)),
)
