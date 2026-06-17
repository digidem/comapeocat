import * as v from 'valibot'

/** @typedef {v.InferOutput<typeof DocTranslationSchema>} DocTranslationSchema */
/** @typedef {v.InferInput<typeof TranslationsSchema>} TranslationsInput */
/** @typedef {v.InferOutput<typeof TranslationsSchema>} TranslationsOutput */

const DocTranslationSchema = v.record(
	v.pipe(
		v.string(),
		v.minLength(1),
		v.description('The ID of the category or field being translated'),
	),
	v.record(
		v.pipe(
			v.string(),
			v.minLength(1),
			v.description(
				'property reference in dot-prop notation, e.g. "options.0.label"',
			),
		),
		v.pipe(v.string(), v.description('The translated message')),
	),
)

export const TranslationsSchema = v.object({
	category: v.optional(
		v.pipe(
			DocTranslationSchema,
			v.description('Translations for categories, keyed by category ID'),
		),
	),
	field: v.optional(
		v.pipe(
			DocTranslationSchema,
			v.description('Translations for fields, keyed by field ID'),
		),
	),
})
