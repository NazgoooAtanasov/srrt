# automated-a11y

To install dependencies:

```bash
bun install
```

Install the browser used by the screen reader test:

```bash
bun run install:browsers
```

Set up screen reader automation on Windows:

```bash
bun run setup:sr
```

Run the NVDA capture example:

```bash
bun run test:sr -- https://www.acnestudios.com/se/en/home
```

The example opens the provided URL, captures NVDA's landing speech plus the
first heading announcement, and writes files under `artifacts/screen-reader`.
For the command above, the files are:

```txt
artifacts/screen-reader/www-acnestudios-com-se-en-home.nvda.json
artifacts/screen-reader/www-acnestudios-com-se-en-home.nvda.txt
```

This project was created using `bun init` in bun v1.3.11. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
