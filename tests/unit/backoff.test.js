import {
	nextRetryDelay,
	ACCOUNT_PROBLEM_DELAY_MS,
	RATE_LIMIT_DEFAULT_DELAY_MS,
	GENERIC_MAX_DELAY_MS,
	MINUTE
} from '../../src/countdown/backoff.js';

describe('nextRetryDelay', () => {
	test('402 credits depleted waits 6 hours and explains itself', () => {
		const error = { code: 402, data: { detail: 'credits depleted', status: 402 } };
		const result = nextRetryDelay(error, 1);
		expect(result.kind).toBe('account');
		expect(result.delayMs).toBe(ACCOUNT_PROBLEM_DELAY_MS);
		expect(result.reason).toMatch(/credits depleted/i);
	});

	test('401 and 403 are treated as account problems', () => {
		expect(nextRetryDelay({ code: 401 }, 1).kind).toBe('account');
		expect(nextRetryDelay({ status: 403 }, 1).kind).toBe('account');
	});

	test('429 uses the daily reset when the day bucket is exhausted', () => {
		const now = 1_000_000_000_000;
		const error = {
			code: 429,
			rateLimit: {
				reset: Math.floor(now / 1000) + 60,
				day: { limit: 17, remaining: 0, reset: Math.floor(now / 1000) + 3600 }
			}
		};
		const result = nextRetryDelay(error, 1, now);
		expect(result.kind).toBe('rate-limit');
		expect(result.delayMs).toBe(3600 * 1000);
	});

	test('429 falls back to the general reset, with a one minute floor', () => {
		const now = 1_000_000_000_000;
		const error = { code: 429, rateLimit: { reset: Math.floor(now / 1000) - 5 } };
		expect(nextRetryDelay(error, 1, now).delayMs).toBe(MINUTE);
	});

	test('429 without any reset waits the default', () => {
		expect(nextRetryDelay({ code: 429 }, 1).delayMs).toBe(RATE_LIMIT_DEFAULT_DELAY_MS);
	});

	test('generic errors double from one minute and cap at one hour', () => {
		const error = new Error('boom');
		expect(nextRetryDelay(error, 1).delayMs).toBe(MINUTE);
		expect(nextRetryDelay(error, 2).delayMs).toBe(2 * MINUTE);
		expect(nextRetryDelay(error, 3).delayMs).toBe(4 * MINUTE);
		expect(nextRetryDelay(error, 7).delayMs).toBe(GENERIC_MAX_DELAY_MS);
		expect(nextRetryDelay(error, 50).delayMs).toBe(GENERIC_MAX_DELAY_MS);
		expect(nextRetryDelay(error, 1).kind).toBe('generic');
	});

	test('handles a missing error object', () => {
		expect(nextRetryDelay(undefined, 1).delayMs).toBe(MINUTE);
	});
});
