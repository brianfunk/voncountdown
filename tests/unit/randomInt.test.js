const { randomInt } = require('../../src/utils/random');

describe('randomInt', () => {
	test('should return a number within the specified range', () => {
		const result = randomInt(1, 10);
		expect(result).toBeGreaterThanOrEqual(1);
		expect(result).toBeLessThanOrEqual(10);
	});

	test('should handle min equals max', () => {
		expect(randomInt(5, 5)).toBe(5);
	});

	test('should handle negative numbers', () => {
		const result = randomInt(-10, -1);
		expect(result).toBeGreaterThanOrEqual(-10);
		expect(result).toBeLessThanOrEqual(-1);
	});

	test('should return integer', () => {
		const result = randomInt(1, 100);
		expect(Number.isInteger(result)).toBe(true);
	});
});
