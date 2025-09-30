import { optimize } from 'svgo'

/**
 * Optimizes an SVG string by removing unnecessary attributes and elements.
 * @param {string} svg - The SVG string to optimize.
 * @returns {string} - The optimized SVG string.
 */
export function parseSvg(svg) {
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
}
