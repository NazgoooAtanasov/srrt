export type ScreenReaderTestCase = {
  name: string;
  url: string;
  titleContains?: string;
  steps: ScreenReaderStep[];
};

export type ScreenReaderStep = {
  name: string;
  action: "reportFocus" | "tab" | "activate" | "focusSelector";
  speechContains: string;
  selector?: string;
  index: number;
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

function optionalPositiveInteger(value: unknown, path: string) {
  if (value === undefined) {
    return 1;
  }

  if (!Number.isInteger(value) || typeof value !== "number" || value < 1) {
    throw new Error(`${path} must be a positive integer starting from 1.`);
  }

  return value;
}

function parseStep(
  input: unknown,
  source: string,
  index: number,
): ScreenReaderStep {
  if (!isRecord(input)) {
    throw new Error(`${source} must be an object.`);
  }

  const action = requireString(input.action, `${source}.action`);
  if (
    action !== "reportFocus" &&
    action !== "tab" &&
    action !== "activate" &&
    action !== "focusSelector"
  ) {
    throw new Error(
      `${source}.action must be "reportFocus", "tab", "activate", or "focusSelector".`,
    );
  }

  const selector =
    action === "focusSelector"
      ? requireString(input.selector, `${source}.selector`)
      : undefined;
  const stepIndex = optionalPositiveInteger(input.index, `${source}.index`);
  const speechContains = requireString(
    input.speechContains,
    `${source}.speechContains`,
  );
  const name =
    input.name === undefined
      ? `${index + 1}-${action}`
      : requireString(input.name, `${source}.name`);

  return {
    name,
    action,
    speechContains,
    selector,
    index: stepIndex,
  };
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
    const titleContains =
      testCase.titleContains === undefined
        ? undefined
        : requireString(testCase.titleContains, `${testPath}.titleContains`);
    const steps =
      testCase.steps === undefined
        ? []
        : Array.isArray(testCase.steps)
          ? testCase.steps.map((step, stepIndex) =>
              parseStep(step, `${testPath}.steps[${stepIndex}]`, stepIndex),
            )
          : undefined;

    if (!steps) {
      throw new Error(`${testPath}.steps must be an array when provided.`);
    }

    if (!titleContains && steps.length === 0) {
      throw new Error(
        `${testPath} must define titleContains or at least one step.`,
      );
    }

    const rawName =
      testCase.name === undefined
        ? defaultTestName(url, index)
        : requireString(testCase.name, `${testPath}.name`);

    return {
      name: rawName,
      url,
      titleContains,
      steps,
    };
  });

  const seenNames = new Set<string>();
  for (const testCase of tests) {
    if (seenNames.has(testCase.name)) {
      throw new Error(
        `${source}.tests contains duplicate name "${testCase.name}".`,
      );
    }

    seenNames.add(testCase.name);
  }

  return {
    version: 1,
    tests,
  };
}
