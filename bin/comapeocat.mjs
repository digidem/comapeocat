#!/usr/bin/env node
import { Command } from 'commander'

const program = new Command()

program
	.name('comapeocat')
	.description(
		'A CLI tool for managing categories, fields and icons for Comapeo',
	)
	.command('lint', 'Lint category, field and icon files')
	.command(
		'build',
		'Build a .comapeocat archive from a directory of category, field and icon files',
	)
	.command('messages', 'Extract messages for translation')
	.command('validate', 'Validate a .comapeocat archive')

program.parse(process.argv)
