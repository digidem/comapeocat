# CoMapeo Categories Container Specification

**Version:** 2.0
**Date:** 2026-06-12
**File Extension:** `.comapeocat`

## 1. Introduction

This document specifies the container format for CoMapeo Categories files: a
ZIP-based archive format for packaging and distributing category definitions,
custom fields, and icons for use in CoMapeo applications.

This specification covers only the structure of the archive: the ZIP format,
naming and encoding rules, the `VERSION` file, `metadata.json`, limits, and
how readers decide whether they can read a file. The content of the archive —
which content files exist, whether they are required, and what they contain —
is specified by the [schema specification](../../schema/), which has its own
version ladder. Section 11 defines the boundary between the two
specifications.

Container version 2.0 supersedes the structural sections of the combined
[1.0 specification](../../1.0/README.md). The changes from 1.0 are the
addition of the OPTIONAL `minSchemaVersion` property in `metadata.json`
(Section 6), the schema version compatibility rule (Section 5.4), and
explicit per-entry size limits — including a cap on JSON entries that 1.0 did
not define (Section 7.1).

This is a **major** bump despite being structurally additive: container 1.0
readers do not perform the schema version check (Section 5.4), so they could
import files using newer vocabulary lossily. The major bump makes them reject
all 2.0+ files with a clear version error instead. Readers conforming to this
specification MUST still accept container 1.x files.

## 2. Conventions and Terminology

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD",
"SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be
interpreted as described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

### 2.1. Definitions

- **Container version**: The version of this specification, declared in the
  `VERSION` file
- **Schema version**: The revision (a single integer) of the
  [schema specification](../../schema/) that defines the content of the
  archive
- **Content file**: Any entry in the archive other than `VERSION` and
  `metadata.json`, as defined by the schema specification
- **Reader**: An implementation that opens and parses `.comapeocat` files
- **Writer**: An implementation that produces `.comapeocat` files

## 3. File Format Overview

A CoMapeo Categories file (`.comapeocat`) is a ZIP archive (compression is
specified in Section 7.2).

### 3.1. MIME Type

The RECOMMENDED MIME type for `.comapeocat` files is:

```
application/vnd.comapeo.categories+zip
```

### 3.2. Character Encoding

All text content within the archive MUST use UTF-8 encoding.

## 4. Archive Structure

The archive MUST be a valid ZIP file.

The archive contains two files defined by this specification, both at the
root of the archive:

- `VERSION` (required, Section 5)
- `metadata.json` (required, Section 6)

All other entries are content files, defined by the
[schema specification](../../schema/) at the version declared by
`minSchemaVersion`. Readers MUST ignore entries they do not recognize: future
schema versions may add content files, gated by `minSchemaVersion`, without a
change to this specification.

### 4.1. File Naming

- File names MUST use forward slashes (`/`) as path separators
- File names MUST NOT contain leading or trailing whitespace
- Writers MUST NOT produce two entries with the same name; readers SHOULD
  reject archives containing duplicate entry names. A reader that does not
  reject MUST resolve the ambiguity deterministically (for example, by always
  using the first matching entry and ignoring the rest), because tools that
  disagree on which entry wins are a known archive-confusion attack vector

### 4.2. Example Layout

The layout below is informative; the content files shown are those defined by
schema revision 1:

```
archive.comapeocat
├── VERSION                  (container: required)
├── metadata.json            (container: required)
├── categories.json          (schema-defined)
├── categorySelection.json   (schema-defined)
├── fields.json              (schema-defined)
├── icons/                   (schema-defined)
│   └── tree.svg
└── translations/            (schema-defined)
    └── es.json
```

## 5. Version File

### 5.1. Location

The version file MUST be named `VERSION` and MUST be located at the root of
the archive. It MUST NOT exceed 100 bytes.

### 5.2. Format

The version file MUST contain the container version as a string in the format
`MAJOR.MINOR` where:

- `MAJOR` is a positive integer representing the major version
- `MINOR` is a non-negative integer representing the minor version
- The content is UTF-8 with no byte-order mark
- Readers MUST strip leading and trailing whitespace (including a trailing
  newline) before matching the regular expression `^\d+\.\d+$`

**Current Container Version:** 2.0

### 5.3. Container Version Compatibility

Readers MUST:

- Accept files where the container major version is less than or equal to the
  reader's supported container major version
- Reject files where the container major version is greater than the reader's
  supported container major version
