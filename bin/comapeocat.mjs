#!/usr/bin/env node
import { Command } from 'commander'

const program = new Command()

program
	.name('comapeocat')
	.description('A CLI tool for managing categories and presets for Comapeo')
	.version('1.0.0')
	.command('lint', 'Lint preset and field JSON files')
	.command('build', 'Build a .comapeocat file from a directory of JSON files')

program.parse(process.argv)
