import * as v from 'valibot'

import { DOCUMENT_TYPES } from '../lib/constants.js'

/** @typedef {v.InferOutput<typeof CategorySchema>} CategoryOutput */
/** @typedef {v.InferInput<typeof CategorySchema>} CategoryInput */
/** @typedef {v.InferOutput<typeof CategorySchemaDeprecated>} CategoryDeprecatedOutput */
/** @typedef {v.InferInput<typeof CategorySchemaDeprecated>} CategoryDeprecatedInput */

const TagsSchema = v.record(
	v.string(),
	v.union([v.boolean(), v.number(), v.string(), v.null()]),
)

/**
 * Check if a document type is valid
 * @param {string} type
 * @returns {type is typeof DOCUMENT_TYPES[number]} True if the type is valid
 */
function isValidDocumentType(type) {
	// @ts-expect-error
	return DOCUMENT_TYPES.includes(type)
}

// This is strictly typed, but we allow unknown document types as input for forward compatibility, but filter them out for current code.
const AppliesToSchema =
	/** @type {v.GenericSchema<Array<typeof DOCUMENT_TYPES[number] | string>, Array<typeof DOCUMENT_TYPES[number]>>} */ (
		v.pipe(
			v.array(v.string()),
			v.filterItems((item) => isValidDocumentType(item)),
			v.minLength(1),
			v.check(
				(arr) => arr.length === new Set(arr).size,
				'Array must contain unique values',
			),
			v.description(
				`Document types that this category applies to. Known types: \`${DOCUMENT_TYPES.join('", "')}\`. Unknown types are accepted for forward compatibility.`,
			),
		)
	)

const RefSchema = v.pipe(v.string(), v.minLength(1))

export const CategorySchema = v.pipe(
	v.object({
		name: v.pipe(
			v.string(),
			v.minLength(1),
			v.description('Name for the feature in default language.'),
		),
		appliesTo: AppliesToSchema,
		tags: v.pipe(
			TagsSchema,
			v.minEntries(1),
			v.description(
				'The tags are used to match the category to existing map entities. You can match based on multiple tags E.g. if you have existing points with the tags `nature:tree` and `species:oak` then you can add both these tags here in order to match only oak trees.',
			),
		),
		addTags: v.optional(
			v.pipe(
				TagsSchema,
				v.description(
					"Tags that are added when changing to the category (default is the same value as 'tags')",
				),
			),
			{},
		),
		removeTags: v.optional(
			v.pipe(
				TagsSchema,
				v.description(
					"Tags that are removed when changing to another category (default is the same value as 'addTags' which in turn defaults to 'tags')",
				),
			),
			{},
		),
		fields: v.pipe(
			v.array(RefSchema),
			v.description('Array of field IDs to show for this category.'),
		),
		icon: v.optional(
			v.pipe(
				RefSchema,
				v.description('ID of the icon to display for this category.'),
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
		title: 'Category',
		description:
			'Categories define how map entities are displayed to the user. They define the icon used on the map, and the fields / questions shown to the user when they create or edit the entity on the map. The `tags` property of a category is used to match the category with observations, nodes, ways and relations. If multiple categories match, the one that matches the most tags is used.',
	}),
)

// We support reading this schema off disk when generating the comapeocat file,
// but we do not use this schema in the file format itself - deprecated fields
// are mapping to equivalents in the file format (e.g. sort is used to determine
// the order of categorySelection)
export const CategorySchemaDeprecated = v.pipe(
	v.object({
		...CategorySchema.entries,
		sort: v.optional(
			v.pipe(
				v.number(),
				v.metadata({
					description:
						'Sort order (deprecated, use categorySelection.json instead)',
					deprecated: true,
				}),
			),
		),
	}),
	v.metadata(v.getMetadata(CategorySchema)),
)
