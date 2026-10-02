/*
	   `                                                                            
	./oso-                                                                          
  `oyyhhs++/.`                                                                      
  `ohddyo/:o+++::.`                              `.--.`                             
   :hyo+/ooo+++++++/.                          `sdmmddy-                            
	++o+/+ooyosoossos+``/++ossyys/`          `-/syyyyy-                             
	-sssyysos++ssysoyh+dNNNNNNNNNmd-        `++++++/:.                              
	 +ssyhy/+ooos+ooyhyhNNNNNNNNNNNm`       /oydddhs/                               
	 `oyyyyyysss+oossshyNNNNNNNNNNNm`    -+shmNNmmmmd`.                             
	  -syyyhhhhs+++osyhhdMNNNNNNNNNd+/:+dmmNNNNNmmmmdsdy/                           
	  `+yyhhhhhoo+ooosyyyNNNNNNNNNNNNNNNNNNNNNNNmmmmdyddd:                          
	   -syhhhhhhoossosssdNNNNNNNNNNNNNNmNmmNNNNNmmmmNdyshhs+-`                      
		oyhhhhhyso+yhhmhhMMNNNNNNNNNNNNNNNmNNNNNmNmmNmhhhdddhs+`                    
	   `yyhhhhyysyhhydhhyNMMNNNNMNNNNNNNNNNNNNNNmNmmmmdhdyydhys-                    
	   `yyhhhhdmdhdhhdhhyNMMMMMMMMMMNNNNNMNNNNNmmmmmmmmddhhyso+-                    
		+yyhhmNNNmmNNNdosNMMMMMMMMMMNNNNNMNNNNNNmmmmmmmmhysoo+/.                    
		`/ydmNNNNNNNNmdyhMMMMMMNNMMMMMNNMMNNNNNmmmmmmmmdyysso+-                     
		 `syysssydmNNmmshMMMMMMMMMMMMMNNNNNNNNNmmNNdydmhhyyso-                      
		 :o::////+oomNNdmMMMMMMMMMMMMNNNNMMNNNhhdmN+:/mdhhys:                       
   `-----::::::::/+oyNMNNMMMMMMMMMMMMNNNMMMmsyo+/+ys:-/ysdhs.                       
   `.----::/:/:::::+sNMMMMMMMMMNNNNNNNNNNNMNdyoo+/:/:--:/hh+                        
	  ``.-:////::/::smMMMMMMMMNNNNNmsyNNNNNNNNmyoo//+oydmhy-                        
	`-::::://///+s/::/hMNNNNNNNNNNNmyodNNNNNNNMNmmmNNNNNmh+                         
	`---.``-::-:dmdhs++NNNNNmmNNNNNNmysNNNNNNNNMMNNNNNNNmy`                         
		  .::-`:mmmmmNNNMMNdsdhyssssyhsdmmNNNNNMMNNNNNNNm-                          
		 `-:.` :dmmmmNNNMMd/:/+sysys/::ymmmNNNNMMNNNNNNmh`                          
			   .hddmmmNNNNs:smmdhyhmmh+:hmmmNNNNNNNNNNNm+                           
				oddmmNNNNo/dNmyhhyhhmNms:hNmNNNNNNNNNNNh`                           
				.hdmmdhdo:syso:+/:/:ohdmo/hhmmNmmmmdmNm-                            
				 /dmy/++--.---:..-.::---::/+/ymmdddmNmo                             
				 `sh:+oo..----:-.--//:----oo+:ymhosyy.                              
				  .::+oh-.-/-/:-..-++-::-+yo+/:+.                                   
				  `.oydmh:-:/y+:..+:yo/-:dhy+.`                                     
					.ymNNmy/:+ss+/yso+:+dy/.                                        
					 `odmmmmmdhyhhsyyyo+.                                           
					   :hdddmdddhyo/.                                               
						`/o+/-.`                                                    

*/

//*******************************************************************

