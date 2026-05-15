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
      "titleContains": "Acne",
      "steps": [
        {
          "name": "cookie-settings-focused",
          "action": "reportFocus",
          "speechContains": "Cookie settings"
        },
        {
          "name": "tab-to-continue-without-accepting",
          "action": "tab",
          "speechContains": "Continue without accepting"
        },
        {
          "name": "tab-to-accept-cookies",
          "action": "tab",
          "speechContains": "Accept all cookies"
        }
      ]
    }
  ]
}
```

Fields:

- `version`: Required. Must be `1`.
- `tests`: Required. A non-empty array of test cases.
- `tests[].url`: Required. The `http` or `https` URL to open.
- `tests[].titleContains`: Optional. Text NVDA must speak after reporting the
  active page title.
- `tests[].steps`: Optional. Interaction steps to run after the page opens.
  A test must define `titleContains` or at least one step.
- `tests[].name`: Optional. Used for Playwright test names and artifact file
  names. If omitted, a name is generated from the URL.
- `tests[].steps[].name`: Optional. Used in reports. If omitted, a name is
  generated from the step index and action.
- `tests[].steps[].action`: Required. Supported values are `reportFocus` and
  `tab`.
- `tests[].steps[].speechContains`: Required. Text NVDA must speak after the
  action runs.

`reportFocus` asks NVDA to announce the currently focused element. `tab` presses
the Tab key and captures the resulting NVDA speech. Assertions are based on
NVDA speech, not DOM text. `titleContains` and `speechContains` matches are
case-insensitive.

Each test writes artifacts under `artifacts/screen-reader` using the test name:

- `<test-name>.nvda.json`
- `<test-name>.nvda.txt`

Artifacts include:

- `expected`: the expected result from the config.
- `actual`: the NVDA output used by the assertion.
- `diagnostics`: extra captured speech useful when debugging failures.
