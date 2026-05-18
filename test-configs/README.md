# Screen Reader Test Configs

Put local screen reader test config JSON files in this directory.

Config files are intentionally ignored by Git because they are expected to be
specific to the site or flow being tested. This README documents the schema.

## Usage

Create a Playwright spec file that imports one of these JSON files and registers
the configured tests:

```ts
import config from "../test-configs/my-site.json";
import { defineNvdaTests } from "../index.ts";

defineNvdaTests(config, { source: "test-configs/my-site.json" });
```

Run all specs in the `tests` directory:

```bash
bun run test:sr
```

## Schema

```json
{
  "version": 1,
  "tests": [
    {
      "name": "example-home",
      "url": "https://www.example.com/",
      "titleContains": "Example",
      "steps": [
        {
          "name": "initial-focus",
          "action": "reportFocus",
          "speechContains": "Example focused control"
        },
        {
          "name": "tab-to-next-control",
          "action": "tab",
          "speechContains": "Next control"
        },
        {
          "name": "activate-current-control",
          "action": "activate",
          "speechContains": "Example dialog"
        },
        {
          "name": "focus-first-option",
          "action": "focusSelector",
          "selector": "[data-example-option]",
          "index": 1,
          "speechContains": "Example option"
        }
      ]
    }
  ]
}
```

## Top-Level Fields

- `version`: Required. Must be `1`.
- `tests`: Required. A non-empty array of test cases.

## Test Case Fields

- `tests[].url`: Required. The `http` or `https` URL to open.
- `tests[].titleContains`: Optional. Text NVDA must speak after reporting the
  active page title.
- `tests[].steps`: Optional. Interaction steps to run after the page opens.
  A test must define `titleContains` or at least one step.
- `tests[].name`: Optional. Used for Playwright test names and artifact file
  names. If omitted, a name is generated from the URL.

## Step Fields

- `tests[].steps[].name`: Optional. Used in reports. If omitted, a name is
  generated from the step index and action.
- `tests[].steps[].action`: Required. Supported values are `reportFocus`,
  `tab`, `activate`, and `focusSelector`.
- `tests[].steps[].speechContains`: Required. Text NVDA must speak after the
  action runs.
- `tests[].steps[].selector`: Required for `focusSelector`. CSS selector for
  the element to focus. This is used only to move browser focus.
- `tests[].steps[].index`: Optional for `focusSelector`. 1-based match index
  for selectors that match multiple elements. Defaults to `1`.

`index` starts at `1`, not `0`. For example, `"index": 2` focuses the second
element matched by `selector`.

## Actions

- `reportFocus`: Asks NVDA to announce the currently focused element.
- `tab`: Presses the Tab key and captures the resulting NVDA speech.
- `activate`: Performs the default action for the currently focused item.
- `focusSelector`: Uses a DOM selector to move browser focus, then asks NVDA to
  report that focused item.

Assertions are based on NVDA speech, not DOM text. `focusSelector` is the only
step that uses a DOM selector, and it uses the selector only to place focus.
`titleContains` and `speechContains` matches are case-insensitive and ignore
punctuation differences.

## Selector Focus Example

This focuses the second matching option, validates the announcement, activates
that option, then focuses another control:

```json
{
  "name": "example-selector-flow",
  "url": "https://www.example.com/product",
  "steps": [
    {
      "name": "focus-second-option",
      "action": "focusSelector",
      "selector": "[data-example-option]",
      "index": 2,
      "speechContains": "Example option"
    },
    {
      "name": "activate-second-option",
      "action": "activate",
      "speechContains": "checked"
    },
    {
      "name": "focus-submit",
      "action": "focusSelector",
      "selector": "[data-example-submit]",
      "speechContains": "Submit"
    }
  ]
}
```

Each test writes artifacts under `artifacts/screen-reader` using the test name:

- `<test-name>.nvda.json`
- `<test-name>.nvda.txt`

Artifacts include:

- `expected`: the expected result from the config.
- `actual`: the NVDA output used by the assertion.
- `diagnostics`: extra captured speech useful when debugging failures.