import numberstring, { comma } from 'numberstring';
import express from 'express';
import exphbs from 'express-handlebars';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import timeout from 'connect-timeout';
import axios from 'axios';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { TwitterApi } from 'twitter-api-v2';
import NodeCache from 'node-cache';
import dotenv from 'dotenv';

dotenv.config();

//*******************************************************************
// Simple Logger for App Runner/CloudWatch
// App Runner automatically captures stdout/stderr to CloudWatch Logs
//*******************************************************************

/**
 * Sanitizes data to prevent logging sensitive information
 * @param {*} data - Data to sanitize
 * @returns {*} Sanitized data
 */
function sanitizeData(data) {
	if (!data) return data;
	
	const sensitiveKeys = ['password', 'secret', 'key', 'token', 'credential', 'accessKey', 'secretAccessKey', 'authorization'];
	
	if (typeof data === 'object') {
		const sanitized = Array.isArray(data) ? [] : {};
		for (const [key, value] of Object.entries(data)) {
			const lowerKey = String(key).toLowerCase();
			if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
				sanitized[key] = '[REDACTED]';
			} else if (typeof value === 'object' && value !== null) {
				sanitized[key] = sanitizeData(value);
			} else {
				sanitized[key] = value;
			}
		}
		return sanitized;
	}
	
	return data;
}

/**
 * Simple logger that uses console.log/error for App Runner/CloudWatch compatibility
 * All logs go to stdout/stderr which App Runner automatically captures
 */
const logger = {
	info: (message, data) => {
		const timestamp = new Date().toISOString();
		if (data) {
			console.log(`[INFO] [${timestamp}] ${message}`, JSON.stringify(sanitizeData(data)));
		} else {
			console.log(`[INFO] [${timestamp}] ${message}`);
		}
	},
	error: (message, data) => {
		const timestamp = new Date().toISOString();
		if (data) {
			console.error(`[ERROR] [${timestamp}] ${message}`, JSON.stringify(sanitizeData(data)));
		} else {
			console.error(`[ERROR] [${timestamp}] ${message}`);
		}
	},
	warn: (message, data) => {
		const timestamp = new Date().toISOString();
		if (data) {
			console.warn(`[WARN] [${timestamp}] ${message}`, JSON.stringify(sanitizeData(data)));
		} else {
			console.warn(`[WARN] [${timestamp}] ${message}`);
		}
	},
	debug: (message, data) => {
		const timestamp = new Date().toISOString();
		if (data) {
			console.log(`[DEBUG] [${timestamp}] ${message}`, JSON.stringify(sanitizeData(data)));
		} else {
			console.log(`[DEBUG] [${timestamp}] ${message}`);
		}
	}
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
	const errorInfo = reason instanceof Error 
		? { message: reason.message, name: reason.name, stack: reason.stack }
		: { reason: String(reason) };
	logger.error('Unhandled Promise Rejection', sanitizeData(errorInfo));
	// Don't exit - allow server to continue running
});

//*******************************************************************
// Configuration Constants
//*******************************************************************

// Environment-specific configuration
const env = process.env.NODE_ENV || 'development';

const CONFIG = {
	AWS: {
		REGION: process.env.AWS_REGION || 'us-east-1',
		TABLE_NAME: process.env.DYNAMODB_TABLE || 'voncountdown',
	},
	APP: {
		PORT: process.env.PORT || 8080,
		START_NUMBER: 1111373357579,
		ENV: env,
		FEED_SIZE: 10, // recent posts shown on the home page
		X_URL: 'https://x.com/VonCountdown',
	},
	COUNTDOWN: {
		DELAY_MIN_MS: 2 * 60 * 60 * 1000, // 2 hours
		DELAY_MAX_MS: 8 * 60 * 60 * 1000, // 8 hours (about 4 to 6 posts a day)
		BOOT_DELAY_MS: Number(process.env.BOOT_DELAY_MS) || 5 * 60 * 1000, // wait 5 minutes after startup before the first post
		DRY_RUN: process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true', // log instead of posting/writing
	},
	BADGE: {
		ALLOWED_DOMAIN: 'img.shields.io',
	},
	CACHE: {
		TTL: env === 'production' ? 300 : 60, // 5 min in prod, 1 min in dev
	},
};

