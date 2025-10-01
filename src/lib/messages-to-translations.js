import { unEscapePath } from './utils.js'
/** @import {TranslationsOutput} from '../schema/translations.js' */

// Regex to split on dots NOT preceded by a backslash
const UNESCAPED_DOTS_REGEX = /(?<!\\)\./g

/**
 * @param {import('../schema/messages.js').MessagesOutput} messages
 * @returns {TranslationsOutput}
 */
export function messagesToTranslations(messages) {
	/** @type {TranslationsOutput} */
	const translations = { preset: {}, field: {} }

	for (const [messageId, value] of Object.entries(messages)) {
		if (!value?.message) continue
		const [type, escapedId, ...rest] = messageId.split(UNESCAPED_DOTS_REGEX)
		const id = unEscapePath(escapedId)
		const propertyRef = rest.join('.')

		if (type === 'preset' || type === 'field') {
			const translation = {
				propertyRef,
				message: value.message,
			}
			if (translations[type][id]) {
				translations[type][id].push(translation)
			} else {
				translations[type][id] = [translation]
			}
		} else {
			throw new Error(`Invalid message ID: ${messageId}`)
		}
	}

	return translations
}
