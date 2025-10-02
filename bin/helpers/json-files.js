import fs from 'node:fs/promises'

import parseJson from 'parse-json'
import path from 'path'

import { isNotFoundError } from '../../src/lib/utils.js'

/**
 * Async generator to read all JSON files in a directory
 * @param {string} dir - Directory path
 * @returns {AsyncGenerator<{name: string, data: unknown}>} Yields objects with file name and parsed JSON data
 */

export async function* jsonFiles(dir, { recursive = true } = {}) {
	let entries
	try {
		entries = await fs.readdir(dir, { recursive })
	} catch (err) {
		// If directory doesn't exist, just return without yielding anything
		if (isNotFoundError(err)) return
		throw err
	}
	for (const entry of entries) {
		if (path.extname(entry) !== '.json') continue
		const json = await fs.readFile(path.join(dir, entry), 'utf-8')
		// Use parse-json to get better error messages
		const data = parseJson(json)
		yield { name: entry, data }
	}
}
