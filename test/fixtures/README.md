# Test Fixtures

This directory contains test fixtures for the comapeocat CLI and library tests. These fixtures are generated using valimock with fixed seeds.

## Lint Test Fixtures

The `lint/` directory contains fixtures for testing the `comapeocat lint` command.

### Structure

```
lint/
├── valid/              # Valid fixtures that should pass linting
│   ├── minimal/       # Minimal valid preset (no fields, icons, categorySelection, or metadata)
│   └── complete/      # Complete fixture with fields, icons, categorySelection, and metadata
└── invalid/           # Invalid fixtures that should fail linting
    ├── missing-field-ref/                  # Preset references non-existent field
    ├── missing-icon-ref/                   # Preset references non-existent icon
    ├── invalid-preset-schema/              # Preset with invalid schema
    ├── invalid-field-schema/               # Field with invalid schema
    ├── categorySelection-missing-preset/   # CategorySelection references non-existent preset
    └── categorySelection-invalid-geometry/ # CategorySelection references preset with wrong document type
```

### Regenerating Lint Fixtures

```bash
node scripts/generate-lint-fixtures.js
```

Seed: 42

### Usage in Tests

The fixtures are used in [../lint-cli.test.js](../lint-cli.test.js) to test the CLI lint command's error handling for:

- Missing field references (`CategoryRefError`)
- Missing icon references (`CategoryRefError`)
- Missing category references in categorySelection (`CategorySelectionRefError`)
- Invalid document types in categorySelection (`InvalidCategorySelectionError`)
- Invalid category schema (`SchemaError`)
- Invalid field schema (`SchemaError`)

## Build Test Fixtures

The `build/` directory contains fixtures for testing the `comapeocat build` command.

### Structure

```
build/
├── no-categorySelection/  # Tests auto-generation of categorySelection.json when missing
├── with-sort/             # Tests deprecated sort field handling in categories
└── complete/              # Complete fixture for general build tests
```

### Regenerating Build Fixtures

```bash
node scripts/generate-build-fixtures.js
```

Seed: 123

### Usage in Tests

The fixtures are used in [../build-cli.test.js](../build-cli.test.js) to test:

- Building valid `.comapeocat` files
- Auto-generation of `categorySelection.json` when missing
- Deprecated `sort` field handling for categorySelection ordering
- Validation errors during build
