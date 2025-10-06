import fs from 'node:fs/promises'
import path from 'node:path'

import parseJson from 'parse-json'
import * as v from 'valibot'

import {
	CATEGORIES_DIR,
	FIELDS_DIR,
	ICONS_DIR,
	MESSAGES_DIR,
	METATADATA_FILE,
	PRESETS_DIR,
} from '../../src/lib/constants.js'
import { SchemaError } from '../../src/lib/errors.js'
import { parseSvg } from '../../src/lib/parse-svg.js'
import { isNotFoundError } from '../../src/lib/utils.js'
import {
	CategorySchema,
	CategorySchemaDeprecated,
} from '../../src/schema/category.js'
import { CategorySelectionSchema } from '../../src/schema/categorySelection.js'
import { FieldSchema } from '../../src/schema/field.js'
import { MessagesSchema } from '../../src/schema/messages.js'
import { MetadataSchemaInput } from '../../src/schema/metadata.js'
import { jsonFiles } from './json-files.js'

/**
 * @import {CategoryDeprecatedInput, CategoryInput} from '../../src/schema/category.js'
 * @import {FieldInput} from '../../src/schema/field.js'
 * @import {CategorySelectionInput} from '../../src/schema/categorySelection.js'
 * @import {MetadataInput} from '../../src/schema/metadata.js'
 * @import {MessagesInput} from '../../src/schema/messages.js'
 */

/**
 * Read the category, field, categorySelection, and icon files in a directory and validate them.
 *
 * @param {string} dir - Directory path
 * @returns {AsyncGenerator<
 *  | { type: 'category', id: string, value: CategoryDeprecatedInput | CategoryInput }
 *  | { type: 'field', id: string, value: FieldInput }
 *  | { type: 'categorySelection', id: 'categorySelection', value: CategorySelectionInput }
 *  | { type: 'icon', id: string, value: string }
 *  | { type: 'metadata', id: 'metadata', value: MetadataInput }
 *  | { type: 'messages', id: string, value: MessagesInput 	}
 * >} Completes when all files are read and validated
 */
export async function* readFiles(dir) {
	// Try to read from 'categories' directory first, fall back to 'presets' for backwards compatibility
	let categoryDir = path.join(dir, CATEGORIES_DIR)

	try {
		await fs.access(categoryDir)
	} catch (err) {
		if (isNotFoundError(err)) {
			// Fall back to presets directory for backwards compatibility
			categoryDir = path.join(dir, PRESETS_DIR)
		} else {
			throw err
		}
	}

	for await (const { name, data } of jsonFiles(categoryDir)) {
		assertSchema(v.union([CategorySchema, CategorySchemaDeprecated]), data, {
			fileName: name,
		})
		yield { type: 'category', id: nameToId(name), value: data }
	}

	for await (const { name, data } of jsonFiles(path.join(dir, FIELDS_DIR))) {
		assertSchema(FieldSchema, data, { fileName: name })
		yield { type: 'field', id: nameToId(name), value: data }
	}

	let iconFiles
	try {
		iconFiles = await fs.readdir(path.join(dir, ICONS_DIR), {
			recursive: true,
		})
	} catch (err) {
		// Icons are optional
		if (!isNotFoundError(err)) throw err
	}
	if (iconFiles) {
		for (const name of iconFiles) {
			if (!name.endsWith('.svg')) continue
			const data = await fs.readFile(path.join(dir, ICONS_DIR, name), 'utf-8')
			const value = parseSvg(data)
			yield { type: 'icon', id: nameToId(name), value }
		}
	}

	for await (const { name, data } of jsonFiles(path.join(dir, MESSAGES_DIR), {
		recursive: false,
	})) {
		assertSchema(MessagesSchema, data, { fileName: name })
		yield { type: 'messages', id: nameToId(name), value: data }
	}

	/** @type {string | undefined} */
	let metadataJson
	try {
		metadataJson = await fs.readFile(path.join(dir, METATADATA_FILE), 'utf-8')
	} catch (err) {
		// metadata.json is optional
		if (!isNotFoundError(err)) throw err
	}
	if (metadataJson) {
		const data = parseJson(metadataJson, undefined, METATADATA_FILE)
		assertSchema(MetadataSchemaInput, data, {
			fileName: METATADATA_FILE,
		})
		yield { type: 'metadata', id: 'metadata', value: data }
	}

	/** @type {string | undefined} */
	let categorySelectionJson
	try {
		categorySelectionJson = await fs.readFile(
			path.join(dir, 'categorySelection.json'),
			'utf-8',
		)
	} catch (err) {
		// categorySelection.json is optional
		if (!isNotFoundError(err)) throw err
	}
	if (categorySelectionJson) {
		const data = parseJson(
			categorySelectionJson,
			undefined,
			'categorySelection.json',
		)
		assertSchema(CategorySelectionSchema, data, {
			fileName: 'categorySelection.json',
		})
		yield { type: 'categorySelection', id: 'categorySelection', value: data }
	}
}

/**
 * Convert a filename to an ID by removing its extension
 * @param {string} name - Filename
 * @returns {string} ID (filename without extension)
 */
function nameToId(name) {
	return name.replace(/\.[^/.]+$/, '')
}

/**
 * Assert data against a schema, with fileName metadata for errors
 *
 * @template {v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>} TSchema
 * @param {TSchema} schema - The Valibot schema to validate against
 * @param {unknown} data - The data to validate
 * @param {object} params
 * @param {string} params.fileName - Name of the file being parsed (for error messages)
 * @return {asserts data is v.InferInput<TSchema>}
 * @throws {SchemaError} If validation fails, throws a SchemaError with details
 */
export function assertSchema(schema, data, { fileName }) {
	try {
		return v.assert(schema, data)
	} catch (err) {
		if (v.isValiError(err)) {
			throw new SchemaError({ fileName, valiError: err })
		} else {
			throw err
		}
	}
}