//*******************************************************************
// Environment Variable Validation
//*******************************************************************

const requiredEnvVars = [
	'AWS_ACCESS_KEY_ID',
	'AWS_SECRET_ACCESS_KEY',
	'TWITTER_API_KEY',
	'TWITTER_API_SECRET',
	'TWITTER_ACCESS_TOKEN',
	'TWITTER_ACCESS_TOKEN_SECRET',
];

logger.info('Starting application initialization');
logger.info('Environment check', { nodeEnv: process.env.NODE_ENV, port: CONFIG.APP.PORT });

requiredEnvVars.forEach(varName => {
	if (!process.env[varName]) {
		logger.error(`Missing required environment variable: ${varName}`);
		process.exit(1);
	}
});

logger.info('All required environment variables present');

//*******************************************************************
// AWS DynamoDB Client Setup
//*******************************************************************

logger.info('Initializing AWS DynamoDB client', { 
	region: CONFIG.AWS.REGION, 
	tableName: CONFIG.AWS.TABLE_NAME 
});

// Try to use default credential provider chain first (for local development)
// Falls back to explicit credentials if AWS_PROFILE or other chain providers aren't available
let credentials;
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
	credentials = {
		accessKeyId: process.env.AWS_ACCESS_KEY_ID.trim(),
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY.trim(),
	};
	logger.info('Using explicit AWS credentials from environment variables');
} else {
	logger.info('No explicit credentials found, using default credential provider chain');
	credentials = undefined; // Let AWS SDK use default credential chain
}

const client = new DynamoDBClient({
	region: CONFIG.AWS.REGION,
	...(credentials && { credentials }), // Only set credentials if provided
	maxAttempts: 5, // Retry up to 5 times
	retryMode: 'adaptive', // Use adaptive retry mode for throttling
});

const docClient = DynamoDBDocumentClient.from(client);
logger.info('DynamoDB client initialized successfully');

//*******************************************************************
// Twitter API Client Setup
//*******************************************************************

logger.info('Initializing Twitter API client');
const twitterClient = new TwitterApi({
	appKey: process.env.TWITTER_API_KEY,
	appSecret: process.env.TWITTER_API_SECRET,
	accessToken: process.env.TWITTER_ACCESS_TOKEN,
	accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});
logger.info('Twitter API client initialized successfully');

//*******************************************************************
// Caching Layer
//*******************************************************************

logger.info('Initializing cache', { ttl: CONFIG.CACHE.TTL });
const cache = new NodeCache({ 
	stdTTL: CONFIG.CACHE.TTL,
	checkperiod: CONFIG.CACHE.TTL * 2 // Check for expired keys
});
logger.info('Cache initialized');

//*******************************************************************
// Application State
//*******************************************************************

// The latest number the Count has actually posted (or the start number
// before the first post). Only changes after a successful post.
let current_number;
let current_string;
let current_comma;

// Bot health, surfaced on /health so a stuck Count is obvious.
const botStatus = {
	last_post_at: null,
	last_post_number: null,
	next_post_at: null,
	last_error: null,
	consecutive_failures: 0,
	dry_run: CONFIG.COUNTDOWN.DRY_RUN,
};

// Recent posts (lowest number first, i.e. newest first) for the website feed.
let recent_posts = [];
let first_post_at = null;
let post_count = 0;

//*******************************************************************
// Utility Functions
//*******************************************************************

import { randomInt } from './src/utils/random.js';
import { buildTweetText } from './src/countdown/tweetText.js';
import { nextRetryDelay } from './src/countdown/backoff.js';
import { computeStats, relativeTime } from './src/countdown/stats.js';

/**
 * Formats a number into the word and comma forms used everywhere.
 * @param {number} number
 * @returns {{ number: number, string: string, comma: string }}
 */
function formatNumber(number) {
	return {
		number,
		string: numberstring(number, { cap: 'title', punc: '!' }),
		comma: comma(number),
	};
}

