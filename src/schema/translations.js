import * as v from 'valibot'

/** @typedef {v.InferOutput<typeof TranslationSchema>} TranslationOutput */
/** @typedef {v.InferOutput<typeof TranslationsSchema>} TranslationsOutput */

const TranslationSchema = v.object({
	propertyRef: v.pipe(
		v.string(),
		v.minLength(1),
		v.description(
			'Reference to the property being translated in dot-prop notation, e.g., "options.0"',
		),
	),
	message: v.pipe(v.string(), v.description('The translated message')),
})

export const TranslationsSchema = v.object({
	preset: v.record(
		v.pipe(
			v.string(),
			v.minLength(1),
			v.description('The ID of the preset being translated'),
		),
		v.array(TranslationSchema),
	),
	field: v.record(
		v.pipe(
			v.string(),
			v.minLength(1),
			v.description('The ID of the field being translated'),
		),
		v.array(TranslationSchema),
	),
})
