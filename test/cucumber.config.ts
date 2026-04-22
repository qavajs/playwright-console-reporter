import { defineConfig } from "@qavajs/playwright-runner-adapter";

export default defineConfig({
    paths: ['test/features/*.feature'],
    require: ['test/step_definitions/*.ts']
})