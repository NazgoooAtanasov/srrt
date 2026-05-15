import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export type ScreenReaderTestCase = {
  name: string;
  url: string;
  titleContains: string;
};

export type ScreenReaderConfig = {
  version: 1;
  tests: ScreenReaderTestCase[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(
  value: unknown,
  path: string,
  { allowEmpty = false }: { allowEmpty?: boolean } = {},
) {
  if (typeof value !== "string" || (!allowEmpty && value.trim() === "")) {
    throw new Error(`${path} must be a non-empty string.`);
  }

  return value;
}

function defaultTestName(url: string, index: number) {
  const parsed = new URL(url);
  const slug = `${parsed.hostname}${parsed.pathname}`
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return slug || `test-${index + 1}`;
}

function validateUrl(value: string, path: string) {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${path} must be a valid URL.`);
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`${path} must use http or https.`);
  }

  return parsed.href;
}

export function parseScreenReaderConfig(
  input: unknown,
  source = "screen reader config",
): ScreenReaderConfig {
  if (!isRecord(input)) {
    throw new Error(`${source} must be a JSON object.`);
  }

  if (input.version !== 1) {
    throw new Error(`${source}.version must be 1.`);
  }

  if (!Array.isArray(input.tests) || input.tests.length === 0) {
    throw new Error(`${source}.tests must be a non-empty array.`);
  }

  const tests = input.tests.map((testCase, index) => {
    const testPath = `${source}.tests[${index}]`;
    if (!isRecord(testCase)) {
      throw new Error(`${testPath} must be an object.`);
    }

    const url = validateUrl(
      requireString(testCase.url, `${testPath}.url`),
      `${testPath}.url`,
    );
    const titleContains = requireString(
      testCase.titleContains,
      `${testPath}.titleContains`,
    );
    const rawName =
      testCase.name === undefined
        ? defaultTestName(url, index)
        : requireString(testCase.name, `${testPath}.name`);

    return {
      name: rawName,
      url,
      titleContains,
    };
  });

  const seenNames = new Set<string>();
  for (const testCase of tests) {
    if (seenNames.has(testCase.name)) {
      throw new Error(`${source}.tests contains duplicate name "${testCase.name}".`);
    }

    seenNames.add(testCase.name);
  }

  return {
    version: 1,
    tests,
  };
}

export function loadScreenReaderConfig(configPath: string) {
  const resolvedPath = resolve(configPath);
  let rawConfig: string;

  try {
    rawConfig = readFileSync(resolvedPath, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not read config file at ${resolvedPath}: ${message}`);
  }

  let parsedConfig: unknown;
  try {
    parsedConfig = JSON.parse(rawConfig);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not parse JSON config at ${resolvedPath}: ${message}`);
  }

  return parseScreenReaderConfig(parsedConfig, resolvedPath);
}
