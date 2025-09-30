#!/usr/bin/env node
import { Command } from 'commander'
import { lint } from '../src/lint.js'
import { isParseError } from '../src/lib/errors.js'

const program = new Command()

program.description('Lint preset and field JSON files').action(async () => {
	try {
		await lint(process.cwd())
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
