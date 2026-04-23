# @qavajs/playwright-console-reporter

A Cucumber-style console reporter for [Playwright Test](https://playwright.dev/)

## Installation

```bash
npm install @qavajs/playwright-console-reporter
```

## Usage

Register the reporter in your Playwright config:

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['@qavajs/playwright-console-reporter']
  ]
});
```

### With options

```ts
export default defineConfig({
  reporter: [
    ['@qavajs/playwright-console-reporter', { showOutput: true }]
  ]
});
```

## Options

| Option       | Type    | Default      | Description                                                                 |
|--------------|---------|--------------|-----------------------------------------------------------------------------|
| `showOutput` | boolean | `false`      | Print captured stdout/stderr beneath each step (truncated to 60 chars/line) |
| `prefix`     | string  | `"Scenario"` | Label shown before each test name in the report                             |

## Output example

```
Feature: Login

  ✓ Scenario: Successful login (1.23s)
    ✓ Given I am on the login page
    ✓ When I enter valid credentials
    ✓ Then I should be redirected to the dashboard

  ✗ Scenario: Failed login (0.45s)
    ✓ Given I am on the login page
    ✗ When I enter invalid credentials
      Error: expect(received).toBe(expected)

------------------------------------------------------------
Scenarios: 2 total, 1 failed, 1 passed, 0 skipped
Steps:     6 total, 1 failed, 5 passed, 0 skipped
Status:    ✗ FAILED
```

## License

MIT