- Support all minor versions within a supported major version

### 5.4. Schema Version Compatibility

In addition to the container version check, readers MUST:

- Read the `minSchemaVersion` property from `metadata.json` (Section 6),
  treating an absent property as `1`
- Reject files whose `minSchemaVersion` is greater than the schema revision
  the reader supports
- Reject files whose `minSchemaVersion` is not a positive integer

This lets the content vocabulary evolve independently of the container: a
reader rejects only files that _use_ features it lacks, with a clear version
error rather than a schema-validation failure.

## 6. Metadata File

### 6.1. Location

The metadata file MUST be named `metadata.json` and MUST be located at the
root of the archive.

### 6.2. Schema

The metadata file MUST be a valid JSON object with the following structure:

```json
{
  "name": "string",
  "version": "string (optional)",
  "buildDateValue": integer,
  "builderName": "string (optional)",
  "builderVersion": "string (optional)",
  "minSchemaVersion": integer (optional)
}
```

### 6.3. Properties

- **name** (required): A human-readable name for the category set
  - MUST be a non-empty string
  - MUST NOT exceed 100 characters

- **version** (optional): A version identifier for the category set
  - MAY use semantic versioning or any other versioning scheme
  - MUST NOT exceed 20 characters

- **buildDateValue** (required): Build timestamp
  - MUST be a Unix timestamp in milliseconds
  - MUST be a positive integer, serialized without a fractional part or
    exponent

- **builderName** (optional): The name or identifier of the tool used to
  build the categories archive
  - MUST be a non-empty string
  - MUST NOT exceed 100 characters

- **builderVersion** (optional): The version of the tool used to build the
  categories archive
  - MUST be a non-empty string
  - MUST NOT exceed 20 characters

- **minSchemaVersion** (optional): The minimum schema revision a reader must
  support to read this file ("version needed to read")
  - MUST be a positive integer; writers MUST serialize it without a fractional
    part or exponent (e.g. `1`), and readers MUST reject non-integer values
  - When absent, readers MUST treat the value as `1` (container 1.x files
    predate this property)
  - Writers producing container version 2.0 or later SHOULD include it, even
    when its value is `1`. Its absence from a 2.0+ file likely indicates a
    writer error, and readers MAY warn when it is missing from such a file
  - Writers MUST compute this from the schema features actually used in the
    file: the highest schema revision among the features present in the
    content, or `1` if no versioned features are used
  - Writers MUST NOT declare a higher revision than the content requires

### 6.4. Example

```json
{
	"name": "Rainforest Monitoring Categories",
	"version": "2.1.0",
	"buildDateValue": 1727740800000,
	"builderName": "comapeocat",
	"builderVersion": "1.2.0",
	"minSchemaVersion": 1
}
```

## 7. Archive Constraints

### 7.1. Limits

All size limits are measured on the **uncompressed** size of an entry:

- The total number of entries (files) in the archive MUST NOT exceed 10,000
- Entries whose name ends in `.json` MUST NOT exceed 10,000,000 bytes (10 MB)
- Entries whose name ends in `.svg` MUST NOT exceed 2,000,000 bytes (2 MB)
- The `VERSION` file MUST NOT exceed 100 bytes (Section 5.1)

These limits are both a writer constraint and a reader security control:
writers MUST NOT produce entries that exceed them, and readers MUST reject any
file containing an entry that does, as part of enforcing the resource limits
in Section 10.1.

Extension matching is on the literal lowercase suffix. Entries matching no
recognized name are ignored (Section 4) and are not individually
size-limited; the entry-count limit bounds their number.

### 7.2. Compression

Writers SHOULD use DEFLATE compression with level 9 and MAY use other
compression levels supported by the ZIP format. Readers MUST support
uncompressed (stored) entries and DEFLATE compression.

## 8. Validation Requirements

### 8.1. Required Files

Readers MUST verify that `VERSION` and `metadata.json` are present, and MUST
reject the file if either is missing. Required _content_ files are defined by
the [schema specification](../../schema/), and readers MUST also reject files
missing those.

### 8.2. Version Validation

Readers MUST:

1. Parse the `VERSION` file and verify the format matches `MAJOR.MINOR`
2. Verify the container major version is supported (Section 5.3)
3. Verify the `minSchemaVersion` from `metadata.json` is supported
   (Section 5.4)
4. Reject files that fail any of these checks

