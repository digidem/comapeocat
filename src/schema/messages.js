import * as v from 'valibot'
/** @import {InferOutput} from 'valibot' */
/** @typedef {InferOutput<typeof MessagesSchema>} MessagesOutput */
/** @typedef {InferOutput<typeof MessagesSchemaStrict>} MessagesStrictOutput */

const MessageSchema = v.object({
	description: v.string(),
	message: v.string(),
})

// Pattern to match an escaped string (dots are escaped with backslash)
const ESCAPED_STRING = '(?:[^.\\\\]|\\\\.)+'

// Pattern to match a number (option index)
const NUMBER = '\\d+'

// Message ID patterns
const MESSAGE_ID_PATTERN = new RegExp(
	`^(?:` +
		`field\\.${ESCAPED_STRING}\\.(?:name|label|placeholder|helperText)|` +
		`field\\.${ESCAPED_STRING}\\.options\\.${NUMBER}|` +
		`preset\\.${ESCAPED_STRING}\\.(?:name|terms)` +
		`)$`,
)

/**
 * @typedef {`field.${string}.name`
 *   | `field.${string}.label`
 *   | `field.${string}.placeholder`
 *   | `field.${string}.helperText`
 *   | `field.${string}.options.${number}`
 *   | `preset.${string}.name`
 *   | `preset.${string}.terms`
 * } MessageId
 */

const MessageIdSchema = /** @type {v.CustomSchema<MessageId, string>} */ (
	v.custom(
		/** @type {(input: unknown) => input is MessageId} */
		(input) => typeof input === 'string' && MESSAGE_ID_PATTERN.test(input),
		'Message ID must match pattern: field.{id}.{name|label|placeholder|helperText|options.{index}} or preset.{id}.{name|terms}, where {id} has dots escaped with \\ and {index} is a number referring to the zero-indexed position of the option in the options array',
	)
)

export const MessagesSchema = v.record(MessageIdSchema, MessageSchema)
export const MessagesSchemaStrict = v.record(
	MessageIdSchema,
	v.strictObject(MessageSchema.entries),
)
