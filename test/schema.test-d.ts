import type { PresetValue, FieldValue } from '@comapeo/schema'
import type { ExtendsStrict } from 'type-fest'

import type { CategoryOutput } from '../src/schema/category.js'
import type { FieldOutput } from '../src/schema/field.js'

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

// Check our Expected utility type works as intended
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

// CategoryOutput deliberately diverges from PresetValue: PresetValue.geometry
// (point/line/area/etc) was replaced with appliesTo (observation/track) in https://github.com/digidem/comapeocat/pull/12
type ExpectedCategory = Omit<Expected<PresetValue>, 'geometry'> & {
	appliesTo: ('observation' | 'track')[]
}
Expect<ExtendsStrict<CategoryOutput, ExpectedCategory>>
Expect<ExtendsStrict<FieldOutput, Expected<FieldValue>>>

function Expect<T extends true>() {}
