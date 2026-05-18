# SRRT

Screen Reader Regression Testing experiments with automating real screen reader
flows and saving the text that users would hear.

The first target is deliberately narrow:

- Windows
- NVDA
- Chromium through Playwright
- Node.js 20 or newer

The goal is to make critical accessibility flows testable against screen reader
announcements, not only against DOM structure or ARIA attributes.

## Install

Install SRRT in a project that contains Playwright specs:

```bash
pnpm add --save-dev srrt
```

Install Chromium for Playwright:

```bash
pnpm exec srrt install-browsers
```

Set up NVDA automation through Guidepup:

```bash
pnpm exec srrt setup
```

Add a script to `package.json`:

```json
{
  "scripts": {
    "test:sr": "srrt test tests/sr"
  }
}
```

## Library Example

Create a Playwright spec file that defines a typed config and registers the NVDA
tests from that config:

```ts
import { defineNvdaTests, defineScreenReaderConfig } from "srrt";

const config = defineScreenReaderConfig({
  version: 1,
  tests: [
    {
      name: "example-home",
      url: "https://www.example.com/",
      titleContains: "Example",
      steps: [
        {
          name: "initial-focus",
          action: "reportFocus",
          speechContains: "Example focused control",
        },
        {
          name: "focus-first-option",
          action: "focusSelector",
          selector: "[data-example-option]",
          index: 1,
          speechContains: "Example option",
        },
      ],
    },
  ],
});

defineNvdaTests(config, { source: "example-home config" });
```

Run all specs in the `tests/sr` directory:

```bash
pnpm test:sr
```

`defineNvdaTests` opens configured URLs, captures NVDA speech, runs configured
screen reader interactions such as reporting focus or pressing Tab, checks the
spoken output against expectations, and writes transcript artifacts.

The second argument is optional:

```ts
defineNvdaTests(config, {
  source: "example-home config",
  artifactDir: "artifacts/screen-reader",
});
```

- `source`: Optional label used in validation errors and JSON artifacts.
- `artifactDir`: Optional output directory for `.nvda.json` and `.nvda.txt`
  artifacts. Defaults to `artifacts/screen-reader`.

You can also define smaller tests inline:

```ts
import {
  defineNvdaTests,
  defineScreenReaderConfig,
} from "srrt";

const config = defineScreenReaderConfig({
  version: 1,
  tests: [
    {
      url: "https://www.example.com/product",
      steps: [
        {
          action: "focusSelector",
          selector: "[data-example-submit]",
          speechContains: "Submit",
        },
      ],
    },
  ],
});

defineNvdaTests(config, { source: "product flow config" });
```

For a test named `example-flow`, output is written to:

```txt
artifacts/screen-reader/example-flow.nvda.json
artifacts/screen-reader/example-flow.nvda.txt
```

## Configuration

Configs are TypeScript objects validated by Zod. Use
`defineScreenReaderConfig` when declaring a config inline to get editor
completion, hover documentation, and runtime validation at definition time.
`defineNvdaTests` also validates the config before registering tests.

The Zod schemas and TypeScript types are exported:

- `screenReaderConfigSchema`
- `screenReaderTestCaseSchema`
- `screenReaderStepSchema`
- `reportFocusStepSchema`
- `tabStepSchema`
- `activateStepSchema`
- `focusSelectorStepSchema`
- `ScreenReaderConfigInput`
- `ScreenReaderTestCaseInput`
- `ScreenReaderStepInput`

### Full Config Example

```ts
import { defineScreenReaderConfig } from "srrt";

export const config = defineScreenReaderConfig({
  version: 1,
  tests: [
    {
      name: "example-home",
      url: "https://www.example.com/",
      titleContains: "Example",
      steps: [
        {
          name: "initial-focus",
          action: "reportFocus",
          speechContains: "Example focused control",
        },
        {
          name: "tab-to-next-control",
          action: "tab",
          speechContains: "Next control",
        },
        {
          name: "activate-current-control",
          action: "activate",
          speechContains: "Example dialog",
        },
        {
          name: "focus-first-option",
          action: "focusSelector",
          selector: "[data-example-option]",
          index: 1,
          speechContains: "Example option",
        },
      ],
    },
  ],
});
```

### Top-Level Fields

- `version`: Required. Must be `1`.
- `tests`: Required. A non-empty array of test cases.

### Test Case Fields

- `tests[].url`: Required. The `http` or `https` URL to open.
- `tests[].titleContains`: Optional. Text NVDA must speak after reporting the
  active page title.
- `tests[].steps`: Optional. Interaction steps to run after the page opens.
  A test must define `titleContains` or at least one step.
- `tests[].name`: Optional. Used for Playwright test names and artifact file
  names. If omitted, a name is generated from the URL.

### Step Fields

