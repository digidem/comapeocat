import { Valimock as ValimockOriginal } from 'valimock'

export class Valimock {
	#valimockOriginal
	/** @param {import("valimock").ValimockOptions} options */
	constructor(options) {
		this.#valimockOriginal = new ValimockOriginal(options)
	}
	/** @type {ValimockOriginal['mock']} */
	mock(schema) {
		const instance = this.#valimockOriginal.mock(schema)
		if ('options' in instance && Array.isArray(instance.options)) {
			// Filter out any duplicate options by value
			instance.options = instance.options.filter(
				(option, index, self) =>
					index === self.findIndex((o) => o.value === option.value),
			)
		}
		return instance
	}
}
