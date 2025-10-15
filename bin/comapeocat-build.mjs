#!/usr/bin/env node
import fs from 'node:fs'
import { pipeline } from 'node:stream/promises'

import { Command } from '@commander-js/extra-typings'
import * as v from 'valibot'

import { isParseError } from '../src/lib/errors.js'
import { validateBcp47 } from '../src/lib/validate-bcp-47.js'
import {
	CategorySchema,
	CategorySchemaDeprecated,
} from '../src/schema/category.js'
import { MetadataSchemaInput } from '../src/schema/metadata.js'
import { Writer } from '../src/writer.js'
import { generateCategorySelection } from './helpers/generate-category-selection.js'
import { lint } from './helpers/lint.js'
import { messagesToTranslations } from './helpers/messages-to-translations.js'
import { migrateDefaults } from './helpers/migrate-defaults.js'
import { migrateGeometry } from './helpers/migrate-geometry.js'
import { readFiles } from './helpers/read-files.js'

const program = new Command()

program
	.description('Build a CoMapeo Categories file from <inputDir>')
	.option('-o, --output <file>', 'output .comapeocat file')
	.option('--name <name>', 'name of the category set')
	.option('--version <version>', 'version of the category set')
	.argument(
		'[inputDir]',
		'directory containing categories, fields, categorySelection and icons',
		process.cwd(),
	)
	.action(async (dir, { output, ...metadata }) => {
		lint(dir).catch(handleError)
		const writeStream = output ? fs.createWriteStream(output) : process.stdout
		const writer = new Writer()
		const pipelinePromise = pipeline(writer.outputStream, writeStream).catch(
			handleError,
		)
		writer.on('error', handleError)
		/** @type {Map<string, import('../src/schema/category.js').CategoryDeprecatedSortInput>} */
		const categoriesMap = new Map()
		/** @type {import('../src/schema/metadata.js').MetadataInput | undefined} */
		let fileMetadata
		/** @type {import('../src/schema/categorySelection.js').CategorySelectionInput | undefined} */
		let categorySelection
		try {
			for await (const { type, id, value } of readFiles(dir)) {
				switch (type) {
					case 'category': {
						v.assert(v.union([CategorySchema, CategorySchemaDeprecated]), value)
						// Migrate deprecated geometry field to appliesTo first
						const migratedGeometry = migrateGeometry(value)
						// We don't migrate the sort field yet
						categoriesMap.set(id, migratedGeometry)
						// v.parse validates the schema and removes the sort field
						writer.addCategory(id, v.parse(CategorySchema, migratedGeometry))
						break
					}
					case 'field':
						writer.addField(id, value)
						break
					case 'categorySelection':
						categorySelection = value
						break
					case 'defaults':
						// categorySelection takes precedence over defaults
						if (categorySelection) break
						categorySelection = migrateDefaults(value)
						break
					case 'icon':
						writer.addIcon(id, value)
						break
					case 'messages':
						await writer.addTranslations(
							validateBcp47(id),
							messagesToTranslations(value),
						)
						break
					case 'metadata':
						fileMetadata = value
						break
				}
			}
			// Metadata from the command line overrides metadata from the file, fallback to package.json
			const mergedMetadata = {
				...fileMetadata,
				...metadata,
			}
			if (!mergedMetadata.name) {
				console.error('You must provide a name via --name or in metadata.json')
				process.exit(1)
			}
			v.assert(MetadataSchemaInput, mergedMetadata)
			writer.setMetadata(mergedMetadata)

			if (!categorySelection) {
				categorySelection = generateCategorySelection(categoriesMap)
			}
			writer.setCategorySelection(categorySelection)

			writer.finish()
			await pipelinePromise
		} catch (err) {
			handleError(err)
		}

		if (output) {
			console.log(`\n✓ Successfully wrote category archive ${output}`)
		}
	})

program.parseAsync(process.argv)

/** @param {unknown} err */
function handleError(err) {
	if (isParseError(err)) {
		// For parse errors, don't print full stack trace and error properties,
		// which can confuse the user.
		console.error(err.message)
	} else {
		console.error(err)
	}
	process.exit(1)
}