/**
 * Reads every row from the countdown table, following pagination.
 * A single Scan page is capped at 1 MB and the table is bigger than that.
 * @returns {Promise<Array<{ number: number, string?: string, datetime?: string }>>}
 */
async function scanAllItems() {
	const items = [];
	let ExclusiveStartKey;
	let pages = 0;
	do {
		const page = await docClient.send(new ScanCommand({
			TableName: CONFIG.AWS.TABLE_NAME,
			...(ExclusiveStartKey && { ExclusiveStartKey }),
		}));
		items.push(...(page.Items || []));
		ExclusiveStartKey = page.LastEvaluatedKey;
		pages++;
	} while (ExclusiveStartKey);
	logger.info('DynamoDB scan complete', { pages, itemCount: items.length });
	return items;
}

/**
 * Records a successful post in memory (state, feed, stats).
 * @param {{ number: number, string: string, comma: string }} formatted
 * @param {string} datetime
 */
function recordPost(formatted, datetime) {
	current_number = formatted.number;
	current_string = formatted.string;
	current_comma = formatted.comma;
	recent_posts.unshift({ number: formatted.number, string: formatted.string, comma: formatted.comma, datetime });
	recent_posts = recent_posts.slice(0, CONFIG.APP.FEED_SIZE);
	post_count++;
	first_post_at = first_post_at || datetime;
	botStatus.last_post_at = datetime;
	botStatus.last_post_number = formatted.number;
	cache.set('countdown_state', { number: current_number, comma: current_comma, string: current_string });
}

/**
 * Schedules the next countdown attempt and records when it will run.
 * @param {number} delayMs
 */
function scheduleCountdown(delayMs) {
	botStatus.next_post_at = new Date(Date.now() + delayMs).toISOString();
	logger.info('Next countdown scheduled', {
		delayMs,
		delayMinutes: Math.round(delayMs / 60000),
		delayHours: (delayMs / 3600000).toFixed(2),
		nextRunTime: botStatus.next_post_at,
	});
	setTimeout(() => countdown(), delayMs);
}

//*******************************************************************
// Initialization
//*******************************************************************

(async () => {
	logger.info('=== INITIALIZATION START ===');
	try {
		logger.info('Scanning DynamoDB table', { tableName: CONFIG.AWS.TABLE_NAME });
		const items = await scanAllItems();

		if (items.length === 0) {
			logger.info('No items found in table, initializing with start number', {
				startNumber: CONFIG.APP.START_NUMBER,
			});
			const formatted = formatNumber(CONFIG.APP.START_NUMBER);
			const datetime = new Date().toISOString();
			await docClient.send(new PutCommand({
				TableName: CONFIG.AWS.TABLE_NAME,
				Item: { number: formatted.number, string: formatted.string, datetime, status: true },
			}));
			recordPost(formatted, datetime);
			logger.info('Inserted initial record', { number: current_number });
		} else {
			// Lowest number is the most recent post. Validate every number so one
			// bad row cannot take the whole site down.
			const valid = items
				.map(item => ({ ...item, number: Number(item.number) }))
				.filter(item => Number.isFinite(item.number));
			if (valid.length === 0) {
				throw new Error('No valid numeric rows in DynamoDB');
			}
			valid.sort((a, b) => a.number - b.number);

			const lowest = valid[0];
			const formatted = formatNumber(lowest.number);
			current_number = formatted.number;
			current_string = formatted.string;
			current_comma = formatted.comma;

			recent_posts = valid.slice(0, CONFIG.APP.FEED_SIZE).map(item => ({
				number: item.number,
				string: item.string || formatNumber(item.number).string,
				comma: comma(item.number),
				datetime: item.datetime || null,
			}));
			post_count = valid.length;
			const dated = valid.filter(item => item.datetime).map(item => item.datetime).sort();
			first_post_at = dated[0] || null;
			botStatus.last_post_at = lowest.datetime || null;
			botStatus.last_post_number = lowest.number;

			cache.set('countdown_state', { number: current_number, comma: current_comma, string: current_string });
			logger.info('Loaded countdown state', {
				number: current_number,
				string: current_string,
				lastPostAt: botStatus.last_post_at,
				postCount: post_count,
				firstPostAt: first_post_at,
			});
		}

		// Give X a polite pause after boot, then start counting.
		logger.info('=== INITIALIZATION COMPLETE ===');
		scheduleCountdown(CONFIG.COUNTDOWN.BOOT_DELAY_MS);
	} catch (error) {
		logger.error('=== INITIALIZATION ERROR ===');
		logger.error('Initialization error', {
			error: error.message,
			stack: error.stack,
			name: error.name,
			code: error.code,
			region: CONFIG.AWS.REGION,
			tableName: CONFIG.AWS.TABLE_NAME,
			hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
			hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
		});

		// Provide helpful error messages for common issues
		if (error.name === 'InvalidSignatureException') {
			logger.error('AWS Credentials Error: The AWS Secret Access Key does not match the Access Key ID.');
		} else if (error.name === 'ResourceNotFoundException') {
			logger.error(`DynamoDB Table Error: create the table "${CONFIG.AWS.TABLE_NAME}" in region "${CONFIG.AWS.REGION}"`);
		} else if (error.name === 'UnrecognizedClientException') {
			logger.error('AWS Credentials Error: The security token included in the request is invalid.');
		}

		botStatus.last_error = { stage: 'init', name: error.name, message: error.message, at: new Date().toISOString() };
		logger.warn('Continuing without DynamoDB connection. Web server will still run, the Count will not.');
	}
})();