Version checks SHOULD be performed before content validation — including
required-content-file checks (Section 8.1) — so that a file requiring a
newer reader is reported as a version error ("update the application")
rather than as a missing-file or schema error.

### 8.3. Content Validation

Readers MUST validate all content files as defined by the
[schema specification](../../schema/) at the version declared by the file.

## 9. Error Handling

Readers MUST reject files that fail validation as specified in Section 8. The
specific error types, messages, and reporting mechanisms are
implementation-defined.

Readers SHOULD distinguish version errors (file requires a newer reader) from
content errors (file is malformed) so that applications can prompt users to
update rather than reporting a corrupt file.

## 10. Security Considerations

### 10.1. Archive Extraction

Implementations MUST:

- Validate that extracted file paths do not escape the extraction directory
  (e.g., via `../` sequences)
- Enforce file size limits to prevent ZIP bombs
- Enforce entry count limits to prevent resource exhaustion

### 10.2. SVG Content

Implementations that render SVG icons MUST disable script execution in the
SVG rendering context and MUST NOT resolve external references (e.g. remote
entities, external images, or stylesheets) when rendering untrusted SVGs;
rendering with scripting enabled is a code-execution vector equivalent in
severity to the extraction risks in Section 10.1. Such implementations SHOULD
additionally sanitize SVG content to remove other potentially malicious
constructs and SHOULD apply sandboxing or isolation when rendering.

### 10.3. JSON Parsing

Implementations MUST use a secure JSON parser, enforce the JSON entry size
limit in Section 7.1, and handle deeply nested structures safely.

## 11. Container and Schema Change Boundary

The rule: this specification owns everything a reader needs **before it can
decide whether it understands the file**; the schema specification owns
everything gated by `minSchemaVersion`.

Changes governed by the **container version** (this specification):

- The archive format itself (ZIP, encoding, compression, naming rules)
- The `VERSION` file: location, format, and compatibility semantics
- `metadata.json`: location, schema, and semantics (including
  `minSchemaVersion`)
- The version compatibility rules (Sections 5.3 and 5.4)
- Entry count and size limits

Changes governed by the **schema version** (the schema specification):

- The set of content files and directories: their names, locations, and
  whether they are required
- The contents and validation rules of content files
- Reader tolerance and reference-validation rules for content

Examples:

- Adding a new field type, document type, or category property: **schema**
  revision (revisions must keep existing files valid)
- Adding a new optional content file: **schema** revision — readers ignore
  unrecognized entries (Section 4), and `minSchemaVersion` gates readers
  that cannot interpret the new file
- Making a content file required, or any other change that would invalidate
  existing files: not permitted as a schema revision (revisions must be
  additive); such a change requires a coordinated breaking release of the
  container format
- Changing the `metadata.json` schema, the `VERSION` semantics, the archive
  format, or the limits in ways existing readers do not expect: **container**
  change (major if files conforming to either version would be mishandled by
  readers of the other)
- Changing an entry-count or size limit, in either direction: **container**
  change, and always **major** — a raised limit makes older readers reject
  files that newer writers may legitimately produce, and a lowered limit makes
  newer readers reject files that older writers legitimately produced, so
  files conforming to one version are mishandled by readers of the other.
  Limits should therefore be set with generous headroom, since they cannot be
  adjusted without a breaking release

Schema revisions that add vocabulary MUST be accompanied by writers
computing `minSchemaVersion` accordingly (Section 6.3), so that only files
actually using the new vocabulary are rejected by older readers.

## 12. Conformance

A file conforms to this specification if:

1. It is a valid ZIP archive with the `.comapeocat` extension
2. The `VERSION` file is present and contains a valid container version with
   major version ≤ 2
3. `metadata.json` is present and conforms to the schema in Section 6
4. All content files conform to the schema specification at the version
   declared by `minSchemaVersion`
5. All constraints specified in this document are satisfied

An implementation conforms as a **writer** if it produces files that conform
to this specification, including computing `minSchemaVersion` as specified in
Section 6.3.

An implementation conforms as a **reader** if it correctly processes
conforming files and correctly rejects non-conforming files — in particular
files whose container major version or `minSchemaVersion` it does not support
(Sections 5.3 and 5.4) — according to the validation requirements in
Section 8.

## 13. References

- [Schema Specification](../../schema/)
- [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) - Key words for use in RFCs to Indicate Requirement Levels
- [ZIP File Format Specification](https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT)
- [JSON Specification](https://www.json.org/)
