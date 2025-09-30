import * as v from 'valibot'

/** @typedef {v.InferOutput<typeof MetadataSchema>} MetadataOutput */

const MetadataSchemaMetadata = v.metadata({
	title: 'Category Set Metadata',
	description: 'Metadata about a category set, including name and version',
})

// This is the metadata that should be provided to the writer
export const MetadataSchemaStrict = v.pipe(
	v.strictObject({
		name: v.pipe(
			v.string(),
			v.minLength(1),
			v.maxLength(100),
			v.description('A human-readable name for this category set'),
		),
		version: v.optional(
			v.pipe(
				v.string(),
				v.minLength(1),
				v.maxLength(20),
				v.description(
					'A version name (can be semver or any other scheme) that should be incremented for every change',
				),
			),
		),
	}),
	MetadataSchemaMetadata,
)

// This is the metadata as-stored in the comapeocat file, which includes a build date and may include other fields in the future
export const MetadataSchema = v.pipe(
	v.object({
		...MetadataSchemaStrict.entries,
		buildDateValue: v.pipe(
			v.number(),
			v.description('Build date as a unix timestamp in milliseconds'),
		),
	}),
	MetadataSchemaMetadata,
)
