import { optimize } from 'svgo'
import { InvalidSvgError } from './errors.js'

/**
 * Optimizes an SVG string by removing unnecessary attributes and elements.
 * @param {string} svg - The SVG string to optimize.
 * @returns {string} - The optimized SVG string.
 * @throws {InvalidSvgError} When the SVG is invalid or cannot be parsed
 */
export function parseSvg(svg) {
	try {
		const result = optimize(svg, {
			plugins: [
				'preset-default',
				// Removes width and height attributes and adds a viewBox if not present
				'removeDimensions',
				// Removes <script> elements
				'removeScripts',
			],
		})
		return result.data // Return the optimized SVG
	} catch (error) {
		throw new InvalidSvgError({
			cause: error instanceof Error ? error : new Error(String(error)),
		})
	}
}
