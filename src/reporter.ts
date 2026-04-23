import type {
    Reporter,
    FullResult,
    TestCase,
    TestResult,
    TestStep
} from '@playwright/test/reporter';

// ANSI codes
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const LIGHT_BLUE = '\x1b[94m';
const GRAY = '\x1b[90m';

const isTTY = process.stdout.isTTY ?? false;

function fmt(text: string, ...codes: string[]): string {
    if (!isTTY) return text;
    return `${codes.join('')}${text}${RESET}`;
}

function ms(n: number): string {
    return n < 1000 ? `${n}ms` : `${(n / 1000).toFixed(2)}s`;
}

const HOOK_TITLES = new Set(['Before', 'After', 'Before All', 'After All']);
const OUTPUT_LINE_LIMIT = 60;

interface OutputEntry {
    text: string;
    isErr: boolean;
}

export default class CucumberConsoleReporter implements Reporter {
    private readonly showOutput: boolean;
    private readonly prefix: string;
    private readonly stepStacks = new Map<string, TestStep[]>();
    private readonly stepOutputMap = new WeakMap<TestStep, OutputEntry[]>();
    private passedScenarios = 0;
    private failedScenarios = 0;
    private skippedScenarios = 0;
    private passedSteps = 0;
    private failedSteps = 0;
    private skippedSteps = 0;

    constructor(options: { showOutput?: boolean; prefix?: string } = {}) {
        this.showOutput = options.showOutput ?? false;
        this.prefix = options.prefix ?? 'Scenario';
    }

    printsToStdio(): boolean {
        return true;
    }

    onStepBegin(test: TestCase, _result: TestResult, step: TestStep): void {
        if (!this.showOutput) return;
        const stack = this.stepStacks.get(test.id) ?? [];
        stack.push(step);
        this.stepStacks.set(test.id, stack);
        if (stack.length === 1) this.stepOutputMap.set(step, []);
    }

    onStepEnd(test: TestCase, _result: TestResult, _step: TestStep): void {
        if (!this.showOutput) return;
        this.stepStacks.get(test.id)?.pop();
    }

    onStdOut(chunk: string | Buffer, test: void | TestCase): void {
        if (!this.showOutput || !test) return;
        this.captureOutput(test.id, chunk.toString(), false);
    }

    onStdErr(chunk: string | Buffer, test: void | TestCase): void {
        if (!this.showOutput || !test) return;
        this.captureOutput(test.id, chunk.toString(), true);
    }

    private captureOutput(testId: string, text: string, isErr: boolean): void {
        const stack = this.stepStacks.get(testId);
        const rootStep = stack?.[0];
        if (!rootStep) return;
        this.stepOutputMap.get(rootStep)?.push({ text, isErr });
    }

    onTestEnd(test: TestCase, result: TestResult): void {
        const { status, duration, steps } = result;

        if (status === 'passed') this.passedScenarios++;
        else if (status === 'skipped') this.skippedScenarios++;
        else this.failedScenarios++;

        const [sym, col] = statusStyle(status);
        const tags = test.tags.length > 0 ? `\n${fmt(test.tags.join(' '), LIGHT_BLUE)}` : '';
        console.log(`${tags}\n${fmt(this.prefix + ': ' + test.title, BOLD)}  ${fmt(`${sym} (${ms(duration)})`, col)}`);

        if (status === 'skipped') {
            console.log(fmt('    - (skipped)', GRAY, DIM));
            return;
        }

        for (const step of steps) {
            this.printStep(step);
        }

        this.stepStacks.delete(test.id);

        // Fallback: show test-level error if no step captured it
        if (result.error && !steps.some(s => s.error)) {
            const lines = (result.error.message ?? '').split('\n').slice(0, 8);
            for (const line of lines) {
                console.log(fmt(`   ${line}`, RED, DIM));
            }
        }
    }

    private printStep(step: TestStep): void {
        const isHook = HOOK_TITLES.has(step.title);
        const failed = !!step.error;
        const interrupted = step.duration === -1;

        // Hide passing hooks — only surface them on failure
        if (isHook && !failed) return;

        if (!isHook) {
            if (failed) this.failedSteps++;
            else if (interrupted) this.skippedSteps++;
            else this.passedSteps++;
        }

        if (failed) {
            console.log(`${fmt('✗', RED)} ${fmt(step.title, RED)}`);
            const lines = (step.error!.message ?? '').split('\n').slice(0, 8);
            for (const line of lines) {
                if (line.trim()) console.log(fmt(`  ${line}`, RED, DIM));
            }
        } else if (interrupted) {
            console.log(`${fmt('-', YELLOW)} ${fmt(step.title, YELLOW)}`);
        } else {
            console.log(`${fmt('✓', GREEN)} ${step.title}`);
        }

        const output = this.stepOutputMap.get(step);
        if (output?.length) {
            for (const { text, isErr } of output) {
                for (const line of text.trimEnd().split('\n')) {
                    if (!line.trim()) continue;
                    const truncated = line.length > OUTPUT_LINE_LIMIT
                        ? line.slice(0, OUTPUT_LINE_LIMIT - 3) + '...'
                        : line;
                    console.log(isErr ? fmt(`  ${truncated}`, RED, DIM) : fmt(`  ${truncated}`, GRAY));
                }
            }
        }
    }

    onEnd(result: FullResult): void {
        const totalScenarios = this.passedScenarios + this.failedScenarios + this.skippedScenarios;
        const totalSteps = this.passedSteps + this.failedSteps + this.skippedSteps;

        console.log(`\n${'─'.repeat(60)}\n`);

        const scenarioParts = buildSummaryParts(totalScenarios, this.failedScenarios, this.passedScenarios, this.skippedScenarios);
        console.log(`Scenarios: ${scenarioParts.join(', ')}`);

        const stepParts = buildSummaryParts(totalSteps, this.failedSteps, this.passedSteps, this.skippedSteps);
        console.log(`Steps:     ${stepParts.join(', ')}`);

        console.log('');
        const overall = result.status === 'passed'
            ? fmt('✓ PASSED', GREEN, BOLD)
            : fmt('✗ FAILED', RED, BOLD);
        console.log(`Status:    ${overall}\n`);
    }
}

function statusStyle(status: string): [string, string] {
    switch (status) {
        case 'passed': return ['✓', GREEN];
        case 'failed': return ['✗', RED];
        case 'timedOut': return ['⏱', RED];
        case 'skipped': return ['-', YELLOW];
        case 'interrupted': return ['!', YELLOW];
        default: return ['?', GRAY];
    }
}

function buildSummaryParts(total: number, failed: number, passed: number, skipped: number): string[] {
    const parts: string[] = [`${total} total`];
    if (failed > 0) parts.push(fmt(`${failed} failed`, RED, BOLD));
    if (passed > 0) parts.push(fmt(`${passed} passed`, GREEN));
    if (skipped > 0) parts.push(fmt(`${skipped} skipped`, YELLOW));
    return parts;
}
