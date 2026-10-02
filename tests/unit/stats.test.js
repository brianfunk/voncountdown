import { computeStats, relativeTime, humanYears } from '../../src/countdown/stats.js';

const DAY = 24 * 60 * 60 * 1000;

describe('relativeTime', () => {
	const now = Date.parse('2026-10-01T12:00:00Z');

	test('just now, minutes, hours, days', () => {
		expect(relativeTime(now - 10_000, now)).toBe('just now');
		expect(relativeTime(now - 5 * 60_000, now)).toBe('5 minutes ago');
		expect(relativeTime(now - 60 * 60_000, now)).toBe('1 hour ago');
		expect(relativeTime(now - 3 * DAY, now)).toBe('3 days ago');
		expect(relativeTime(now - 45 * DAY, now)).toBe('1 month ago');
		expect(relativeTime(now - 800 * DAY, now)).toBe('2 years ago');
	});

	test('garbage dates say never', () => {
		expect(relativeTime('not a date', now)).toBe('never');
	});
});

describe('humanYears', () => {
	test('scales up with the right word', () => {
		expect(humanYears(0.5)).toBe('less than a year');
		expect(humanYears(42)).toBe('about 42 years');
		expect(humanYears(2500)).toBe('about 2.5 thousand years');
		expect(humanYears(607_000_000)).toBe('about 607 million years');
		expect(humanYears(3.2e12)).toBe('about 3.2 trillion years');
	});
});

describe('computeStats', () => {
	const now = Date.parse('2026-10-01T00:00:00Z');

	test('known fixture', () => {
		const stats = computeStats({
			startNumber: 1_111_373_357_579,
			currentNumber: 1_111_373_344_463,
			firstPostAt: new Date(now - 3000 * DAY).toISOString(),
			lastPostAt: new Date(now - 2 * DAY).toISOString(),
			postCount: 11_619,
			now
		});
		expect(stats.countedSoFar).toBe('13,116');
		expect(stats.numbersLeft).toBe('1,111,373,344,463');
		expect(stats.lastCount).toBe('2 days ago');
		expect(stats.pacePerDay).toBe('4.4');
		expect(stats.postCount).toBe('11,619');
		// 1.11 trillion left at ~4.4/day is hundreds of millions of years
		expect(stats.etaYears).toBeGreaterThan(500_000_000);
		expect(stats.eta).toMatch(/million years/);
	});

	test('no history yet', () => {
		const stats = computeStats({
			startNumber: 100,
			currentNumber: 100,
			firstPostAt: null,
			lastPostAt: null,
			postCount: 0,
			now
		});
		expect(stats.countedSoFar).toBe('0');
		expect(stats.countingSince).toBe('the dawn of time');
		expect(stats.lastCount).toBe('never');
		expect(stats.eta).toBe('unknowable');
	});
});
