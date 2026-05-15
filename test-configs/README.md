# Screen Reader Test Configs

Put local screen reader test config JSON files in this directory.

Config files are intentionally ignored by Git because they are expected to be
specific to the site or flow being tested. This README documents the schema.

## Usage

```bash
bun run test:sr -- test-configs/my-site.json
```

## Schema

```json
{
  "version": 1,
  "tests": [
    {
      "name": "acne-home",
      "url": "https://www.acnestudios.com/se/en/home",
      "titleContains": "Acne"
    }
  ]
}
```

Fields:

- `version`: Required. Must be `1`.
- `tests`: Required. A non-empty array of test cases.
- `tests[].url`: Required. The `http` or `https` URL to open.
- `tests[].titleContains`: Required. Text NVDA must speak after reporting the
  active page title.
- `tests[].name`: Optional. Used for Playwright test names and artifact file
  names. If omitted, a name is generated from the URL.

Each test writes artifacts under `artifacts/screen-reader` using the test name:

- `<test-name>.nvda.json`
- `<test-name>.nvda.txt`

Artifacts include:

- `expected`: the expected result from the config.
- `actual`: the NVDA output used by the assertion.
- `diagnostics`: extra captured speech useful when debugging failures.
