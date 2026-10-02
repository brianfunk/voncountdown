import { comma } from 'numberstring';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const YEAR = 365.25 * DAY;

/**
 * "3 hours ago" style relative time.
 * @param {string|number|Date} when
 * @param {number} [now=Date.now()]
 * @returns {string}
 */
export function relativeTime(when, now = Date.now()) {
	const then = new Date(when).getTime();
	if (!Number.isFinite(then)) return 'never';
	const diff = Math.max(0, now - then);
	if (diff < MINUTE) return 'just now';
	const units = [
		[YEAR, 'year'],
		[DAY * 30, 'month'],
		[DAY, 'day'],
		[HOUR, 'hour'],
		[MINUTE, 'minute']
	];
	for (const [size, name] of units) {
		if (diff >= size) {
			const count = Math.floor(diff / size);
			return `${count} ${name}${count === 1 ? '' : 's'} ago`;
		}
	}
	return 'just now';
}

/**
 * Turns a big number of years into something a vampire would say.
 * @param {number} years
 * @returns {string}
 */
export function humanYears(years) {
	if (!Number.isFinite(years) || years <= 0) return 'any moment now';
	if (years < 1) return 'less than a year';
	const scales = [
		[1e12, 'trillion'],
		[1e9, 'billion'],
		[1e6, 'million'],
		[1e3, 'thousand']
	];
	for (const [size, name] of scales) {
		if (years >= size) {
			const scaled = years / size;
			const rounded = scaled >= 10 ? Math.round(scaled) : Math.round(scaled * 10) / 10;
			return `about ${rounded} ${name} years`;
		}
	}
	return `about ${Math.round(years)} years`;
}

/**
 * Builds the numbers for the Count's Ledger panel.
 *
 * @param {object} input
 * @param {number} input.startNumber - where the countdown began
 * @param {number} input.currentNumber - the latest posted number
 * @param {string|null} input.firstPostAt - ISO datetime of the oldest post
 * @param {string|null} input.lastPostAt - ISO datetime of the newest post
 * @param {number} input.postCount - total posts recorded
 * @param {number} [input.now=Date.now()]
 * @returns {{
 *   countedSoFar: string, countingSince: string, lastCount: string,
 *   pacePerDay: string, numbersLeft: string, eta: string, etaYears: number|null
 * }}
 */
export function computeStats({ startNumber, currentNumber, firstPostAt, lastPostAt, postCount, now = Date.now() }) {
	const counted = Math.max(0, startNumber - currentNumber);
	const left = Math.max(0, currentNumber);

	const first = firstPostAt ? new Date(firstPostAt).getTime() : NaN;
	const elapsedDays = Number.isFinite(first) ? Math.max((now - first) / DAY, 1) : null;
	const perDay = elapsedDays && counted > 0 ? counted / elapsedDays : null;

	let etaYears = null;
	if (perDay && perDay > 0) {
		etaYears = (left / perDay) / 365.25;
	}

	return {
		countedSoFar: comma(counted),
		countingSince: Number.isFinite(first)
			? new Date(first).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
			: 'the dawn of time',
		lastCount: lastPostAt ? relativeTime(lastPostAt, now) : 'never',
		pacePerDay: perDay ? (perDay >= 10 ? Math.round(perDay).toString() : (Math.round(perDay * 10) / 10).toString()) : '0',
		numbersLeft: comma(left),
		eta: etaYears === null ? 'unknowable' : humanYears(etaYears),
		etaYears,
		postCount: comma(postCount || 0)
	};
}
