import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { expect } from "@playwright/test";
import { windowsActivate } from "@guidepup/guidepup";
import { nvdaTest as test } from "@guidepup/playwright";

import { loadScreenReaderConfig } from "../scripts/screen-reader-config.ts";

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
    test(`opens URL and checks title speech: ${testCase.name}`, async ({
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
      await nvda.clearSpokenPhraseLog();
      await nvda.perform(nvda.keyboardCommands.reportTitle);
      const titleSpeech = await nvda.spokenPhraseLog();
      const titleSpeechText = titleSpeech.join(" ");

      const result = {
        capturedAt: new Date().toISOString(),
        configPath,
        testName: testCase.name,
        url: testCase.url,
        browser: browserName,
        screenReader: "NVDA",
        expected: {
          titleSpeechContains: testCase.titleContains,
        },
        actual: {
          titleSpeech,
          titleSpeechText,
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
          `- title speech contains: ${testCase.titleContains}`,
          "",
          "Actual:",
          `- title speech text: ${titleSpeechText}`,
          "",
          "Diagnostics:",
          "Landing speech:",
          ...landingSpeech.map((phrase) => `- ${phrase}`),
          "",
        ].join("\n"),
      );

      expect(
        titleSpeechText.includes(testCase.titleContains),
        `NVDA title speech should include "${testCase.titleContains}"`,
      ).toBe(true);
    });
  }
}
