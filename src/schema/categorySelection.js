import * as v from 'valibot'

import { DOCUMENT_TYPES } from '../lib/constants.js'

/** @typedef {v.InferOutput<typeof CategorySelectionSchema>} CategorySelectionOutput */
/** @typedef {v.InferInput<typeof CategorySelectionSchema>} CategorySelectionInput */

export const CategorySelectionSchema = v.pipe(
	v.object(
		v.entriesFromList(
			DOCUMENT_TYPES,
			v.pipe(
				v.array(v.pipe(v.string(), v.minLength(1))),
				v.minLength(1),
				v.description(
					'List of category IDs in the order they should be shown to the user by default for this document type.',
				),
			),
		),
	),
	v.metadata({
		title: 'Category Selection Schema',
		description:
			'Defines the order of categories and which should be shown to the user by default for each document type.',
	}),
)
