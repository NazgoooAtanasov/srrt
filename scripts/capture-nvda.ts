const rawUrl = process.argv[2];

if (!rawUrl) {
  console.error("Usage: bun run test:sr -- <url>");
  console.error(
    "Example: bun run test:sr -- https://www.acnestudios.com/se/en/home",
  );
  process.exit(1);
}

let targetUrl: URL;
try {
  targetUrl = new URL(rawUrl);
} catch {
  console.error(`Invalid URL: ${rawUrl}`);
  process.exit(1);
}

if (!["http:", "https:"].includes(targetUrl.protocol)) {
  console.error(`Unsupported URL protocol: ${targetUrl.protocol}`);
  process.exit(1);
}

const child = Bun.spawn({
  cmd: [
    process.execPath,
    "x",
    "playwright",
    "test",
    "tests/capture-url.nvda.spec.ts",
    "--config=playwright.config.ts",
  ],
  env: {
    ...process.env,
    SR_CAPTURE_URL: targetUrl.href,
  },
  stdout: "inherit",
  stderr: "inherit",
});

process.exit(await child.exited);
