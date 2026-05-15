import { loadScreenReaderConfig } from "./screen-reader-config.ts";

const configPath = process.argv[2];

if (!configPath) {
  console.error("Usage: bun run test:sr -- <config-path>");
  console.error(
    "Example: bun run test:sr -- test-configs/acne-studios.json",
  );
  process.exit(1);
}

try {
  loadScreenReaderConfig(configPath);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
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
    SR_CAPTURE_CONFIG: configPath,
  },
  stdout: "inherit",
  stderr: "inherit",
});

process.exit(await child.exited);