//*******************************************************************
// Countdown Function
//*******************************************************************

/**
 * One countdown tick: post the next number, then save it.
 *
 * 1. Compute next = current - 1 and its word/comma forms
 * 2. Build the post text (1 in 5 chance of a phrase and tag)
 * 3. Post via X API v2 (or log it when DRY_RUN is set)
 * 4. Only now update in-memory state and write DynamoDB
 * 5. Schedule the next tick with a random delay (2 to 8 hours)
 *
 * On failure nothing is decremented. The retry delay depends on why it
 * failed: account problems (402 no credits, 401/403) wait 6 hours, rate
 * limits wait for X's reset, anything else backs off exponentially.
 *
 * @returns {Promise<void>}
 */
async function countdown() {
	logger.info('=== COUNTDOWN TICK ===', { current_number, consecutiveFailures: botStatus.consecutive_failures });

	if (current_number === undefined || current_number === null) {
		logger.error('Current number is undefined. Cannot continue countdown.');
		return;
	}

	if (current_number <= 0) {
		logger.error('Countdown reached zero. The Count is finished. Ah ah ah!');
		return;
	}

	const next = formatNumber(current_number - 1);
	const text = buildTweetText(next);
	logger.info('Post prepared', { number: next.number, text, length: text.length });

	try {
		// Step 1: Post. Nothing changes until this succeeds.
		if (CONFIG.COUNTDOWN.DRY_RUN) {
			logger.warn('DRY_RUN set: not posting to X', { text });
		} else {
			const tweet = await twitterClient.v2.tweet(text);
			logger.info('=== POSTED TO X ===', { tweetId: tweet.data?.id, text: tweet.data?.text });
		}

		// Step 2: Persist. DynamoDB retries throttling itself (adaptive mode, 5 attempts).
		const datetime = new Date().toISOString();
		if (CONFIG.COUNTDOWN.DRY_RUN) {
			logger.warn('DRY_RUN set: not writing to DynamoDB', { number: next.number });
		} else {
			await docClient.send(new PutCommand({
				TableName: CONFIG.AWS.TABLE_NAME,
				Item: { number: next.number, string: next.string, datetime, status: true },
			}));
			logger.info('DynamoDB record inserted', { number: next.number });
		}

		recordPost(next, datetime);
		botStatus.consecutive_failures = 0;
		botStatus.last_error = null;

		scheduleCountdown(randomInt(CONFIG.COUNTDOWN.DELAY_MIN_MS, CONFIG.COUNTDOWN.DELAY_MAX_MS));
	} catch (error) {
		botStatus.consecutive_failures++;
		const retry = nextRetryDelay(error, botStatus.consecutive_failures);
		botStatus.last_error = {
			stage: 'post',
			kind: retry.kind,
			code: error?.code ?? error?.status ?? null,
			name: error?.name,
			message: error?.data?.detail || error?.message,
			at: new Date().toISOString(),
		};

		logger.error('=== COUNTDOWN TICK FAILED ===', {
			kind: retry.kind,
			code: botStatus.last_error.code,
			name: error?.name,
			message: error?.message,
			data: error?.data,
			rateLimit: error?.rateLimit,
			consecutiveFailures: botStatus.consecutive_failures,
			numberNotPosted: next.number,
		});
		if (retry.kind === 'account') {
			logger.error(`ACTION NEEDED: ${retry.reason}`);
		} else {
			logger.warn(retry.reason);
		}

		scheduleCountdown(retry.delayMs);
	}
}

