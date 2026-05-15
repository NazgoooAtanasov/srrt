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

## Current Example

The current script opens configured URLs, captures NVDA speech, runs configured
screen reader interactions such as reporting focus or pressing Tab, checks the
spoken output against expectations, and writes transcript artifacts.

```bash
bun run test:sr -- test-configs/acne-studios.json
```

For a test named `acne-home`, output is written to:

```txt
artifacts/screen-reader/acne-home.nvda.json
artifacts/screen-reader/acne-home.nvda.txt
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

Pass a screen reader test config path as the first argument:

```bash
bun run test:sr -- <config-path>
```

Example:

```bash
bun run test:sr -- test-configs/acne-studios.json
```

The test is skipped on non-Windows platforms because NVDA is Windows-only.
Config files live under `test-configs`; see `test-configs/README.md` for the
schema. Local JSON config files in that directory are ignored by Git.

## Output

Each run writes two files under `artifacts/screen-reader`:

- `<url-slug>.nvda.json`
- `<url-slug>.nvda.txt`

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
