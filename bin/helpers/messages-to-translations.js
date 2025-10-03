import { unEscapePath } from '../../src/lib/utils.js'

/** @import {TranslationsOutput} from '../../src/schema/translations.js' */

/**
 * @typedef {object} ParsedMessageId
 * @property {string} docType - 'preset' or 'field'
 * @property {string} docId - The ID of the preset or field
 * @property {string} propertyRef - The property reference in dot-prop notation (e.g. 'name', 'options.0.label')
 */

// Regex to split on dots NOT preceded by a backslash
const UNESCAPED_DOTS_REGEX = /(?<!\\)\./g

/**
 * Convert a record of messages to a TranslationsOutput structure
 *
 * @param {import('../../src/schema/messages.js').MessagesOutput} messages
 * @returns {TranslationsOutput}
 */
export function messagesToTranslations(messages) {
	/** @type {Required<TranslationsOutput>} */
	const translations = { preset: {}, field: {} }

	for (const [messageId, value] of Object.entries(messages)) {
		if (!value?.message) continue
		const { docType, docId, propertyRef } = parseMessageId(messageId)

		if (docType === 'preset' || docType === 'field') {
			translations[docType][docId] = {
				...translations[docType][docId],
				[propertyRef]: value.message,
			}
		} else {
			throw new Error(`Invalid message ID: ${messageId}`)
		}
	}

	return translations
}

/**
 * Parse a message ID into its components
 * @param {string} messageId
 * @returns {{docType: string, docId: string, propertyRef: string}}
 */
export function parseMessageId(messageId) {
	const [docType, escapedId, ...rest] = messageId.split(UNESCAPED_DOTS_REGEX)
	const docId = unEscapePath(escapedId)
	const propertyRef = rest.join('.')
	if (!docType || !docId || !propertyRef) {
		throw new Error(`Invalid message ID: ${messageId}`)
	}
	return { docType, docId, propertyRef }
}
