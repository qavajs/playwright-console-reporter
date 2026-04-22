import { defineConfig, devices } from '@playwright/test';
import { tags } from '@qavajs/playwright-runner-adapter';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
    testMatch: 'cucumber.config.ts',
    /* Retry on CI only */
    retries: 2,
    /* Opt out of parallel tests on CI. */
    workers: 3,
    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: [
        ['html', { outputFolder: 'report', open: 'never' }],
        ['junit', { outputFile: 'report/report.xml' }],
        ['../src/reporter.ts', { showOutput: true }]
    ],
    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
        /* Base URL to use in actions like `await page.goto('/')`. */
        // baseURL: 'http://127.0.0.1:3000',

        /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
        // headless: false
    },

    /* Configure projects for major browsers */
    projects: [
        {
            name: 'unit',
            testMatch: 'unit.spec.ts',
        },
        {
            name: 'adapterTS',
            testMatch: 'adapterTS.config.ts',
            use: {
                ...devices['Desktop Chrome'],
                hasTouch: true
            },
        },
        {
            name: 'adapterCJS',
            testMatch: 'adapterCJS.config.js',
            use: {
                ...devices['Desktop Chrome'],
                hasTouch: true
            },
        },
        {
            name: 'adapterMJS',
            testMatch: 'adapterMJS.config.js',
            use: {
                ...devices['Desktop Chrome'],
                hasTouch: true
            },
        },
        {
            name: 'parallel',
            grep: tags('not @noParallel'),
            use: {
                ...devices['Desktop Chrome'],
                hasTouch: true,
            },
            fullyParallel: true
        },
        {
            name: 'serial',
            grep: tags('@noParallel'),
            use: {
                ...devices['Desktop Chrome'],
                hasTouch: true,
            },
            fullyParallel: false
        },
    ]
});
