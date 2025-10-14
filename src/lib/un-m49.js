import { iso31661Alpha3ToAlpha2 } from 'iso-3166'
import { unM49 as unM49Array } from 'un-m49'

/**
 * Map of UN M.49 country codes to their corresponding ISO 3166-1 alpha-2 country codes.
 */
const unM49ToIso31661Alpha2 = new Map()

for (const region of unM49Array) {
	if (!region.iso3166) continue
	const alpha2 = iso31661Alpha3ToAlpha2[region.iso3166]
	if (!alpha2) continue
	unM49ToIso31661Alpha2.set(region.code, alpha2)
}

/**
 * Convert a UN M49 geographical region code to its corresponding ISO 3166-1
 * alpha-2 country code if it's a country code, otherwise return the original UN
 * M49 code.
 * @param {string} code - The UN M49 geographical region code to convert.
 */
export function normalizeUnM49ToIso31661Alpha2(code) {
	return unM49ToIso31661Alpha2.get(code) || code
}

/**
 * Set of all valid UN M.49 geographical region codes.
 */
export const unM49 = new Set(unM49Array.map((region) => region.code))
