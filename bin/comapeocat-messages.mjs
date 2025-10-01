#!/usr/bin/env node

import { Command } from '@commander-js/extra-typings'
import fs from 'node:fs/promises'
import { readFiles } from '../src/lib/read-files.js'
import { escapePath } from 'dot-prop'
import { assertValidBCP47 } from '../src/lib/utils.js'
import { MESSAGES_DIR } from '../src/lib/constants.js'
import path from 'node:path'

const program = new Command()

program
	.description('Extract messages for translation from <inputDir>')
	.argument(
		'[inputDir]',
		'directory containing presets, fields, defaults and icons',
		process.cwd(),
	)
	.option('--lang <lang>', 'language code for the messages', 'en')
	.action(async (inputDir, { lang }) => {
		assertValidBCP47(lang)
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
					messages[`preset.${escapedId}.terms`] = {
						description: `List of search terms for category '${id}'`,
						message: value.terms.join(',') || '',
					}
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
							messages[`field.${escapedId}.options.${index}`] = {
								description: `Label for option '${option.value}' (option ${index}) of field '${id}'`,
								message: option.label,
							}
						}
					}
					break
			}
		}
		const output = JSON.stringify(messages, null, 2)
		const outputFile = path.join(inputDir, MESSAGES_DIR, `${lang}.json`)
		await fs.mkdir(path.dirname(outputFile), { recursive: true })
		await fs.writeFile(outputFile, output)
	})

program.parseAsync(process.argv)
