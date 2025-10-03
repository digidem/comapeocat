#!/usr/bin/env node
import fs from 'node:fs'
import { pipeline } from 'node:stream/promises'

import { Command } from '@commander-js/extra-typings'
import * as v from 'valibot'

import { isParseError } from '../src/lib/errors.js'
import { assertValidBCP47 } from '../src/lib/utils.js'
import { MetadataSchemaInput } from '../src/schema/metadata.js'
import { CategorySchema } from '../src/schema/category.js'
import { Writer } from '../src/writer.js'
import { generateDefaults } from './helpers/generate-defaults.js'
import { lint } from './helpers/lint.js'
import { messagesToTranslations } from './helpers/messages-to-translations.js'
import { readFiles } from './helpers/read-files.js'

const program = new Command()

program
	.description('Build a CoMapeo Categories file from <inputDir>')
	.option('-o, --output <file>', 'output .comapeocat file')
	.option('--name <name>', 'name of the category set')
	.option('--version <version>', 'version of the category set')
	.argument(
		'[inputDir]',
		'directory containing categories, fields, defaults and icons',
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
		/** @type {Map<string, import('../src/schema/category.js').CategoryDeprecatedInput>} */
		const categoriesMap = new Map()
		/** @type {import('../src/schema/metadata.js').MetadataInput | undefined} */
		let fileMetadata
		/** @type {import('../src/schema/defaults.js').DefaultsInput | undefined} */
		let defaults
		try {
			for await (const { type, id, value } of readFiles(dir)) {
				switch (type) {
					case 'category': {
						// We use the deprecated schema here to generate defaults.json if it's missing
						categoriesMap.set(id, value)
						// Currently parsing will migrate, because all that needs done is
						// removing the `sort` field (v.parse removes unknown fields)
						const migratedCategory = v.parse(CategorySchema, value)
						writer.addCategory(id, migratedCategory)
						break
					}
					case 'field':
						writer.addField(id, value)
						break
					case 'defaults':
						defaults = value
						break
					case 'icon':
						writer.addIcon(id, value)
						break
					case 'messages':
						assertValidBCP47(id)
						await writer.addTranslations(id, messagesToTranslations(value))
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

			if (!defaults) {
				defaults = generateDefaults(categoriesMap)
			}
			writer.setDefaults(defaults)

			writer.finish()
			await pipelinePromise
		} catch (err) {
			handleError(err)
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
