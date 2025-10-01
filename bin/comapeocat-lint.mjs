#!/usr/bin/env node
import { Command } from 'commander'
import { lint } from './helpers/lint.js'
import { isParseError } from '../src/lib/errors.js'

const program = new Command()

program
	.description('Lint preset and field JSON files')
	.argument(
		'[inputDir]',
		'directory containing presets, fields, defaults and icons',
		process.cwd(),
	)
	.action(async (dir) => {
		try {
			await lint(dir)
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
