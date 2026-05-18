import { z } from "zod";

/** Supported actions for an NVDA test step. */
export type ScreenReaderAction =
  | "reportFocus"
  | "tab"
  | "activate"
  | "focusSelector";

type BaseScreenReaderStepInput = {
  /** Optional report label. Defaults to "<step-number>-<action>". */
  name?: string;
  /** Text NVDA must speak after the action runs. */
  speechContains: string;
};

/** Asks NVDA to announce the currently focused element. */
export type ReportFocusStepInput = BaseScreenReaderStepInput & {
  action: "reportFocus";
  selector?: never;
  index?: never;
};

/** Presses Tab and captures the resulting NVDA speech. */
export type TabStepInput = BaseScreenReaderStepInput & {
  action: "tab";
  selector?: never;
  index?: never;
};

/** Performs the default action for the currently focused item. */
export type ActivateStepInput = BaseScreenReaderStepInput & {
  action: "activate";
  selector?: never;
  index?: never;
};

/** Focuses a DOM element by selector, then asks NVDA to report that item. */
export type FocusSelectorStepInput = BaseScreenReaderStepInput & {
  action: "focusSelector";
  /** CSS selector for the element to focus. */
  selector: string;
  /**
   * 1-based match index for selectors that match multiple elements.
   * Defaults to 1.
   */
  index?: number;
};

/** Input shape for one configured NVDA interaction step. */
export type ScreenReaderStepInput =
  | ReportFocusStepInput
  | TabStepInput
  | ActivateStepInput
  | FocusSelectorStepInput;

/** Input shape for one generated Playwright/NVDA test. */
export type ScreenReaderTestCaseInput = {
  /** Optional test and artifact label. Defaults to a name generated from url. */
  name?: string;
  /** HTTP or HTTPS page URL to open before running assertions. */
  url: string;
  /** Optional text NVDA must speak after reporting the active page title. */
  titleContains?: string;
  /** Optional interaction steps to run after the page opens. */
  steps?: ScreenReaderStepInput[];
};

/** Input shape accepted by defineNvdaTests. */
export type ScreenReaderConfigInput = {
  /** Config schema version. Must be 1. */
  version: 1;
  /** Non-empty list of NVDA tests to register. */
  tests: ScreenReaderTestCaseInput[];
};

type BaseScreenReaderStep = {
  name: string;
  action: ScreenReaderAction;
  speechContains: string;
};

export type NonSelectorScreenReaderStep = BaseScreenReaderStep & {
  action: "reportFocus" | "tab" | "activate";
  selector?: never;
  index?: never;
};

export type FocusSelectorScreenReaderStep = BaseScreenReaderStep & {
  action: "focusSelector";
  selector: string;
  index: number;
};

export type ScreenReaderStep =
  | NonSelectorScreenReaderStep
  | FocusSelectorScreenReaderStep;

export type ScreenReaderTestCase = {
  name: string;
  url: string;
  titleContains?: string;
  steps: ScreenReaderStep[];
};

export type ScreenReaderConfig = {
  version: 1;
  tests: ScreenReaderTestCase[];
};

const nonEmptyStringSchema = z
  .string()
  .refine((value) => value.trim() !== "", "must be a non-empty string.");

const httpUrlSchema = nonEmptyStringSchema
  .refine((value) => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }, "must be a valid URL.")
  .refine((value) => {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return true;
    }
  }, "must use http or https.")
  .transform((value) => new URL(value).href);

const baseStepSchema = {
  name: nonEmptyStringSchema
    .optional()
    .describe("Optional report label. Defaults to '<step-number>-<action>'."),
  speechContains: nonEmptyStringSchema.describe(
    "Text NVDA must speak after the action runs.",
  ),
};

export const reportFocusStepSchema = z
  .strictObject({
    ...baseStepSchema,
    action: z
      .literal("reportFocus")
      .describe("Asks NVDA to announce the currently focused element."),
  })
  .describe("Report the currently focused element.");

export const tabStepSchema = z
  .strictObject({
    ...baseStepSchema,
    action: z.literal("tab").describe("Presses the Tab key."),
  })
  .describe("Move focus with the Tab key.");

export const activateStepSchema = z
  .strictObject({
    ...baseStepSchema,
    action: z
      .literal("activate")
      .describe("Performs the default action for the focused item."),
  })
  .describe("Activate the currently focused item.");

export const focusSelectorStepSchema = z
  .strictObject({
    ...baseStepSchema,
    action: z
      .literal("focusSelector")
      .describe("Focuses a DOM element, then asks NVDA to report it."),
    selector: nonEmptyStringSchema.describe(
      "CSS selector for the element to focus.",
    ),
    index: z
      .number()
      .int()
      .min(1, "must be a positive integer starting from 1.")
      .optional()
      .default(1)
      .describe(
        "1-based match index for selectors that match multiple elements. Defaults to 1.",
      ),
  })
  .describe("Focus a DOM element by selector.");

export const screenReaderStepSchema = z
  .discriminatedUnion("action", [
    reportFocusStepSchema,
    tabStepSchema,
    activateStepSchema,
    focusSelectorStepSchema,
  ])
  .describe("One configured NVDA interaction step.");

export const screenReaderTestCaseSchema = z
  .strictObject({
    name: nonEmptyStringSchema
      .optional()
      .describe(
        "Optional test and artifact label. Defaults to a name generated from url.",
      ),
    url: httpUrlSchema.describe("HTTP or HTTPS page URL to open."),
    titleContains: nonEmptyStringSchema
      .optional()
      .describe("Text NVDA must speak after reporting the active page title."),
    steps: z
      .array(screenReaderStepSchema)
      .optional()
      .default([])
      .describe("Interaction steps to run after the page opens."),
  })
  .refine(
    (testCase) => Boolean(testCase.titleContains || testCase.steps.length > 0),
    "must define titleContains or at least one step.",
  )
  .describe("One generated Playwright/NVDA test.");

export const screenReaderConfigSchema = z
  .strictObject({
    version: z.literal(1).describe("Config schema version. Must be 1."),
    tests: z
      .array(screenReaderTestCaseSchema)
      .min(1, "must be a non-empty array.")
      .describe("NVDA tests to register."),
  })
  .describe("Configuration accepted by defineNvdaTests.");

function defaultTestName(url: string, index: number) {
  const parsed = new URL(url);
  const slug = `${parsed.hostname}${parsed.pathname}`
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return slug || `test-${index + 1}`;
}

function formatZodPath(path: readonly PropertyKey[]): string {
  return path.reduce<string>((formatted, segment) => {
    if (typeof segment === "number") {
      return `${formatted}[${segment}]`;
    }

    return `${formatted}.${String(segment)}`;
  }, "");
}

function formatZodError(error: z.ZodError, source: string) {
  return error.issues
    .map((issue) => `${source}${formatZodPath(issue.path)} ${issue.message}`)
    .join("\n");
}

export function defineScreenReaderConfig<
  const Config extends ScreenReaderConfigInput,
>(
  config: Config,
) {
  screenReaderConfigSchema.parse(config);
  return config;
}

export function parseScreenReaderConfig(
  input: ScreenReaderConfigInput,
  source = "screen reader config",
): ScreenReaderConfig {
  const parsed = screenReaderConfigSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(formatZodError(parsed.error, source));
  }

  const tests = parsed.data.tests.map((testCase, testIndex) => ({
    ...testCase,
    name: testCase.name ?? defaultTestName(testCase.url, testIndex),
    steps: testCase.steps.map((step, stepIndex) => ({
      ...step,
      name: step.name ?? `${stepIndex + 1}-${step.action}`,
    })),
  }));

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