- `tests[].steps[].name`: Optional. Used in reports. If omitted, a name is
  generated from the step index and action.
- `tests[].steps[].action`: Required. Supported values are `reportFocus`,
  `tab`, `activate`, and `focusSelector`.
- `tests[].steps[].speechContains`: Required. Text NVDA must speak after the
  action runs.
- `tests[].steps[].selector`: Required for `focusSelector`. CSS selector for
  the element to focus. This is used only to move browser focus.
- `tests[].steps[].index`: Optional for `focusSelector` only. 1-based match
  index for selectors that match multiple elements. Defaults to `1`.

`index` starts at `1`, not `0`. For example, `index: 2` focuses the second
element matched by `selector`. `index` is not allowed on `reportFocus`, `tab`,
or `activate` steps.

### Actions

- `reportFocus`: Asks NVDA to announce the currently focused element.
- `tab`: Presses the Tab key and captures the resulting NVDA speech.
- `activate`: Performs the default action for the currently focused item.
- `focusSelector`: Uses a DOM selector to move browser focus, then asks NVDA to
  report that focused item.

Assertions are based on NVDA speech, not DOM text. `focusSelector` is the only
step that uses a DOM selector, and it uses the selector only to place focus.
`titleContains` and `speechContains` matches are case-insensitive and ignore
punctuation differences.

### Selector Focus Example

This focuses the second matching option, validates the announcement, activates
that option, then focuses another control:

```ts
import { defineScreenReaderConfig } from "srrt";

export const config = defineScreenReaderConfig({
  version: 1,
  tests: [
    {
      name: "example-selector-flow",
      url: "https://www.example.com/product",
      steps: [
        {
          name: "focus-second-option",
          action: "focusSelector",
          selector: "[data-example-option]",
          index: 2,
          speechContains: "Example option",
        },
        {
          name: "activate-second-option",
          action: "activate",
          speechContains: "checked",
        },
        {
          name: "focus-submit",
          action: "focusSelector",
          selector: "[data-example-submit]",
          speechContains: "Submit",
        },
      ],
    },
  ],
});
```

Each test writes artifacts under `artifacts/screen-reader` using the test name:

- `<test-name>.nvda.json`
- `<test-name>.nvda.txt`

Artifacts include:

- `expected`: the expected result from the config.
- `actual`: the NVDA output used by the assertion.
- `diagnostics`: extra captured speech useful when debugging failures.

## Requirements

Run the screen reader capture from native Windows, not WSL.

NVDA automation needs access to the Windows desktop session, foreground windows,
keyboard events, and NVDA's automation hooks. In WSL, `process.platform` is
`linux`, so the test is skipped.

Recommended environment:

- Windows 10, Windows 11, or Windows Server
- PowerShell or Command Prompt
- Node.js 20 or newer
- NVDA setup through Guidepup

## Setup

For a consuming project, install the package:

```bash
pnpm add --save-dev srrt
```

Install the Playwright browser:

```bash
pnpm exec srrt install-browsers
```

Set up screen reader automation:

```bash
pnpm exec srrt setup
```

## Run

Create spec files in the `tests/sr` directory that define configs and call
`defineNvdaTests`, then run all of them:

```bash
pnpm test:sr
```

The test is skipped on non-Windows platforms because NVDA is Windows-only.

### CLI

The package installs a `srrt` command:

```bash
srrt test tests/sr
```

By default, `srrt test` runs Playwright with SRRT's NVDA configuration:

- Guidepup screen reader fixtures enabled.
- Chromium project named `chromium-nvda`.
- Headed browser mode.
- Maximized Chromium window.
- `test-results` Playwright output directory.

Additional Playwright arguments are passed through:

```bash
srrt test tests/sr --grep checkout
```

If you need custom Playwright settings, pass your own config:

```bash
srrt test tests/sr --config playwright.config.ts
```

You can reuse SRRT's default Playwright config in that file:

```ts
import { defineScreenReaderPlaywrightConfig } from "srrt/playwright";

export default defineScreenReaderPlaywrightConfig({
  timeout: 180_000,
  retries: 1,
});
```

## Output

Each run writes two files under `artifacts/screen-reader`:

- `<test-name>.nvda.json`
- `<test-name>.nvda.txt`

The JSON file is intended for tooling. The text file is intended for quick human
review.

The captured data includes:

- URL
- browser
- screen reader
- timestamp
- expected result
- actual result
- diagnostics

## Notes

This is an early prototype. Screen reader output can vary across NVDA versions,
browser versions, Windows versions, language settings, and verbosity settings.
Treat transcripts as regression evidence for a pinned environment, not as a
universal proof that a page is accessible.

For stable local runs, keep the Windows desktop session simple: the terminal,
Chrome, and NVDA Speech Viewer are enough.
