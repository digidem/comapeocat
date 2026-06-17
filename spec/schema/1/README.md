# CoMapeo Categories Schema Specification

**Version:** 1
**Date:** 2026-06-12

## 1. Introduction

This document specifies the schema (the content vocabulary) of a CoMapeo
Categories archive: which content files the archive contains and what they
may contain. The structure of the archive itself — the ZIP format, naming
and encoding rules, the `VERSION` file, `metadata.json` and limits — is
specified by the [container specification](../../container/). The boundary
between the two specifications is defined there.

The schema version is a single integer, incremented for every revision.
Revisions MUST be additive: every file valid under an earlier revision
remains valid under later ones, so a reader supporting revision N reads all
files stamped with revisions 1 through N. Changes that would invalidate
existing files are outside this versioning scheme entirely; they would
require a coordinated breaking release of the container format.

A file declares the revision it requires via the `minSchemaVersion` property
in `metadata.json` (see the container specification). A reader MUST reject a
file whose `minSchemaVersion` exceeds the revision it supports, rather than
reading the file while skipping the content that revision gates. (Tolerating
individually unrecognized entries and properties _within_ a file the reader
is permitted to read is a separate rule, defined in Section 5.7.)

The key words "MUST", "MUST NOT", "REQUIRED", "SHOULD", "SHOULD NOT", "MAY",
and "OPTIONAL" in this document are to be interpreted as described in
[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

Schema revision 1 defines the same vocabulary as the combined
[1.0 specification](../../1.0/README.md): files conforming to that
specification conform to this one.

## 2. Content Files

| File                            | Required | Contents                                                                    |
| ------------------------------- | -------- | --------------------------------------------------------------------------- |
| `categories.json`               | Yes      | Map of category ID to category ([category.json](./category.json))           |
| `categorySelection.json`        | Yes      | Category display order ([categorySelection.json](./categorySelection.json)) |
| `fields.json`                   | No       | Map of field ID to field ([field.json](./field.json))                       |
| `icons/<icon-id>.svg`           | No       | SVG icon content (Section 5.4)                                              |
| `translations/<bcp47-tag>.json` | No       | Translated strings ([translations.json](./translations.json))               |

All content files are located relative to the archive root. Translation
files MUST be named using a valid BCP 47 language tag; writers SHOULD only
use language and region subtags unless other subtags are needed, and SHOULD
only include files with valid tags.

### 2.1. Identifiers

Category and field IDs are the keys of `categories.json` and `fields.json`;
icon IDs are icon entry names with the final `.svg` removed. Within each
file, IDs MUST be non-empty and unique. All ID comparisons — including
resolving a category's `icon` to an `icons/<icon-id>.svg` entry — are
byte-exact over the UTF-8 encoding of the name, with no case-folding or
Unicode normalization; a writer MUST therefore emit a reference and its
target entry name identically.

## 3. Normative Schemas

The JSON Schema documents in this directory are the normative definition of
the content vocabulary for this schema revision. They are generated from the
validation schemas in `src/schema/` (the source of truth) by
`node scripts/build-spec-schemas.mjs`, and CI verifies they match the code.

The schemas describe what a _reader_ accepts, which deliberately includes
forward-compatibility affordances (e.g. unknown document types in
`appliesTo`, see Section 5.1). Validation against these schemas is necessary
but not sufficient: the behavioral rules in Section 5 add constraints JSON
Schema cannot express (for example, that a category must apply to at least
one _known_ document type).

## 4. Feature Detectors and Criticality

When a schema revision adds vocabulary, each addition is classified
**critical** or **ignorable**. This determines the `minSchemaVersion` a
writer assigns to files that use it (container specification Section 6.3):

- **Critical** (the default): a writer that emits the feature MUST raise the
  file's `minSchemaVersion` to the revision that introduced it, so readers
  predating the feature reject the file rather than importing it without the
  feature.
- **Ignorable**: the feature does not raise `minSchemaVersion`; older readers
  read the file and ignore the content they do not recognize (Section 5.7).
  Use this only when dropping the content loses nothing — imported content is
  synced to every project member, so content dropped at import is lost
  project-wide, not merely degraded on one device.

In this reference implementation, criticality is expressed by registering a
feature detector in `src/lib/schema-features.js`, from which the writer
computes `minSchemaVersion`, and the choice is enforced in CI. Other
implementations need only honor the `minSchemaVersion` rule above; either
way, treating a feature as ignorable should be a recorded decision noted in
the changelog (Section 6).

## 5. Behavioral Requirements

Requirements that JSON Schema cannot express:

### 5.1. Categories

- `categories.json` MUST contain at least one category that applies to each
  of the document types `observation` and `track`
- Readers MUST accept unknown document types in `appliesTo` (forward
  compatibility) and MUST ignore them; a category whose `appliesTo` contains
  _only_ unknown document types is invalid. "Applies to `<type>`" means the
  `appliesTo` array contains `<type>` as an exact string
- How categories are applied to map entities — which category matches an
  entity's tags, and how `addTags`/`removeTags` modify an entity when its
  category is set or changed — is consuming-application behavior and out of
  scope here. The related category-schema descriptions ("the one that matches
  the most tags is used"; the `addTags`/`removeTags` defaulting) are
  informative, not normative reader requirements

### 5.2. Fields

- Within a select field, options MUST be unique by their `value`, compared by
  JSON type and value (so the string `"1"` and the number `1` are distinct)

### 5.3. References

- Field IDs referenced by a category's `fields` array MUST exist in
  `fields.json`
- Icon IDs referenced by a category's `icon` property MUST exist in the
  `icons/` directory (as `icons/<icon-id>.svg`)
- Category IDs referenced in `categorySelection.json` MUST exist in
  `categories.json`, and each referenced category MUST include the
  corresponding document type in its `appliesTo` array
- Fields and icons that are not referenced by any category are permitted;
  readers MAY warn about them

### 5.4. Icons

- Icon files MUST contain valid SVG XML content in UTF-8 encoding
- Icon file names (without the `.svg` extension) are the icon IDs referenced
  from categories

### 5.5. Translations

- A translation file is a JSON object nested three levels deep:

  ```json
  {
  	"<docType>": {
  		"<docId>": {
  			"<propertyRef>": "translated string"
  		}
  	}
  }
  ```

  where `<docType>` is `category` or `field`, `<docId>` is the ID of the
  category or field being translated, and `<propertyRef>` references the
  property whose value is translated. A reader MUST ignore unknown
  `<docType>` keys (forward compatibility); a file MAY contain only one of
  `category` or `field`, or neither

- Message keys (`<propertyRef>`) use the property name of the category or
  field being translated, with dot-notation for nested properties and a filter
  notation for array items, e.g. `options[value="healthy"].label` translates
  the label of the option with value `"healthy"`
- Readers SHOULD ignore translation files with invalid or unsupported BCP 47
  language tags
- Readers MAY ignore entries whose property reference or document ID does not
  correspond to an existing category or field
- Languages MAY have different coverage; not all properties need translations
  in every language

### 5.6. Category Selection

- Category-ID order within each document-type array of
  `categorySelection.json` is significant and MUST be preserved; it is the
  order in which the consuming application presents categories for that
  document type

### 5.7. Unknown Properties

- Readers MUST ignore unknown properties within content files and MUST NOT
  reject a file solely because a content object carries a property the reader
  does not recognize. This is the property-level analog of the container
  specification's rule that readers ignore unrecognized archive entries.
- This tolerance is the degradation path for **ignorable** additions
  (Section 4): an older reader silently drops content it does not understand.
  Authors MUST NOT rely on it to deliver meaningful new content to older
  readers. Any addition whose loss would matter MUST instead be made
  **critical** — registered as a feature detector so the writer raises
  `minSchemaVersion` and older readers reject the file rather than dropping
  the content.

## 6. Changes

- **1** — Initial vocabulary, identical to the combined
  [1.0 specification](../../1.0/README.md). Field types: `text`, `number`,
  `selectOne`, `selectMultiple`. Document types: `observation`, `track`.
