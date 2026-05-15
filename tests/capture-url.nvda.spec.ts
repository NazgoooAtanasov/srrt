import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { expect } from "@playwright/test";
import { nvdaTest as test } from "@guidepup/playwright";

const artifactDir = join("artifacts", "screen-reader");

function artifactBaseName(url: string) {
  const parsed = new URL(url);
  const slug = `${parsed.hostname}${parsed.pathname}`
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return `${slug || "capture"}.nvda`;
}

test.skip(process.platform !== "win32", "NVDA automation requires Windows.");

test("captures landing speech and first heading", async ({
  page,
  nvda,
}) => {
  const url = process.env.SR_CAPTURE_URL;
  if (!url) {
    throw new Error("Missing SR_CAPTURE_URL. Run: bun run test:sr -- <url>");
  }

  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.bringToFront();
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {
    // Retail pages often keep analytics and personalization requests open.
  });

  const landingSpeech = await nvda.spokenPhraseLog();

  await page.bringToFront();
  await nvda.perform(nvda.keyboardCommands.exitFocusMode);
  await page.keyboard.press("Control+Home");
  await nvda.clearItemTextLog();
  await nvda.clearSpokenPhraseLog();

  let headingAnnouncement = "";
  for (let attempt = 0; attempt < 20; attempt++) {
    await nvda.perform(nvda.keyboardCommands.moveToNextHeading);
    const phrase = await nvda.lastSpokenPhrase();

    if (phrase.toLowerCase().includes("heading")) {
      headingAnnouncement = phrase;
      break;
    }
  }

  const headingSpeech = await nvda.spokenPhraseLog();
  const result = {
    capturedAt: new Date().toISOString(),
    url,
    browser: "chromium",
    screenReader: "NVDA",
    landingSpeech,
    headingAnnouncement,
    headingSpeech,
  };

  await mkdir(artifactDir, { recursive: true });
  const baseName = artifactBaseName(url);

  await writeFile(
    join(artifactDir, `${baseName}.json`),
    `${JSON.stringify(result, null, 2)}\n`,
  );
  await writeFile(
    join(artifactDir, `${baseName}.txt`),
    [
      `URL: ${url}`,
      "",
      "Landing speech:",
      ...landingSpeech.map((phrase) => `- ${phrase}`),
      "",
      "First heading announcement:",
      headingAnnouncement,
      "",
      "Heading navigation speech:",
      ...headingSpeech.map((phrase) => `- ${phrase}`),
      "",
    ].join("\n"),
  );

  expect(headingAnnouncement, "NVDA should announce a heading").toContain(
    "heading",
  );
});
