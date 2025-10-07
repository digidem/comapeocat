import * as v from 'valibot'

/** @typedef {v.InferOutput<typeof FieldSchema>} FieldOutput */
/** @typedef {v.InferInput<typeof FieldSchema>} FieldInput */

const AppearanceSchema = v.pipe(
	v.union([
		v.pipe(
			v.literal('singleline'),
			v.description(
				'Text will be cut-off if it exceeds the width of the field',
			),
		),
		v.pipe(
			v.literal('multiline'),
			v.description('Text will wrap and the field will grow vertically'),
		),
	]),
	v.description(
		'For text fields, display as a single-line or multi-line field',
	),
)

const OptionValueSchema = v.union([
	v.string(),
	v.boolean(),
	v.pipe(v.number(), v.integer()),
	v.null(),
])

const OptionSchema = v.object({
	label: v.pipe(v.string(), v.minLength(1)),
	value: OptionValueSchema,
})

const OptionsSchema = v.pipe(
	v.array(OptionSchema),
	v.minLength(1),
	v.everyItem(
		(item, index, array) =>
			array.findIndex((i) => i.value === item.value) === index,
		'All select option values must be unique',
	),
	v.description(
		'List of options the user can select for single- or multi-select fields',
	),
)

const BaseFieldSchema = v.object({
	tagKey: v.pipe(
		v.string(),
		v.minLength(1),
		v.description('The key in a tags object that this field applies to'),
	),
	label: v.pipe(
		v.string(),
		v.minLength(1),
		v.description('Default language label for the form field label'),
	),
	placeholder: v.optional(
		v.pipe(
			v.string(),
			v.description(
				"Displayed as a placeholder in an empty text or number field before the user begins typing. Use 'helperText' for important information, because the placeholder is not visible after the user has entered data.",
			),
		),
	),
	helperText: v.optional(
		v.pipe(
			v.string(),
			v.description(
				'Additional context about the field, e.g. hints about how to answer the question.',
			),
		),
	),
})

export const FieldSchema = v.variant('type', [
	v.object({
		...BaseFieldSchema.entries,
		type: v.pipe(v.literal('text'), v.description('Freeform text input')),
		appearance: v.optional(
			v.pipe(
				AppearanceSchema,
				v.description(
					'For text fields, display as a single-line or multi-line field',
				),
			),
			'multiline',
		),
	}),
	v.object({
		...BaseFieldSchema.entries,
		type: v.pipe(v.literal('number'), v.description('Allows only numbers')),
	}),
	v.object({
		...BaseFieldSchema.entries,
		type: v.pipe(
			v.literal('selectOne'),
			v.description('Select one item from a list of pre-defined options'),
		),
		options: OptionsSchema,
	}),
	v.object({
		...BaseFieldSchema.entries,
		type: v.pipe(
			v.literal('selectMultiple'),
			v.description('Select multiple items from a list of pre-defined options'),
		),
		options: OptionsSchema,
	}),
])
