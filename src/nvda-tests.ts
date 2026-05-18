import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { windowsActivate } from "@guidepup/guidepup";
import { nvdaTest as test } from "@guidepup/playwright";

import { parseScreenReaderConfig } from "./screen-reader-config.ts";
import type { ScreenReaderStep } from "./screen-reader-config.ts";

export type DefineNvdaTestsOptions = {
  artifactDir?: string;
  source?: string;
};

const defaultArtifactDir = join("artifacts", "screen-reader");
const browserApplications: Record<string, { path: string; title: string }> = {
  chromium: { path: "chrome.exe", title: "Google Chrome For Testing" },
};

function artifactBaseName(name: string) {
  const slug = name
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return `${slug || "capture"}.nvda`;
}

function speechIncludes(actual: string, expected: string) {
  const normalizeSpeech = (value: string) =>
    value
      .toLocaleLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .replace(/\s+/g, " ");

  return normalizeSpeech(actual).includes(normalizeSpeech(expected));
}

type StepResult = {
  name: string;
  action: ScreenReaderStep["action"];
  speechContains: string;
  selector?: string;
  index: number;
  speech: string[];
  speechText: string;
};

type StepNvda = {
  keyboardCommands: {
    reportCurrentFocus: unknown;
    reportTitle: unknown;
  };
  clearSpokenPhraseLog(): Promise<void>;
  perform(command: unknown): Promise<void>;
  press(key: string): Promise<void>;
  act(): Promise<void>;
  spokenPhraseLog(): Promise<string[]>;
};

async function runStep(
  step: ScreenReaderStep,
  nvda: StepNvda,
  page: Page,
): Promise<StepResult> {
  await nvda.clearSpokenPhraseLog();

  if (step.action === "reportFocus") {
    await nvda.perform(nvda.keyboardCommands.reportCurrentFocus);
  } else if (step.action === "tab") {
    await nvda.press("Tab");
  } else if (step.action === "activate") {
    await nvda.act();
  } else {
    const selector = step.selector;
    if (!selector) {
      throw new Error(`Step "${step.name}" is missing selector.`);
    }

    const element = page.locator(selector).nth(step.index - 1);
    await element.waitFor({ state: "visible", timeout: 10_000 });
    await element.scrollIntoViewIfNeeded();
    await element.focus();
    await nvda.perform(nvda.keyboardCommands.reportCurrentFocus);
  }

  const speech = await nvda.spokenPhraseLog();

  return {
    name: step.name,
    action: step.action,
    speechContains: step.speechContains,
    selector: step.selector,
    index: step.index,
    speech,
    speechText: speech.join(" "),
  };
}

export function defineNvdaTests(
  configInput: unknown,
  options: DefineNvdaTestsOptions = {},
) {
  const source = options.source ?? "screen reader config";
  const artifactDir = options.artifactDir ?? defaultArtifactDir;
  const screenReaderConfig = parseScreenReaderConfig(configInput, source);

  test.skip(process.platform !== "win32", "NVDA automation requires Windows.");

  for (const testCase of screenReaderConfig.tests) {
    test(`opens URL and checks screen reader speech: ${testCase.name}`, async ({
      browserName,
      page,
      nvda,
    }) => {
      const stepNvda = nvda as StepNvda;

      await page.goto(testCase.url, { waitUntil: "domcontentloaded" });
      await page.bringToFront();

      await page
        .waitForLoadState("networkidle", { timeout: 3_000 })
        .catch(() => {
          // Retail pages often keep analytics and personalization requests open.
        });

      const landingSpeech = await stepNvda.spokenPhraseLog();
      const browserApplication = browserApplications[browserName];
      if (browserApplication) {
        await windowsActivate(browserApplication.path, browserApplication.title);
      }

      await page.bringToFront();
      const titleSpeech: string[] = [];
      let titleSpeechText = "";

      if (testCase.titleContains) {
        await stepNvda.clearSpokenPhraseLog();
        await stepNvda.perform(stepNvda.keyboardCommands.reportTitle);
        titleSpeech.push(...(await stepNvda.spokenPhraseLog()));
        titleSpeechText = titleSpeech.join(" ");
      }

      const stepResults: StepResult[] = [];
      for (const step of testCase.steps) {
        stepResults.push(await runStep(step, stepNvda, page));
      }

      const result = {
        capturedAt: new Date().toISOString(),
        configPath: source,
        testName: testCase.name,
        url: testCase.url,
        browser: browserName,
        screenReader: "NVDA",
        expected: {
          titleSpeechContains: testCase.titleContains,
          steps: testCase.steps.map((step) => ({
            name: step.name,
            action: step.action,
            ...(step.selector
              ? {
                  selector: step.selector,
                  index: step.index,
                }
              : {}),
            speechContains: step.speechContains,
          })),
        },
        actual: {
          ...(testCase.titleContains
            ? {
                titleSpeech,
                titleSpeechText,
              }
            : {}),
          steps: stepResults.map((step) => ({
            name: step.name,
            action: step.action,
            ...(step.selector
              ? {
                  selector: step.selector,
                  index: step.index,
                }
              : {}),
            speech: step.speech,
            speechText: step.speechText,
          })),
        },
        diagnostics: {
          landingSpeech,
        },
      };

      await mkdir(artifactDir, { recursive: true });
      const baseName = artifactBaseName(testCase.name);

      await writeFile(
        join(artifactDir, `${baseName}.json`),
        `${JSON.stringify(result, null, 2)}\n`,
      );
      await writeFile(
        join(artifactDir, `${baseName}.txt`),
        [
          `Test: ${testCase.name}`,
          `URL: ${testCase.url}`,
          "",
          "Expected:",
          ...(testCase.titleContains
            ? [`- title speech contains: ${testCase.titleContains}`]
            : []),
          ...testCase.steps.map(
            (step) =>
              `- step "${step.name}" ${step.action}${step.selector ? ` ${step.selector} [${step.index}]` : ""} speech contains: ${step.speechContains}`,
          ),
          "",
          "Actual:",
          ...(testCase.titleContains
            ? [`- title speech text: ${titleSpeechText}`]
            : []),
          ...stepResults.map(
            (step) =>
              `- step "${step.name}" ${step.action}${step.selector ? ` ${step.selector} [${step.index}]` : ""} speech text: ${step.speechText}`,
          ),
          "",
          "Diagnostics:",
          "Landing speech:",
          ...landingSpeech.map((phrase) => `- ${phrase}`),
          "",
        ].join("\n"),
      );

      if (testCase.titleContains) {
        expect(
          speechIncludes(titleSpeechText, testCase.titleContains),
          `NVDA title speech should include "${testCase.titleContains}"`,
        ).toBe(true);
      }

      for (const step of stepResults) {
        expect(
          speechIncludes(step.speechText, step.speechContains),
          `Step "${step.name}" speech should include "${step.speechContains}"`,
        ).toBe(true);
      }
    });
  }
}
