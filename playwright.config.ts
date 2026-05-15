import { defineConfig } from "@playwright/test";
import { screenReaderConfig } from "@guidepup/playwright";

export default defineConfig({
  ...screenReaderConfig,
  reportSlowTests: null,
  timeout: 2 * 60 * 1000,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  outputDir: "test-results",
  projects: [
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
  ],
});
