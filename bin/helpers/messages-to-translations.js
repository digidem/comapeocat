import { unEscapePath } from '../../src/lib/utils.js'

/** @import {TranslationsOutput} from '../../src/schema/translations.js' */

// Regex to split on dots NOT preceded by a backslash
const UNESCAPED_DOTS_REGEX = /(?<!\\)\./g

/**
 * @param {import('../../src/schema/messages.js').MessagesOutput} messages
 * @returns {TranslationsOutput}
 */
export function messagesToTranslations(messages) {
	/** @type {Required<TranslationsOutput>} */
	const translations = { preset: {}, field: {} }

	for (const [messageId, value] of Object.entries(messages)) {
		if (!value?.message) continue
		const [type, escapedId, ...rest] = messageId.split(UNESCAPED_DOTS_REGEX)
		const id = unEscapePath(escapedId)
		const propertyRef = rest.join('.')

		if (type === 'preset' || type === 'field') {
			translations[type][id] = {
				...translations[type][id],
				[propertyRef]: value.message,
			}
		} else {
			throw new Error(`Invalid message ID: ${messageId}`)
		}
	}

	return translations
}
