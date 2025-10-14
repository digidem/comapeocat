import { parse as parseBcp47 } from 'bcp-47'
import { bcp47Normalize } from 'bcp-47-normalize'

import { iso6391 } from '../generated/iso6391.js'
import { iso6393 } from '../generated/iso6393.js'
import { iso31661Alpha2 } from './iso31661-alpha-2.js'
import { unM49 } from './un-m49.js'

/**
 * Validate and normalize an IETF BCP 47 language tag:
 *
 * - normalizes the tag with https://github.com/wooorm/bcp-47-normalize
 * - checks primary language subtag against ISO 639-1 and ISO 639-3
 * - checks region subtag against ISO 3166-1 alpha-2 and UN M.49
 *
 * Note that some valid BCP 47 tags may be rejected if they use a primary
 * language subtag that is not in ISO 639-1 or ISO 639-3. CoMapeo only supports
 * these language codes at this time.
 *
 * @param {string} tag - The BCP 47 language tag to validate.
 * @returns {string} The normalized BCP 47 language tag.
 * @throws {Error} If the tag is not a valid BCP 47 language tag.
 */
export function validateBcp47(tag) {
	const normalized = bcp47Normalize(tag)
	const { language: primaryLanguageSubtag, region: regionSubtag } =
		parseBcp47(normalized)

	if (!primaryLanguageSubtag) {
		throw new Error(`Invalid BCP 47 tag: ${tag}`)
	}

	if (
		!iso6391.has(primaryLanguageSubtag) &&
		!iso6393.has(primaryLanguageSubtag)
	) {
		throw new Error(`Invalid primary language subtag: ${primaryLanguageSubtag}`)
	}

	if (
		regionSubtag &&
		!iso31661Alpha2.has(regionSubtag) &&
		!unM49.has(regionSubtag)
	) {
		throw new Error(`Invalid region subtag: ${regionSubtag}`)
	}

	return normalized
}
