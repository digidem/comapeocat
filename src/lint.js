import { readFiles } from './lib/read-files.js'

/**
 * Lint and validate categories in a folder
 * @param {string} dir - Directory path
 */
export async function lint(dir) {
	const counts = {
		preset: 0,
		field: 0,
		icon: 0,
		defaults: 0,
	}
	for await (const { type } of readFiles(dir)) {
		counts[type]++
	}
	const successMessage = Object.entries(counts)
		.map(
			([type, count]) => `✓ ${count} valid ${type} file${count > 1 ? 's' : ''}`,
		)
		.join('\n')
	console.log(successMessage)
}
