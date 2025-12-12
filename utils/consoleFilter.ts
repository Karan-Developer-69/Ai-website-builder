/**
 * Console Warning Filter
 * Suppressesunnecessary warnings from WebContainer's internal workers
 * These warnings are harmless but clutter the console
 */

const SUPPRESSED_WARNINGS = [
    'was preloaded using link preload but not used',
    'fetch.worker',
    'headless?version',
];

export function initConsoleFilter() {
    // Store original console methods
    const originalWarn = console.warn;
    const originalError = console.error;

    // Override console.warn
    console.warn = (...args: any[]) => {
        const message = args.join(' ');

        // Check if this warning should be suppressed
        const shouldSuppress = SUPPRESSED_WARNINGS.some(pattern =>
            message.includes(pattern)
        );

        if (!shouldSuppress) {
            originalWarn.apply(console, args);
        }
    };

    // Override console.error for specific WebContainer errors
    console.error = (...args: any[]) => {
        const message = args.join(' ');

        // Only suppress preload warnings, not actual errors
        const shouldSuppress = SUPPRESSED_WARNINGS.some(pattern =>
            message.includes(pattern)
        ) && !message.includes('Failed') && !message.includes('Error:');

        if (!shouldSuppress) {
            originalError.apply(console, args);
        }
    };

    console.log('[ConsoleFilter] 🧹 WebContainer warning suppression enabled');
}

/**
 * Restore original console methods if needed
 */
export function disableConsoleFilter() {
    // Not implemented as we want to keep filter active
    console.log('[ConsoleFilter] Filter remains active for cleaner console');
}
