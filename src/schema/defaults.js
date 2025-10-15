import * as v from 'valibot'

import { DEPRECATED_GEOMETRY_TYPES } from '../lib/constants.js'

/** @typedef {v.InferOutput<typeof DefaultsDeprecatedSchema>} DefaultsDeprecatedOutput */
/** @typedef {v.InferInput<typeof DefaultsDeprecatedSchema>} DefaultsDeprecatedInput */

export const DefaultsDeprecatedSchema = v.pipe(
	v.object(
		v.entriesFromList(
			DEPRECATED_GEOMETRY_TYPES,
			v.pipe(
				v.array(v.pipe(v.string(), v.minLength(1))),
				v.description(
					'List of category IDs in the order they should be shown to the user by default for this geometry.',
				),
			),
		),
	),
	v.metadata({
		title: 'Defaults Deprecated Schema',
		description:
			'Defines the order of categories and which should be shown to the user by default for each geometry type.',
		deprecated: true,
	}),
)
