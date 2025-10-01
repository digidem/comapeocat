import * as v from 'valibot'

/** @typedef {v.InferOutput<typeof FieldSchema>} FieldOutput */
/** @typedef {v.InferInput<typeof FieldSchema>} FieldInput */
/** @typedef {v.InferOutput<typeof FieldSchemaStrict>} FieldStrictOutput */
/** @typedef {v.InferInput<typeof FieldSchemaStrict>} FieldStrictInput */

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
	v.number(),
	v.null(),
])

const OptionSchema = v.strictObject({
	label: v.pipe(v.string(), v.minLength(1)),
	value: OptionValueSchema,
})

const BaseFieldSchema = {
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
}

const TextFieldSchema = v.object({
	...BaseFieldSchema,
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
})

const NumberFieldSchema = v.object({
	...BaseFieldSchema,
	type: v.pipe(v.literal('number'), v.description('Allows only numbers')),
})

const SelectFieldSchema = v.object({
	...BaseFieldSchema,
	type: v.union([
		v.pipe(
			v.literal('selectOne'),
			v.description('Select one item from a list of pre-defined options'),
		),
		v.pipe(
			v.literal('selectMultiple'),
			v.description('Select multiple items from a list of pre-defined options'),
		),
	]),
	options: v.pipe(
		v.array(OptionSchema),
		v.minLength(1),
		v.description(
			'List of options the user can select for single- or multi-select fields',
		),
	),
})

const SelectFieldSchemaStrict = v.strictObject({
	...v.omit(SelectFieldSchema, ['options']).entries,
	...v.strictObject({
		options: v.pipe(
			v.array(v.strictObject(OptionSchema.entries)),
			v.minLength(1),
			v.description(
				'List of options the user can select for single- or multi-select fields',
			),
		),
	}).entries,
})

export const FieldSchema = v.union([
	TextFieldSchema,
	NumberFieldSchema,
	SelectFieldSchema,
])

export const FieldSchemaStrict = v.union([
	v.strictObject(TextFieldSchema.entries),
	v.strictObject(NumberFieldSchema.entries),
	SelectFieldSchemaStrict,
])
