import type { PresetOutput } from '../src/schema/preset.js'
import type { FieldOutput } from '../src/schema/field.js'
import type { PresetValue, FieldValue } from '@comapeo/schema'
import type { ExtendsStrict } from 'type-fest'

// No schemaName, and refs are strings not objects, without `Ref` or `Refs` suffix
type Expected<T> = Omit<T, 'schemaName' | `${string}Refs` | `${string}Ref`> & {
	[K in keyof T as K extends `${infer Prefix}Refs`
		? `${Prefix}s`
		: K extends `${infer Prefix}Ref`
			? Prefix
			: never]: K extends `${string}Refs`
		? string[]
		: K extends `${string}Ref`
			? string
			: never
}

// Check our Except utility type works as intended
Expect<
	ExtendsStrict<
		{ user: string; orders: string[] },
		Expected<{
			schemaName: 'foo'
			userRef: { id: string }
			orderRefs: { id: string }[]
		}>
	>
>
Expect<ExtendsStrict<PresetOutput, Expected<PresetValue>>>
Expect<ExtendsStrict<FieldOutput, Expected<FieldValue>>>

function Expect<T extends true>() {}
