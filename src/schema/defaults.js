import * as v from 'valibot'
import { GEOMETRY_TYPES } from '../lib/constants.js'

/** @typedef {v.InferOutput<typeof DefaultsSchema>} DefaultsOutput */
/** @typedef {v.InferInput<typeof DefaultsSchema>} DefaultsInput */
/** @typedef {v.InferOutput<typeof DefaultsSchemaStrict>} DefaultsStrictOutput */
/** @typedef {v.InferInput<typeof DefaultsSchemaStrict>} DefaultsStrictInput */

export const DefaultsSchema = v.pipe(
	v.object(
		v.entriesFromList(
			GEOMETRY_TYPES,
			v.pipe(
				v.array(v.pipe(v.string(), v.minLength(1))),
				v.description(
					'List of preset IDs in the order they should be shown to the user by default for this geometry type.',
				),
			),
		),
	),
	v.metadata({
		title: 'Defaults Schema',
		description:
			'Defines the order of categories (presets) and which should be shown to the user by default for each geometry type.',
	}),
)

export const DefaultsSchemaStrict = v.pipe(
	v.strictObject(DefaultsSchema.entries),
	v.metadata(v.getMetadata(DefaultsSchema)),
)
