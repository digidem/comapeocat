#!/usr/bin/env node
import fs from 'node:fs'

import { toJsonSchema } from '@valibot/to-json-schema'

import { CategorySchemaDeprecated } from '../src/schema/category.js'
import { CategorySelectionSchema } from '../src/schema/categorySelection.js'
import { FieldSchema } from '../src/schema/field.js'
import { MessagesSchema } from '../src/schema/messages.js'

const outDir = new URL('../dist/schema/', import.meta.url)

fs.mkdirSync(outDir, { recursive: true })

const categorySchemaJson = toJsonSchema(CategorySchemaDeprecated, {
	typeMode: 'input',
	ignoreActions: ['check'],
	overrideAction({ valibotAction, jsonSchema }) {
		if (
			valibotAction.type === 'metadata' &&
			'metadata' in valibotAction &&
			valibotAction.metadata &&
			typeof valibotAction.metadata === 'object' &&
			'deprecated' in valibotAction.metadata
		) {
			return {
				...jsonSchema,
				deprecated: valibotAction.metadata.deprecated,
			}
		}
		return jsonSchema
	},
})
const fieldSchemaJson = toJsonSchema(FieldSchema, {
	typeMode: 'input',
	ignoreActions: ['check'],
})
const categorySelectionSchemaJson = toJsonSchema(CategorySelectionSchema, {
	typeMode: 'input',
})
const messagesSchemaJson = toJsonSchema(MessagesSchema, {
	typeMode: 'input',
})

fs.writeFileSync(
	new URL('category.json', outDir),
	JSON.stringify(categorySchemaJson, null, 2),
)
fs.writeFileSync(
	new URL('field.json', outDir),
	JSON.stringify(fieldSchemaJson, null, 2),
)
fs.writeFileSync(
	new URL('categorySelection.json', outDir),
	JSON.stringify(categorySelectionSchemaJson, null, 2),
)
fs.writeFileSync(
	new URL('messages.json', outDir),
	JSON.stringify(messagesSchemaJson, null, 2),
)
