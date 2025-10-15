#!/usr/bin/env node
import { Command } from 'commander'

import { isParseError } from '../src/lib/errors.js'
import { Reader } from '../src/reader.js'

const program = new Command()

program
	.description('Validate a .comapeocat archive')
	.argument('<inputFile>', '.comapeocat archive file to validate')
	.action(async (file) => {
		try {
			const reader = new Reader(file)
			await reader.validate()
			console.log(`${file} is a valid .comapeocat archive`)
		} catch (err) {
			if (isParseError(err)) {
				// For parse errors, don't print full stack trace and error properties,
				// which can confuse the user.
				console.error(err.message)
			} else {
				console.error(err)
			}
			process.exit(1)
		}
	})

program.parseAsync(process.argv)
