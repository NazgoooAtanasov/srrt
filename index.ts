export { defineNvdaTests } from "./src/nvda-tests.ts";
export type { DefineNvdaTestsOptions } from "./src/nvda-tests.ts";
export {
  activateStepSchema,
  defineScreenReaderConfig,
  focusSelectorStepSchema,
  parseScreenReaderConfig,
  reportFocusStepSchema,
  screenReaderConfigSchema,
  screenReaderStepSchema,
  screenReaderTestCaseSchema,
  tabStepSchema,
} from "./src/screen-reader-config.ts";
export type {
  ActivateStepInput,
  FocusSelectorScreenReaderStep,
  FocusSelectorStepInput,
  NonSelectorScreenReaderStep,
  ReportFocusStepInput,
  ScreenReaderAction,
  ScreenReaderConfig,
  ScreenReaderConfigInput,
  ScreenReaderStep,
  ScreenReaderStepInput,
  ScreenReaderTestCase,
  ScreenReaderTestCaseInput,
  TabStepInput,
} from "./src/screen-reader-config.ts";
