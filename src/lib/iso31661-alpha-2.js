import { iso31661 } from 'iso-3166'

/**
 * Set of all valid ISO 3166-1 alpha-2 country codes.
 */
export const iso31661Alpha2 = new Set(iso31661.map((country) => country.alpha2))
