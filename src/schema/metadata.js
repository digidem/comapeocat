import * as v from 'valibot'

/** @typedef {v.InferOutput<typeof MetadataSchemaOutput>} MetadataOutput */
/** @typedef {v.InferInput<typeof MetadataSchemaInput>} MetadataInput */

// This is the metadata that should be provided to the writer
export const MetadataSchemaInput = v.object({
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
	builderName: v.optional(
		v.pipe(
			v.string(),
			v.minLength(1),
			v.maxLength(100),
			v.description(
				'The name or identifier of the tool used to build the categories archive',
			),
		),
	),
	builderVersion: v.optional(
		v.pipe(
			v.string(),
			v.minLength(1),
			v.maxLength(20),
			v.description(
				'The version of the tool used to build the categories archive',
			),
		),
	),
})

// This is the metadata as-stored in the comapeocat file, which includes a build date and may include other fields in the future
export const MetadataSchemaOutput = v.object({
	...MetadataSchemaInput.entries,
	buildDateValue: v.pipe(
		v.number(),
		v.description('Build date as a unix timestamp in milliseconds'),
	),
	minSchemaVersion: v.optional(
		v.pipe(
			v.number(),
			v.integer(),
			v.minValue(1),
			v.description(
				'The minimum schema (vocabulary) revision a reader must support to read this file, computed by the writer from the features used. Absent in files written before container version 2.0, which implies 1.',
			),
		),
	),
})
