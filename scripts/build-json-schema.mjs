#!/usr/bin/env node

import fs from 'node:fs'
import { toJsonSchema } from '@valibot/to-json-schema'
import { PresetSchemaStrict } from '../src/schema/preset.js'
import { FieldSchemaStrict } from '../src/schema/field.js'
import { DefaultsSchemaStrict } from '../src/schema/defaults.js'

const outDir = new URL('../dist/schema/', import.meta.url)

fs.rmSync(outDir, { recursive: true, force: true })
fs.mkdirSync(outDir, { recursive: true })

const presetSchemaJson = toJsonSchema(PresetSchemaStrict, {
	typeMode: 'input',
	ignoreActions: ['check'],
})
const fieldSchemaJson = toJsonSchema(FieldSchemaStrict, {
	typeMode: 'input',
	ignoreActions: ['check'],
})
const defaultsSchemaJson = toJsonSchema(DefaultsSchemaStrict, {
	typeMode: 'input',
})

fs.writeFileSync(
	new URL('preset.json', outDir),
	JSON.stringify(presetSchemaJson, null, 2),
)
fs.writeFileSync(
	new URL('field.json', outDir),
	JSON.stringify(fieldSchemaJson, null, 2),
)
fs.writeFileSync(
	new URL('defaults.json', outDir),
	JSON.stringify(defaultsSchemaJson, null, 2),
)
