# SRRT

Screen Reader Regression Testing experiments with automating real screen reader
flows and saving the text that users would hear.

The first target is deliberately narrow:

- Windows
- NVDA
- Chromium through Playwright
- Bun as the JavaScript runtime

The goal is to make critical accessibility flows testable against screen reader
announcements, not only against DOM structure or ARIA attributes.

## Library Example

Create a Playwright spec file that imports a JSON config and registers the NVDA
tests from that config:

```ts
import config from "../test-configs/example-flow.json";
import { defineNvdaTests } from "../index.ts";

defineNvdaTests(config, { source: "test-configs/example-flow.json" });
```

Run all specs in the `tests` directory:

```bash
bun run test:sr
```

`defineNvdaTests` opens configured URLs, captures NVDA speech, runs configured
screen reader interactions such as reporting focus or pressing Tab, checks the
spoken output against expectations, and writes transcript artifacts.

The second argument is optional:

```ts
defineNvdaTests(config, {
  source: "test-configs/example-flow.json",
  artifactDir: "artifacts/screen-reader",
});
```

- `source`: Optional label used in validation errors and JSON artifacts.
- `artifactDir`: Optional output directory for `.nvda.json` and `.nvda.txt`
  artifacts. Defaults to `artifacts/screen-reader`.

When this package is consumed as a dependency, import from the package name
instead:

```ts
import config from "./test-configs/example-flow.json";
import { defineNvdaTests } from "automated-a11y";

defineNvdaTests(config, { source: "test-configs/example-flow.json" });
```

For a test named `example-flow`, output is written to:

```txt
artifacts/screen-reader/example-flow.nvda.json
artifacts/screen-reader/example-flow.nvda.txt
```

## Requirements

Run the screen reader capture from native Windows, not WSL.

NVDA automation needs access to the Windows desktop session, foreground windows,
keyboard events, and NVDA's automation hooks. In WSL, `process.platform` is
`linux`, so the test is skipped.

Recommended environment:

- Windows 10, Windows 11, or Windows Server
- PowerShell or Command Prompt
- Bun
- NVDA setup through Guidepup

## Setup

Install dependencies:

```bash
bun install
```

Install the Playwright browser:

```bash
bun run install:browsers
```

Set up screen reader automation:

```bash
bun run setup:sr
```

## Run

Create spec files in the `tests` directory that import JSON configs and call
`defineNvdaTests`, then run all of them:

```bash
bun run test:sr
```

The test is skipped on non-Windows platforms because NVDA is Windows-only.
Config files live under `test-configs`; see `test-configs/README.md` for the
schema. Local JSON config files in that directory are ignored by Git.

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
