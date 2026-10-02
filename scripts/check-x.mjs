// Checks that the X credentials in .env work and whether the account has API credits.
// Usage: npm run check:x
import 'dotenv/config';
import { TwitterApi } from 'twitter-api-v2';

const required = ['TWITTER_API_KEY', 'TWITTER_API_SECRET', 'TWITTER_ACCESS_TOKEN', 'TWITTER_ACCESS_TOKEN_SECRET'];
const missing = required.filter(name => !process.env[name]);
if (missing.length) {
	console.error('Missing env vars:', missing.join(', '));
	process.exit(1);
}

const client = new TwitterApi({
	appKey: process.env.TWITTER_API_KEY,
	appSecret: process.env.TWITTER_API_SECRET,
	accessToken: process.env.TWITTER_ACCESS_TOKEN,
	accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

function report(label, error) {
	const status = error?.code ?? error?.status;
	const detail = error?.data?.detail || error?.message;
	console.log(`${label}: FAILED (HTTP ${status ?? '?'}) ${detail}`);
	if (status === 402) {
		console.log('  -> X API credits depleted. Buy credits at https://developer.x.com (pay-per-use), then re-run.');
	} else if (status === 401 || status === 403) {
		console.log('  -> Credentials rejected. Regenerate the keys in the X developer portal and check app permissions are Read and Write.');
	}
}

let me;
try {
	me = await client.v2.me();
	console.log(`Credentials: OK (@${me.data.username}, id ${me.data.id})`);
} catch (error) {
	report('Credentials', error);
	process.exit(1);
}

// Reading our own timeline is a cheap request that still needs credits,
// so it tells us whether posting will work without actually posting.
try {
	await client.v2.userTimeline(me.data.id, { max_results: 5 });
	console.log('Credits: OK (a credited request succeeded)');
} catch (error) {
	report('Credits', error);
	process.exit(1);
}
