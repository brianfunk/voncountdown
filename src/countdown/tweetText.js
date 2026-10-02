import { randomInt } from '../utils/random.js';

/** Twitter/X hard limit on post length. */
export const MAX_TWEET_LENGTH = 280;

/** 1 in (PHRASE_ODDS + 1) posts get a phrase and a tag. */
export const PHRASE_ODDS = 4;

// Phrases for adding random humorous or engaging variety to posts.
export const short_phrase = [
	'Ha ha ha!!',
	'Ah ah ah!!',
	'Ah ha ha!!',
	'Ah ha ha ha!!',
	'Don\'t forget to count!!',
	'Wonderful!!',
	'I love motion pictures!!',
	'I love counting!!',
	'Now, that was silly!!',
	'Wouldn\'t you agree, my bats?',
	'I love traditions!!',
	'I will count them!!',
	'There\'s always something to count!!',
	'Don\'t count the days, make the days count!!',
	'Werry good!!',
	'Yeees!!',
	'You know that I am called the Count!!',
	'I really love to count!!',
	'I could sit and count all day!!',
	'Sometimes I get carried away!!',
	'Yeees!!',
	'I count slowly!!',
	'Once I\'ve started counting it\'s really hard to stop!!',
	'I could count forever!!',
	'I love counting whatever the amount!!',
	'When I\'m alone, I count myself!!',
	'Greetings!!',
	'Counting is fun!!',
	'I vant to count your numbers!!',
	'I love big numbers and I cannot lie!!',
	'Sometimes I just count away!!',
	'Numbers are useful!!',
	'I love to count things!!'
];

// Random short tags (mentions and hashtags) appended to some posts.
export const short_tags = [
	'@CountVonCount',
	'@CountVonCount',
	'@CountVonCount',
	'@SesameWorkshop',
	'@sesamestreet',
	'@BigBird',
	'@OscarTheGrouch',
	'@elmo',
	'@MeCookieMonster',
	'@Grover',
	'@KermitTheFrog',
	'@ollie',
	'@brianfunk_',
	'@brianfunk_',
	'#sesamestreet',
	'#numberstring',
	'#numbers',
	'#count',
	'#counting',
	'#ilovecounting',
	'#iheartcounting',
	'#ilovenumbers',
	'#iheartnumbers',
	'#CountessVonBackwards',
	'#CountessvonDahling',
	'#LadyTwo',
	'#TheCountess',
	'#CountVonCount',
	'#countmobile',
	'#itsthefinalcountdown',
	'#countdown',
	'#countupsidedown',
	'#countingisfun',
	'#ahhaha',
	'#yeees'
];

/**
 * Builds the text for one countdown post.
 *
 * Plain posts are the number in words. Roughly one in five posts instead uses
 * the comma-formatted number plus a random phrase and tag. The result is always
 * within the 280-character limit.
 *
 * @param {{ string: string, comma: string }} formatted - word and comma forms of the number
 * @param {{ withPhrase?: boolean, phrase?: string, tag?: string }} [options] - override the random choices (for tests)
 * @returns {string}
 */
export function buildTweetText(formatted, options = {}) {
	const withPhrase = options.withPhrase ?? (randomInt(0, PHRASE_ODDS) === PHRASE_ODDS);

	let text = formatted.string;
	if (withPhrase) {
		const phrase = options.phrase ?? short_phrase[randomInt(0, short_phrase.length - 1)];
		const tag = options.tag ?? short_tags[randomInt(0, short_tags.length - 1)];
		text = `${formatted.comma}! ${phrase} ${tag}`;
	}

	if (text.length > MAX_TWEET_LENGTH) {
		text = text.substring(0, MAX_TWEET_LENGTH - 3) + '...';
	}

	return text;
}
