import * as v from 'valibot'

/** @typedef {v.InferOutput<typeof MessagesSchema>} MessagesOutput */
/** @typedef {v.InferInput<typeof MessagesSchema>} MessagesInput */

// This is the file format used for localization messages. It is a standardized
// format used by translation platforms like Crowdin. Each message has a
// description (for translators) and the actual message string. We used message
// IDs to encode the type of record, the id of the record, and the property
// being translated, using dot-prop notation. Any `.` in the actual property
// name should be escaped. The file builder strictly validates the message IDs
// and restricts them to only translatable fields.

const MessageSchema = v.object({
	description: v.string(),
	message: v.string(),
})

export const MessagesSchema = v.pipe(
	v.record(v.string(), MessageSchema),
	v.description(
		'Message IDs are of the format `category|field.<id>.<property>` where `<property>` can use dot-prop notation to reference nested properties.',
	),
)