//*******************************************************************
// Express Application Setup
//*******************************************************************

const app = express();

// Trust proxy for accurate IP detection behind load balancers (AWS App Runner, Heroku, etc.)
// Use number 1 to trust first proxy (AWS App Runner uses 1 proxy layer)
// This prevents the express-rate-limit warning while still working correctly
app.set('trust proxy', 1);

app.engine('handlebars', exphbs.engine({ defaultLayout: 'main' }));
app.set('view engine', 'handlebars');

// Cache-busting token for static assets. Changes on every process start, so a
// deploy always makes browsers fetch the new stylesheet instead of a cached one.
app.locals.assetVersion = Date.now().toString(36);

// Compression middleware
app.use(compression());

// Request timeout (30 seconds)
app.use(timeout('30s'));
app.use((req, res, next) => {
	if (!req.timedout) next();
});

// Security middleware with Content Security Policy.
// Only what the page actually uses: our own assets, Google Fonts, the YouTube embed.
app.use(helmet({
	contentSecurityPolicy: {
		directives: {
			defaultSrc: ["'self'"],
			scriptSrc: ["'self'", "'unsafe-inline'"],
			styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
			fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
			imgSrc: ["'self'", 'data:', 'https:'],
			frameSrc: ['https://www.youtube.com', 'https://www.youtube-nocookie.com'],
			frameAncestors: ["'self'"],
			connectSrc: ["'self'"],
			objectSrc: ["'none'"],
			baseUri: ["'self'"],
			formAction: ["'self'"],
			upgradeInsecureRequests: [],
		}
	}
}));

// Rate limiting - general
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100, // limit each IP to 100 requests per windowMs
	message: 'Too many requests from this IP, please try again later.'
});

// Rate limiting - health endpoint (more permissive)
const healthLimiter = rateLimit({
	windowMs: 1 * 60 * 1000, // 1 minute
	max: 60, // 60 requests per minute
	message: 'Too many health check requests.'
});

app.use(limiter);

app.use(express.static('public', {
	maxAge: '1d', // versioned via ?v= so a day of caching is safe
	etag: true,
}));

// Request logging middleware
app.use((req, res, next) => {
	logger.info('HTTP request', { 
		method: req.method, 
		path: req.path, 
		ip: req.ip,
		userAgent: req.get('user-agent'),
		query: req.query
	});
	next();
});

//*******************************************************************
// Routes
//*******************************************************************

// Favicon route to prevent 404 errors
app.get('/favicon.ico', (req, res) => {
	res.status(204).end();
});

app.get('/', (req, res) => {
	const now = Date.now();
	res.render('home', {
		current_number: current_number,
		current_string: current_string,
		current_comma: current_comma,
		x_url: CONFIG.APP.X_URL,
		recent_posts: recent_posts.map(post => ({
			...post,
			when: post.datetime ? relativeTime(post.datetime, now) : 'some time ago',
		})),
		stats: computeStats({
			startNumber: CONFIG.APP.START_NUMBER,
			currentNumber: current_number ?? CONFIG.APP.START_NUMBER,
			firstPostAt: first_post_at,
			lastPostAt: botStatus.last_post_at,
			postCount: post_count,
			now,
		}),
	});
});

