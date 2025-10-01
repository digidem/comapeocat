// https://github.com/sindresorhus/dot-prop/blob/66a5f1f5e444569c0532c1531de38ef39da178ea/index.js
// MIT License
// Copyright (c) Sindre Sorhus <sindresorhus@gmail.com>

const disallowedKeys = new Set(['__proto__', 'prototype', 'constructor'])

const digits = new Set('0123456789')

/**
 * Splits a dot-prop path into its segments, supporting escaped dots and array indices.
 * @param {string} path
 */
export function getPathSegments(path) {
	const parts = []
	let currentSegment = ''
	let currentPart = 'start'
	let isIgnoring = false

	for (const character of path) {
		switch (character) {
			case '\\': {
				if (currentPart === 'index') {
					throw new Error('Invalid character in an index')
				}

				if (currentPart === 'indexEnd') {
					throw new Error('Invalid character after an index')
				}

				if (isIgnoring) {
					currentSegment += character
				}

				currentPart = 'property'
				isIgnoring = !isIgnoring
				break
			}

			case '.': {
				if (currentPart === 'index') {
					throw new Error('Invalid character in an index')
				}

				if (currentPart === 'indexEnd') {
					currentPart = 'property'
					break
				}

				if (isIgnoring) {
					isIgnoring = false
					currentSegment += character
					break
				}

				if (disallowedKeys.has(currentSegment)) {
					return []
				}

				parts.push(currentSegment)
				currentSegment = ''
				currentPart = 'property'
				break
			}

			case '[': {
				if (currentPart === 'index') {
					throw new Error('Invalid character in an index')
				}

				if (currentPart === 'indexEnd') {
					currentPart = 'index'
					break
				}

				if (isIgnoring) {
					isIgnoring = false
					currentSegment += character
					break
				}

				if (currentPart === 'property') {
					if (disallowedKeys.has(currentSegment)) {
						return []
					}

					parts.push(currentSegment)
					currentSegment = ''
				}

				currentPart = 'index'
				break
			}

			case ']': {
				if (currentPart === 'index') {
					parts.push(Number.parseInt(currentSegment, 10))
					currentSegment = ''
					currentPart = 'indexEnd'
					break
				}

				if (currentPart === 'indexEnd') {
					throw new Error('Invalid character after an index')
				}

				// Falls through
			}

			default: {
				if (currentPart === 'index' && !digits.has(character)) {
					throw new Error('Invalid character in an index')
				}

				if (currentPart === 'indexEnd') {
					throw new Error('Invalid character after an index')
				}

				if (currentPart === 'start') {
					currentPart = 'property'
				}

				if (isIgnoring) {
					isIgnoring = false
					currentSegment += '\\'
				}

				currentSegment += character
			}
		}
	}

	if (isIgnoring) {
		currentSegment += '\\'
	}

	switch (currentPart) {
		case 'property': {
			if (disallowedKeys.has(currentSegment)) {
				return []
			}

			parts.push(currentSegment)

			break
		}

		case 'index': {
			throw new Error('Index was not closed')
		}

		case 'start': {
			parts.push('')

			break
		}
		// No default
	}

	return parts
}
