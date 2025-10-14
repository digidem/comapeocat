#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'

import { Command } from '@commander-js/extra-typings'
import { escapePath } from 'dot-prop-extra'
import stableStringify from 'safe-stable-stringify'

import { readFiles } from './helpers/read-files.js'

const program = new Command()

program
	.description('Extract messages for translation from <inputDir>')
	.argument(
		'[inputDir]',
		'directory containing categories, fields, and icons',
		process.cwd(),
	)
	.option('-o, --output <file>', 'output JSON file path (defaults to stdout)')
	.action(async (inputDir, { output }) => {
		/** @type {import('../src/schema/messages.js').MessagesOutput} */
		const messages = {}
		for await (const { type, id, value } of readFiles(inputDir)) {
			const escapedId = escapePath(id)
			switch (type) {
				case 'category':
					messages[`category.${escapedId}.name`] = {
						description: `The name of category '${id}'`,
						message: value.name,
					}
					// Not currently used in the app, so don't extract for translation
					// messages[`category.${escapedId}.terms`] = {
					// 	description: `Comma-separated search terms for category '${id}'`,
					// 	message: value.terms.join(',') || '',
					// }
					break
				case 'field':
					messages[`field.${escapedId}.label`] = {
						description: `Label for field '${id}'`,
						message: value.label,
					}

					if (typeof value.helperText === 'string') {
						messages[`field.${escapedId}.helperText`] = {
							description: `Descriptive text shown under the label for field '${id}'`,
							message: value.helperText,
						}
					}

					if (typeof value.placeholder === 'string') {
						messages[`field.${escapedId}.placeholder`] = {
							description: `Example input for field '${id}' (only visible for text and number fields)`,
							message: value.placeholder,
						}
					}

					if ('options' in value && Array.isArray(value.options)) {
						for (const { label, value: optionValue } of value.options) {
							messages[
								`field.${escapedId}.options[value=${JSON.stringify(optionValue)}].label`
							] = {
								description: `Label for option '${optionValue}' of field '${id}'`,
								message: label,
							}
						}
					}
					break
			}
		}
		const messagesJson = stableStringify(messages, null, 2)
		if (output) {
			await fs.mkdir(path.dirname(output), { recursive: true })
			await fs.writeFile(output, messagesJson)
			console.log(`Wrote messages to ${output}`)
		} else {
			process.stdout.write(messagesJson)
		}
	})

program.parseAsync(process.argv)