app.get('/badge', async (req, res) => {
	logger.info('Badge endpoint called');
	
	// Use current_comma if available, otherwise fallback to START_NUMBER formatted
	const badgeValue = current_comma || comma(CONFIG.APP.START_NUMBER);
	logger.debug('Badge value', { badgeValue, hasCurrentComma: !!current_comma, isFallback: !current_comma });

	const badge_url = `https://${CONFIG.BADGE.ALLOWED_DOMAIN}/badge/Von%20Countdown-${encodeURIComponent(badgeValue)}-a26d9e.svg`;
	logger.debug('Fetching badge', { badgeUrl: badge_url, badgeValue });

	try {
		const response = await axios.get(badge_url, { responseType: 'stream' });
		logger.info('Badge fetched successfully', { badgeValue });
		res.setHeader('Content-Type', 'image/svg+xml');
		res.setHeader('Cache-Control', 'public, max-age=300');
		response.data.pipe(res);
	} catch (error) {
		logger.error('Badge fetch error', { 
			error: error.message,
			status: error.response?.status,
			statusText: error.response?.statusText,
			badgeUrl: badge_url
		});
		res.status(500).send('Error fetching badge');
	}
});

app.get('/health', healthLimiter, (req, res) => {
	const degraded = !!botStatus.last_error || current_number === undefined;
	res.json({
		status: degraded ? 'degraded' : 'ok',
		current_number: current_number ?? null,
		current_string: current_string || null,
		current_comma: current_comma || null,
		bot: botStatus,
		uptime: process.uptime(),
		timestamp: new Date().toISOString()
	});
});

// 404 handler
app.use((req, res) => {
	res.status(404).render('error', {
		status: 404,
		message: 'Page not found',
		layout: 'main'
	}, (err, html) => {
		if (err) {
			res.status(404).send('Page not found');
		} else {
			res.send(html);
		}
	});
});

// Error handler
app.use((err, req, res, next) => {
	const errorInfo = err instanceof Error 
		? { message: err.message, name: err.name, stack: err.stack }
		: { error: String(err) };
	logger.error('Express error handler', { 
		...sanitizeData(errorInfo),
		path: req.path,
		method: req.method
	});
	res.status(500).render('error', {
		status: 500,
		message: 'Internal server error',
		layout: 'main'
	}, (renderErr, html) => {
		if (renderErr) {
			res.status(500).send('Internal server error');
		} else {
			res.send(html);
		}
	});
});

//*******************************************************************
// Server Startup
//*******************************************************************

// Export app for testing (only if not already started)
if (process.env.NODE_ENV !== 'test') {
	logger.info('=== STARTING EXPRESS SERVER ===');
	logger.info('Server configuration', {
		port: CONFIG.APP.PORT,
		env: CONFIG.APP.ENV,
		nodeVersion: process.version,
		platform: process.platform
	});

	const server = app.listen(CONFIG.APP.PORT, () => {
		logger.info('=== SERVER STARTED SUCCESSFULLY ===');
		logger.info('Server started', { 
			port: CONFIG.APP.PORT, 
			env: CONFIG.APP.ENV,
			url: `http://localhost:${CONFIG.APP.PORT}`
		});
	});

	// Graceful shutdown handler
	process.on('SIGTERM', () => {
		logger.info('SIGTERM received, shutting down gracefully');
		server.close(() => {
			logger.info('Process terminated');
			process.exit(0);
		});
	});

	process.on('SIGINT', () => {
		logger.info('SIGINT received, shutting down gracefully');
		server.close(() => {
			logger.info('Process terminated');
			process.exit(0);
		});
	});
}

// Export app for testing
export default app;

//*******************************************************************
