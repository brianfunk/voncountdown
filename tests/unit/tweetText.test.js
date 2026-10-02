import { buildTweetText, short_phrase, short_tags, MAX_TWEET_LENGTH } from '../../src/countdown/tweetText.js';

const formatted = {
	string: 'One Hundred Twenty-Three!',
	comma: '123'
};

describe('buildTweetText', () => {
	test('plain post is the number in words', () => {
		expect(buildTweetText(formatted, { withPhrase: false })).toBe('One Hundred Twenty-Three!');
	});

	test('phrase post uses the comma number, a phrase and a tag', () => {
		const text = buildTweetText(formatted, { withPhrase: true, phrase: 'Ah ah ah!!', tag: '#count' });
		expect(text).toBe('123! Ah ah ah!! #count');
	});

	test('random phrase and tag come from the lists', () => {
		const text = buildTweetText(formatted, { withPhrase: true });
		expect(text.startsWith('123! ')).toBe(true);
		expect(short_phrase.some(p => text.includes(p))).toBe(true);
		expect(short_tags.some(t => text.endsWith(t))).toBe(true);
	});

	test('never exceeds the 280-character limit', () => {
		const long = { string: 'Word '.repeat(100) + '!', comma: '1' };
		const text = buildTweetText(long, { withPhrase: false });
		expect(text.length).toBeLessThanOrEqual(MAX_TWEET_LENGTH);
		expect(text.endsWith('...')).toBe(true);
	});

	test('random choice produces one of the two shapes', () => {
		for (let i = 0; i < 50; i++) {
			const text = buildTweetText(formatted);
			expect(text === formatted.string || text.startsWith('123! ')).toBe(true);
		}
	});
});
