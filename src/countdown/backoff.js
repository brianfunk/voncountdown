export const MINUTE = 60 * 1000;
export const HOUR = 60 * MINUTE;

/** Retry delay when X refuses us for account reasons (no credits, bad auth). */
export const ACCOUNT_PROBLEM_DELAY_MS = 6 * HOUR;

/** Default wait when a 429 carries no reset timestamp. */
export const RATE_LIMIT_DEFAULT_DELAY_MS = 15 * MINUTE;

/** Generic failures double from one minute up to this cap. */
export const GENERIC_MAX_DELAY_MS = 1 * HOUR;

/**
 * Reads an HTTP-ish status from a twitter-api-v2 error or a plain object.
 * @param {*} error
 * @returns {number|undefined}
 */
function statusOf(error) {
	if (!error) return undefined;
	const candidates = [error.code, error.status, error.data?.status, error.$metadata?.httpStatusCode];
	return candidates.find(value => typeof value === 'number');
}

/**
 * Decides when to retry after a failed countdown attempt and why.
 *
 * - 402 (credits depleted), 401 and 403: the account itself is the problem, so
 *   wait a long time instead of hammering X every minute.
 * - 429: honour the rate-limit reset time X sends back.
 * - Anything else: exponential backoff, capped.
 *
 * @param {*} error - the thrown error (twitter-api-v2 errors carry code/status/rateLimit)
 * @param {number} consecutiveFailures - failures so far including this one (>= 1)
 * @param {number} [now=Date.now()] - current time in ms, injectable for tests
 * @returns {{ delayMs: number, kind: 'account' | 'rate-limit' | 'generic', reason: string }}
 */
export function nextRetryDelay(error, consecutiveFailures, now = Date.now()) {
	const status = statusOf(error);

	if (status === 402) {
		return {
			delayMs: ACCOUNT_PROBLEM_DELAY_MS,
			kind: 'account',
			reason: 'X API credits depleted. Buy credits at https://developer.x.com (pay-per-use). Retrying in 6 hours.'
		};
	}

	if (status === 401 || status === 403) {
		return {
			delayMs: ACCOUNT_PROBLEM_DELAY_MS,
			kind: 'account',
			reason: `X API rejected our credentials (HTTP ${status}). Check the TWITTER_* keys and app permissions. Retrying in 6 hours.`
		};
	}

	if (status === 429) {
		const rateLimit = error.rateLimit || {};
		const buckets = [rateLimit.day, rateLimit.userDay].filter(Boolean);
		const exhausted = buckets.find(bucket => bucket.remaining === 0 && bucket.reset);
		const resetSeconds = exhausted?.reset ?? rateLimit.reset;
		const delayMs = resetSeconds
			? Math.max(resetSeconds * 1000 - now, MINUTE)
			: RATE_LIMIT_DEFAULT_DELAY_MS;
		return {
			delayMs,
			kind: 'rate-limit',
			reason: `X rate limit hit. Waiting for reset (${Math.ceil(delayMs / MINUTE)} min).`
		};
	}

	const exponent = Math.max(0, Math.min(consecutiveFailures - 1, 10));
	const delayMs = Math.min(MINUTE * Math.pow(2, exponent), GENERIC_MAX_DELAY_MS);
	return {
		delayMs,
		kind: 'generic',
		reason: `Unexpected error (${error?.name || 'Error'}: ${error?.message || 'unknown'}). Retrying in ${Math.ceil(delayMs / MINUTE)} min.`
	};
}
