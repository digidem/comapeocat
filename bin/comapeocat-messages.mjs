#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'

import { Command } from '@commander-js/extra-typings'
import { escapePath } from 'dot-prop'

import { readFiles } from './helpers/read-files.js'

const program = new Command()

program
	.description('Extract messages for translation from <inputDir>')
	.argument(
		'[inputDir]',
		'directory containing presets, fields, defaults and icons',
		process.cwd(),
	)
	.option('-o, --output <file>', 'output JSON file path (defaults to stdout)')
	.action(async (inputDir, { output }) => {
		/** @type {import('../src/schema/messages.js').MessagesOutput} */
		const messages = {}
		for await (const { type, id, value } of readFiles(inputDir)) {
			const escapedId = escapePath(id)
			switch (type) {
				case 'preset':
					messages[`preset.${escapedId}.name`] = {
						description: `The name of category '${id}'`,
						message: value.name,
					}
					// Not currently used in the app, so don't extract for translation
					// messages[`preset.${escapedId}.terms`] = {
					// 	description: `Comma-separated search terms for category '${id}'`,
					// 	message: value.terms.join(',') || '',
					// }
					break
				case 'field':
					messages[`field.${escapedId}.label`] = {
						description: `Label for field '${id}'`,
						message: value.label || '',
					}

					messages[`field.${escapedId}.helperText`] = {
						description: `Descriptive text shown under the label for field '${id}'`,
						message: value.helperText || '',
					}

					messages[`field.${escapedId}.placeholder`] = {
						description: `Example input for field '${id}' (only visible for text and number fields)`,
						message: value.placeholder || '',
					}

					if ('options' in value && Array.isArray(value.options)) {
						for (const [index, option] of value.options.entries()) {
							messages[`field.${escapedId}.options.${index}.label`] = {
								description: `Label for option '${option.value}' (option ${index}) of field '${id}'`,
								message: option.label,
							}
						}
					}
					break
			}
		}
		const messagesJson = JSON.stringify(messages, null, 2)
		if (output) {
			await fs.mkdir(path.dirname(output), { recursive: true })
			await fs.writeFile(output, messagesJson)
			console.log(`Wrote messages to ${output}`)
		} else {
			process.stdout.write(messagesJson)
		}
	})

program.parseAsync(process.argv)
