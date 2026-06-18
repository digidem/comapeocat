# CoMapeo Categories File Format Specifications

The CoMapeo Categories file format (`.comapeocat`) is specified in two
documents with independent version ladders:

- **[Container specification](./container/)** — a prose specification of the
  archive structure: the ZIP format, naming and encoding rules, the `VERSION`
  file, `metadata.json`, limits, and how readers decide whether they can read
  a file. Changes rarely. It owns everything a reader needs _before_ it can
  decide whether it understands the file.
- **[Schema specification](./schema/)** — the content of the archive: which
  content files exist, whether they are required, and what they contain.
  Defined primarily by versioned JSON Schema snapshots generated from the
  validation code in `src/schema/` (the source of truth), plus a short README
  per version with behavioral rules and a changelog. Evolves as CoMapeo
  applications add capabilities (e.g. new field types).

`spec/1.0/` is the original combined specification, retained as the
authoritative document for files written at container version 1.0. The split
specifications apply from container version 2.0 — a major bump even though
the structural changes are additive, because readers conforming to container
1.0 do not perform the schema version check and could import files using
newer vocabulary lossily. From 2.0 onward, vocabulary additions only need a
schema version bump.

## How a reader decides it can read a file

A file declares two versions, checked independently:

1. **Container version** — the `VERSION` file at the archive root
   (`MAJOR.MINOR`). A reader MUST reject files whose major version is greater
   than the container major version it supports.
2. **Minimum schema version** — the optional `minSchemaVersion` property in
   `metadata.json` (a positive integer revision, absent means `1`). A reader
   MUST reject files whose `minSchemaVersion` is greater than the schema
   revision it supports.

Writers compute `minSchemaVersion` from the features _actually used_ in the
file ("version needed to read"). A file built by a writer that supports
schema revision 2 but uses no revision-2 features declares
`minSchemaVersion: 1`, and remains readable by readers that only support
revision 1.

## Which specification a change belongs to

The rule (defined normatively in the container specification): the container
owns everything a reader needs before it can decide whether it understands
the file; everything gated by `minSchemaVersion` is schema.

| Change                                                              | Specification | Bump                          |
| ------------------------------------------------------------------- | ------------- | ----------------------------- |
| New field type, document type, or category/field property           | Schema        | Revision (must stay additive) |
| Loosened validation rules for content files                         | Schema        | Revision                      |
| Added content files or directories                                  | Schema        | Revision (new files optional) |
| Changed `VERSION`/`metadata.json` semantics, archive format, limits | Container     | Minor or major                |

The schema version is a single integer revision, and revisions MUST be
additive: every file valid under an earlier revision remains valid. Readers
reject files that _use_ new vocabulary via `minSchemaVersion`, so additions
never require a container bump. A change that would invalidate existing
files is outside the revision scheme entirely and requires a coordinated
breaking release of the container format.

Every schema revision that adds a **critical** feature (content older
readers must not import lossily) MUST register a feature detector in
`src/lib/schema-features.js` so writers stamp the correct `minSchemaVersion`.
This is enforced in CI. Deliberately omitting a detector marks a feature as
ignorable by older readers — see "Feature Detectors and Criticality" in the
schema specification.

## Version history

| Container | Schema | Library    | Notes                                                          |
| --------- | ------ | ---------- | -------------------------------------------------------------- |
| 1.0       | 1      | ≤ 1.1.x    | Combined specification ([spec/1.0](./1.0/README.md))           |
| 2.0       | 1      | unreleased | Split specifications; `metadata.json` gains `minSchemaVersion` |
