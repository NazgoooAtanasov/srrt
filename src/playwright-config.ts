import { defineConfig } from "@playwright/test";
import type { PlaywrightTestConfig } from "@playwright/test";
import { screenReaderConfig } from "@guidepup/playwright";

export type ScreenReaderPlaywrightConfigOptions = PlaywrightTestConfig;

const defaultProjects: NonNullable<PlaywrightTestConfig["projects"]> = [
  {
    name: "chromium-nvda",
    use: {
      browserName: "chromium",
      headless: false,
      viewport: null,
      launchOptions: {
        args: ["--start-maximized"],
      },
    },
  },
];

export function defineScreenReaderPlaywrightConfig(
  options: ScreenReaderPlaywrightConfigOptions = {},
) {
  return defineConfig({
    ...screenReaderConfig,
    reportSlowTests: null,
    timeout: 2 * 60 * 1000,
    retries: 0,
    reporter: [["list"], ["html", { open: "never" }]],
    outputDir: "test-results",
    projects: defaultProjects,
    ...options,
  });
}

export const defaultScreenReaderPlaywrightConfig =
  defineScreenReaderPlaywrightConfig();
