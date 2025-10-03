# Test Fixtures

This directory contains test fixtures for the comapeocat CLI and library tests. These fixtures are generated using valimock with fixed seeds for reproducibility.

## Lint Test Fixtures

The `lint/` directory contains fixtures for testing the `comapeocat lint` command.

### Structure

```
lint/
├── valid/              # Valid fixtures that should pass linting
│   ├── minimal/       # Minimal valid preset (no fields, icons, defaults, or metadata)
│   └── complete/      # Complete fixture with fields, icons, defaults, and metadata
└── invalid/           # Invalid fixtures that should fail linting
    ├── missing-field-ref/           # Preset references non-existent field
    ├── missing-icon-ref/            # Preset references non-existent icon
    ├── invalid-preset-schema/       # Preset with invalid schema
    ├── invalid-field-schema/        # Field with invalid schema
    ├── defaults-missing-preset/     # Defaults references non-existent preset
    └── defaults-invalid-geometry/   # Defaults references preset with wrong geometry
```

### Regenerating Lint Fixtures

```bash
node test/fixtures/generate-lint-fixtures.js
```

Seed: 42

### Usage in Tests

The fixtures are used in [../lint-cli.test.js](../lint-cli.test.js) to test the CLI lint command's error handling for:

- Missing field references (`PresetRefError`)
- Missing icon references (`PresetRefError`)
- Missing preset references in defaults (`DefaultsRefError`)
- Invalid geometry types in defaults (`InvalidDefaultsError`)
- Invalid preset schema (`SchemaError`)
- Invalid field schema (`SchemaError`)

## Build Test Fixtures

The `build/` directory contains fixtures for testing the `comapeocat build` command.

### Structure

```
build/
├── no-defaults/    # Tests auto-generation of defaults.json when missing
├── with-sort/      # Tests deprecated sort field handling in presets
└── complete/       # Complete fixture for general build tests
```

### Regenerating Build Fixtures

```bash
node test/fixtures/generate-build-fixtures.js
```

Seed: 123

### Usage in Tests

The fixtures are used in [../build-cli.test.js](../build-cli.test.js) to test:

- Building valid `.comapeocat` files
- Auto-generation of `defaults.json` when missing
- Deprecated `sort` field handling for defaults ordering
- Validation errors during build
