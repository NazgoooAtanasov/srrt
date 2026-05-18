#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

type PackageJson = {
  bin?: {
    playwright?: string;
  };
  version?: string;
};

const require = createRequire(import.meta.url);

function printHelp() {
  console.log(`srrt

Usage:
  srrt test [playwright-test-args]
  srrt install-browsers [playwright-install-args]
  srrt setup [guidepup-setup-args]

Examples:
  srrt test tests/sr
  srrt test tests/sr --grep checkout
  srrt test tests/sr --config playwright.config.ts
  srrt install-browsers
  srrt setup
`);
}

async function readPackageJson(packageName: string): Promise<PackageJson> {
  const packageJsonPath = require.resolve(`${packageName}/package.json`);
  return JSON.parse(await readFile(packageJsonPath, "utf8")) as PackageJson;
}

async function readOwnPackageJson(): Promise<PackageJson> {
  const currentFile = fileURLToPath(import.meta.url);
  const packageJsonPath = join(dirname(currentFile), "..", "..", "package.json");
  return JSON.parse(await readFile(packageJsonPath, "utf8")) as PackageJson;
}

async function resolvePlaywrightCli() {
  const packageJsonPath = require.resolve("@playwright/test/package.json");
  const packageJson = await readPackageJson("@playwright/test");
  const binPath = packageJson.bin?.playwright;
  if (!binPath) {
    throw new Error("@playwright/test does not expose a playwright CLI binary.");
  }

  return join(dirname(packageJsonPath), binPath);
}

function run(command: string, args: string[]) {
  return new Promise<number>((resolve, reject) => {
    const child = spawn(command, args, {
      env: process.env,
      shell: false,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("close", (code, signal) => {
      if (signal) {
        reject(new Error(`${command} was terminated by ${signal}.`));
        return;
      }

      resolve(code ?? 1);
    });
  });
}

async function runPlaywright(args: string[]) {
  const playwrightCli = await resolvePlaywrightCli();
  return run(process.execPath, [playwrightCli, ...args]);
}

function hasConfigArg(args: string[]) {
  return args.some(
    (arg, index) =>
      arg === "--config" ||
      arg === "-c" ||
      arg.startsWith("--config=") ||
      (args[index - 1] === "--config" || args[index - 1] === "-c"),
  );
}

async function writeDefaultPlaywrightConfig() {
  const directory = await mkdtemp(join(tmpdir(), "srrt-"));
  await mkdir(directory, { recursive: true });

  const currentFile = fileURLToPath(import.meta.url);
  const packageDistDirectory = join(dirname(currentFile), "..");
  const configModuleUrl = pathToFileURL(
    join(packageDistDirectory, "playwright.js"),
  ).href;
  const configPath = join(directory, "playwright.config.mjs");

  await writeFile(
    configPath,
    [
      `import { defineScreenReaderPlaywrightConfig } from ${JSON.stringify(configModuleUrl)};`,
      "",
      "export default defineScreenReaderPlaywrightConfig({",
      "  testDir: process.cwd(),",
      "});",
      "",
    ].join("\n"),
  );

  return configPath;
}

async function runTests(args: string[]) {
  const playwrightArgs = ["test", ...args];

  if (!hasConfigArg(args)) {
    playwrightArgs.push("--config", await writeDefaultPlaywrightConfig());
  }

  return runPlaywright(playwrightArgs);
}

async function runSetup(args: string[]) {
  const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  return run(pnpm, ["dlx", "@guidepup/setup", ...args]);
}

async function main() {
  const [command, ...args] = process.argv.slice(2);

  if (!command || command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return 0;
  }

  if (command === "--version" || command === "-v") {
    const packageJson = await readOwnPackageJson();
    console.log(packageJson.version ?? "0.0.0");
    return 0;
  }

  if (command === "test") {
    return runTests(args);
  }

  if (command === "install-browsers") {
    return runPlaywright(["install", "chromium", ...args]);
  }

  if (command === "setup") {
    return runSetup(args);
  }

  console.error(`Unknown command: ${command}`);
  printHelp();
  return 1;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
