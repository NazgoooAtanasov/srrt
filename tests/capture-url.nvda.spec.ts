import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { expect } from "@playwright/test";
import { windowsActivate } from "@guidepup/guidepup";
import { nvdaTest as test } from "@guidepup/playwright";

import { loadScreenReaderConfig } from "../scripts/screen-reader-config.ts";
import type { ScreenReaderStep } from "../scripts/screen-reader-config.ts";

const artifactDir = join("artifacts", "screen-reader");
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
  speech: string[];
  speechText: string;
};

type StepNvda = {
  keyboardCommands: {
    reportCurrentFocus: unknown;
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
): Promise<StepResult> {
  await nvda.clearSpokenPhraseLog();

  if (step.action === "reportFocus") {
    await nvda.perform(nvda.keyboardCommands.reportCurrentFocus);
  } else if (step.action === "tab") {
    await nvda.press("Tab");
  } else {
    await nvda.act();
  }

  const speech = await nvda.spokenPhraseLog();

  return {
    name: step.name,
    action: step.action,
    speechContains: step.speechContains,
    speech,
    speechText: speech.join(" "),
  };
}

test.skip(process.platform !== "win32", "NVDA automation requires Windows.");

const configPath = process.env.SR_CAPTURE_CONFIG;
const screenReaderConfig = configPath
  ? loadScreenReaderConfig(configPath)
  : undefined;

if (!screenReaderConfig) {
  test("requires a screen reader config", async () => {
    throw new Error(
      "Missing SR_CAPTURE_CONFIG. Run: bun run test:sr -- <config-path>",
    );
  });
} else {
  for (const testCase of screenReaderConfig.tests) {
    test(`opens URL and checks screen reader speech: ${testCase.name}`, async ({
      browserName,
      page,
      nvda,
    }) => {
      await page.goto(testCase.url, { waitUntil: "domcontentloaded" });
      await page.bringToFront();

      await page
        .waitForLoadState("networkidle", { timeout: 3_000 })
        .catch(() => {
          // Retail pages often keep analytics and personalization requests open.
        });

      const landingSpeech = await nvda.spokenPhraseLog();
      const browserApplication = browserApplications[browserName];
      if (browserApplication) {
        await windowsActivate(browserApplication.path, browserApplication.title);
      }

      await page.bringToFront();
      const titleSpeech = [];
      let titleSpeechText = "";

      if (testCase.titleContains) {
        await nvda.clearSpokenPhraseLog();
        await nvda.perform(nvda.keyboardCommands.reportTitle);
        titleSpeech.push(...(await nvda.spokenPhraseLog()));
        titleSpeechText = titleSpeech.join(" ");
      }

      const stepResults = [];
      for (const step of testCase.steps) {
        stepResults.push(await runStep(step, nvda));
      }

      const result = {
        capturedAt: new Date().toISOString(),
        configPath,
        testName: testCase.name,
        url: testCase.url,
        browser: browserName,
        screenReader: "NVDA",
        expected: {
          titleSpeechContains: testCase.titleContains,
          steps: testCase.steps.map((step) => ({
            name: step.name,
            action: step.action,
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
              `- step "${step.name}" ${step.action} speech contains: ${step.speechContains}`,
          ),
          "",
          "Actual:",
          ...(testCase.titleContains
            ? [`- title speech text: ${titleSpeechText}`]
            : []),
          ...stepResults.map(
            (step) =>
              `- step "${step.name}" ${step.action} speech text: ${step.speechText}`,
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
