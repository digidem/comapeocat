#!/usr/bin/env node
import { Command } from '@commander-js/extra-typings'
import fs from 'node:fs'
import { isParseError } from '../src/lib/errors.js'
import { readFiles } from '../src/lib/read-files.js'
import { Writer } from '../src/writer.js'
import { pipeline } from 'node:stream/promises'
import * as v from 'valibot'
import { MetadataSchemaStrict } from '../src/schema/metadata.js'
import { lint } from '../src/lint.js'

const program = new Command()

program
	.description('Build a CoMapeo Categories file from <inputDir>')
	.option('-o, --output <file>', 'output .comapeocat file')
	.option('--name <name>', 'name of the category set')
	.option('--version <version>', 'version of the category set')
	.argument(
		'[inputDir]',
		'directory containing presets, fields, defaults and icons',
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
		/** @type {import('../src/schema/metadata.js').MetadataStrictOutput | undefined} */
		let fileMetadata
		try {
			for await (const { type, id, value } of readFiles(dir)) {
				switch (type) {
					case 'preset':
						writer.addPreset(id, value)
						break
					case 'field':
						writer.addField(id, value)
						break
					case 'defaults':
						writer.setDefaults(value)
						break
					case 'icon':
						writer.addIcon(id, value)
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
			v.assert(MetadataSchemaStrict, mergedMetadata)
			writer.setMetadata(mergedMetadata)
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
