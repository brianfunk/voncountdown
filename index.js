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

'use strict';

//*******************************************************************

const numberstring = require('numberstring');
const express = require('express');
const exphbs = require('express-handlebars');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const timeout = require('connect-timeout');
const axios = require('axios');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { TwitterApi } = require('twitter-api-v2');
const winston = require('winston');
const NodeCache = require('node-cache');

require('dotenv').config();

//*******************************************************************
// Logger Setup
//*******************************************************************

// Security: Filter to prevent logging sensitive data
const sensitiveDataFilter = winston.format((info) => {
	const sensitiveKeys = ['password', 'secret', 'key', 'token', 'credential', 'accessKey', 'secretAccessKey'];
	
	if (info.message && typeof info.message === 'object') {
		const sanitized = {};
		for (const [key, value] of Object.entries(info.message)) {
			const lowerKey = key.toLowerCase();
			if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
				sanitized[key] = '[REDACTED]';
			} else {
				sanitized[key] = value;
			}
		}
		info.message = sanitized;
	}
	
	return info;
});

const logger = winston.createLogger({
	level: process.env.LOG_LEVEL || 'info',
	format: winston.format.combine(
		sensitiveDataFilter(),
		winston.format.timestamp(),
		winston.format.errors({ stack: true }),
		winston.format.json()
	),
	defaultMeta: { service: 'voncountdown' },
	transports: [
		new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
		new winston.transports.File({ filename: 'logs/combined.log' })
	]
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
	logger.add(new winston.transports.Console({
		format: winston.format.combine(
			winston.format.colorize(),
			winston.format.simple()
		)
	}));
}

//*******************************************************************
// Security: Log Sanitization
//*******************************************************************

/**
 * Sanitizes error objects to prevent logging sensitive data
 * @param {*} error - Error object or value to sanitize
 * @returns {Object} Sanitized error object
 */
function sanitizeError(error) {
	if (!error) return null;
	
	const sensitiveKeys = ['password', 'secret', 'key', 'token', 'credential', 'accessKey', 'secretAccessKey', 'authorization'];
	const sanitized = {};
	
	// Handle Error objects
	if (error instanceof Error) {
		sanitized.message = error.message;
		sanitized.name = error.name;
		sanitized.stack = error.stack;
		return sanitized;
	}
	
	// Handle objects
	if (typeof error === 'object') {
		for (const [key, value] of Object.entries(error)) {
			const lowerKey = key.toLowerCase();
			// Check if key contains sensitive terms
			if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
				sanitized[key] = '[REDACTED]';
			} else if (typeof value === 'object' && value !== null) {
				sanitized[key] = sanitizeError(value);
			} else {
				sanitized[key] = value;
			}
		}
		return sanitized;
	}
	
	// Handle primitives
	return String(error);
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
	const sanitizedReason = sanitizeError(reason);
	logger.error('Unhandled Rejection', { 
		error: sanitizedReason?.message || String(sanitizedReason),
		stack: sanitizedReason?.stack,
		name: sanitizedReason?.name
	});
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
	},
	COUNTDOWN: {
		DELAY_MIN_MS: 1234567, // ~14 days
		DELAY_MAX_MS: 7654321, // ~88 days
		PHRASE_PROBABILITY: 4, // 1 in 5 chance (when random(0,4) === 4)
		ERROR_RETRY_DELAY_MS: 60000, // 1 minute
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

requiredEnvVars.forEach(varName => {
	if (!process.env[varName]) {
		logger.error(`Missing required environment variable: ${varName}`);
		process.exit(1);
	}
});

//*******************************************************************
// AWS DynamoDB Client Setup
//*******************************************************************

const client = new DynamoDBClient({
	region: CONFIG.AWS.REGION,
	credentials: {
		accessKeyId: process.env.AWS_ACCESS_KEY_ID,
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
	},
	maxAttempts: 5, // Retry up to 5 times
	retryMode: 'adaptive', // Use adaptive retry mode for throttling
});

const docClient = DynamoDBDocumentClient.from(client);

//*******************************************************************
// Twitter API Client Setup
//*******************************************************************

const twitterClient = new TwitterApi({
	appKey: process.env.TWITTER_API_KEY,
	appSecret: process.env.TWITTER_API_SECRET,
	accessToken: process.env.TWITTER_ACCESS_TOKEN,
	accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

//*******************************************************************
// Caching Layer
//*******************************************************************

const cache = new NodeCache({ 
	stdTTL: CONFIG.CACHE.TTL,
	checkperiod: CONFIG.CACHE.TTL * 2 // Check for expired keys
});

//*******************************************************************
// Application State
//*******************************************************************

let current_number;
let current_string;
let current_comma;
let current_twext;

//*******************************************************************
// Utility Functions
//*******************************************************************

const { randomInt } = require('./src/utils/random');

//*******************************************************************
// Initialization
//*******************************************************************

(async () => {
	try {
		// Initialize the countdown from the lowest existing number in DynamoDB, 
		// or start fresh if no record exists.
		const params = {
			TableName: CONFIG.AWS.TABLE_NAME,
		};

		// Check cache first to avoid expensive scan operation
		const cachedState = cache.get('countdown_state');
		if (cachedState) {
			logger.info('Using cached countdown state');
			current_number = cachedState.number;
			current_comma = cachedState.comma;
			current_string = cachedState.string;
			logger.info('Loaded countdown state from cache', { 
				number: current_number, 
				string: current_string, 
				comma: current_comma 
			});
			countdown();
			return;
		}

		// If not in cache, scan DynamoDB (expensive operation)
		// TODO: Optimize by using Query with GSI or storing current number separately
		const data = await docClient.send(new ScanCommand(params));

		logger.info('DynamoDB scan result', { itemCount: data.Items.length });

		if (data.Items.length === 0) {
			logger.info('No items found in table, initializing with start number');

			current_number = CONFIG.APP.START_NUMBER;
			current_comma = numberstring.comma(current_number);
			current_string = numberstring(current_number, { cap: 'title', punc: '!' });

			// Insert a record if no items are found
			const insertParams = {
				TableName: CONFIG.AWS.TABLE_NAME,
				Item: {
					number: current_number,
					string: current_string,
					datetime: new Date().toISOString(),
					status: true,
				},
			};

			await docClient.send(new PutCommand(insertParams));

			logger.info('Inserted new record', { number: current_number });

		} else {
			const lowest_number = data.Items.sort((a, b) => a.number - b.number)[0];
			logger.info('Lowest number found', { number: lowest_number.number });

			// Validate number format from DynamoDB
			const number = parseInt(lowest_number.number);
			if (isNaN(number) || !isFinite(number)) {
				throw new Error('Invalid number format in DynamoDB: ' + lowest_number.number);
			}

			current_number = number;
			current_comma = numberstring.comma(current_number);
			current_string = numberstring(current_number, { 'cap': 'title', 'punc': '!' });

			// Cache the state
			cache.set('countdown_state', {
				number: current_number,
				comma: current_comma,
				string: current_string
			});

			logger.info('Loaded countdown state', { 
				number: current_number, 
				string: current_string, 
				comma: current_comma 
			});

			countdown();
		}
	} catch (error) {
		logger.error('Initialization error', { error: error.message, stack: error.stack });
		logger.warn('Continuing without DynamoDB connection. Web server will still run.');
		// Don't exit - allow web server to run even if DynamoDB fails
	}
})();

//*******************************************************************
// Tweet Content Data
//*******************************************************************

// Phrases for adding random humorous or engaging variety to tweets.
const short_phrase = [
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

// List of random short tags used for Twitter posts
const short_tags = [
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

//*******************************************************************
// Countdown Function
//*******************************************************************

/**
 * Main function that decrements the current number, tweets the new count,
 * updates the record in DynamoDB, and schedules the next countdown.
 * 
 * This function:
 * 1. Decrements the current number
 * 2. Formats the number as a string and comma-separated value
 * 3. Randomly adds a phrase and tag (1 in 5 chance)
 * 4. Posts a tweet via Twitter API v2
 * 5. Updates DynamoDB with the new countdown state
 * 6. Schedules the next countdown with a random delay (14-88 days)
 * 
 * Error handling:
 * - Twitter rate limits: waits for rate limit reset before retrying
 * - DynamoDB throttling: uses exponential backoff with up to 5 retries
 * - Other errors: retries after 1 minute delay
 * 
 * @returns {Promise<void>}
 */
async function countdown() {
	logger.info('Countdown start');

	// Validate current_number exists and is valid
	if (current_number === undefined || current_number === null) {
		logger.error('Current number is undefined. Cannot continue countdown.');
		return;
	}

	// Check for negative numbers - end countdown if reached zero or below
	if (current_number <= 0) {
		logger.error('Countdown reached zero or below. Countdown complete!');
		// Optionally: send final tweet, update status, etc.
		return;
	}

	current_number--;
	current_string = numberstring(current_number, { 'cap': 'title', 'punc': '!' });
	current_comma = numberstring.comma(current_number);

	logger.info('Updated countdown state', { 
		number: current_number, 
		string: current_string, 
		comma: current_comma 
	});

	try {
		// Step 1: Post a tweet with the current count
		logger.debug('Preparing tweet');

		current_twext = current_string;

		// Randomly add phrase and tag (1 in 5 chance)
		if (randomInt(0, CONFIG.COUNTDOWN.PHRASE_PROBABILITY) === CONFIG.COUNTDOWN.PHRASE_PROBABILITY) {
			const twext_phrase = short_phrase[randomInt(0, short_phrase.length - 1)];
			const twext_tag = short_tags[randomInt(0, short_tags.length - 1)];

			logger.debug('Adding phrase and tag to tweet', { phrase: twext_phrase, tag: twext_tag });

			current_twext = `${current_comma}! ${twext_phrase} ${twext_tag}`;
		}

		// Validate tweet length (Twitter limit is 280 characters)
		if (current_twext.length > 280) {
			logger.warn('Tweet too long, truncating', { originalLength: current_twext.length });
			current_twext = current_twext.substring(0, 277) + '...';
		}

		logger.info('Tweet prepared', { text: current_twext, length: current_twext.length });

		// Send the tweet with rate limit handling
		let tweet;
		try {
			tweet = await twitterClient.v2.tweet(current_twext);
			logger.info('Tweet posted successfully', { tweetId: tweet.data?.id });
		} catch (twitterError) {
			// Handle Twitter rate limits (429 Too Many Requests)
			if (twitterError.code === 429 || twitterError.status === 429) {
				const retryAfter = twitterError.rateLimit?.reset 
					? (twitterError.rateLimit.reset * 1000) - Date.now()
					: 900000; // Default to 15 minutes if reset time not available
				
				logger.warn('Twitter rate limit hit', { retryAfterSeconds: Math.ceil(retryAfter / 1000) });
				setTimeout(() => countdown(), retryAfter);
				return;
			}
			throw twitterError; // Re-throw if not a rate limit error
		}

		// Step 2: Update the DynamoDB record with the new number
		logger.debug('Updating DynamoDB');

		const insertParams = {
			TableName: CONFIG.AWS.TABLE_NAME,
			Item: {
				number: current_number,
				string: current_string,
				datetime: new Date().toISOString(),
				status: true,
			},
		};

		// DynamoDB operations with retry handling for throttling
		let retries = 0;
		const maxRetries = 5;
		while (retries < maxRetries) {
			try {
				await docClient.send(new PutCommand(insertParams));
				logger.info('Inserted new record', { number: current_number });
				
				// Update cache with new state
				cache.set('countdown_state', {
					number: current_number,
					comma: current_comma,
					string: current_string
				});
				
				break; // Success, exit retry loop
			} catch (dynamoError) {
				// Handle DynamoDB throttling (ProvisionedThroughputExceededException)
				if (dynamoError.name === 'ProvisionedThroughputExceededException' || 
				    dynamoError.$metadata?.httpStatusCode === 400) {
					retries++;
					const backoffDelay = Math.min(1000 * Math.pow(2, retries), 30000); // Exponential backoff, max 30s
					logger.warn('DynamoDB throttled', { retry: retries, maxRetries, backoffDelay });
					await new Promise(resolve => setTimeout(resolve, backoffDelay));
				} else {
					throw dynamoError; // Re-throw if not a throttling error
				}
			}
		}
		
		if (retries >= maxRetries) {
			throw new Error('Failed to update DynamoDB after maximum retries');
		}

		// Schedule next countdown with random delay
		// Delay ranges from ~14 days to ~88 days (1234567ms to 7654321ms)
		const delay = randomInt(CONFIG.COUNTDOWN.DELAY_MIN_MS, CONFIG.COUNTDOWN.DELAY_MAX_MS);
		const delayHours = delay / 3600000;
		logger.info('Scheduling next countdown', { delayMs: delay, delayHours: delayHours.toFixed(2) });

		setTimeout(() => countdown(), delay);

	} catch (error) {
		logger.error('Countdown error', { error: error.message, stack: error.stack });

		// Retry after shorter delay on error (1 minute)
		logger.info('Retrying countdown after error', { retryDelaySeconds: CONFIG.COUNTDOWN.ERROR_RETRY_DELAY_MS / 1000 });
		setTimeout(() => countdown(), CONFIG.COUNTDOWN.ERROR_RETRY_DELAY_MS);
	}
}

//*******************************************************************
// Express Application Setup
//*******************************************************************

const app = express();

app.engine('handlebars', exphbs.engine({ defaultLayout: 'main' }));
app.set('view engine', 'handlebars');

// Compression middleware
app.use(compression());

// Request timeout (30 seconds)
app.use(timeout('30s'));
app.use((req, res, next) => {
	if (!req.timedout) next();
});

// Security middleware with Content Security Policy
app.use(helmet({
	contentSecurityPolicy: {
		directives: {
			defaultSrc: ["'self'"],
			scriptSrc: [
				"'self'",
				"'sha256-QJVoVswsd9o99Vg11t+c0fQeJD0p1YfKwOQdoYT0h7E='", // Inline script hash
				'https://platform.twitter.com',
				'https://code.jquery.com',
				'https://static.cloudflareinsights.com'
			],
			styleSrc: [
				"'self'",
				"'unsafe-inline'", // Required for inline styles
				'https://fonts.googleapis.com'
			],
			fontSrc: [
				"'self'",
				'https://fonts.gstatic.com'
			],
			imgSrc: [
				"'self'",
				'data:',
				'https://www.wikipedia.org',
				'https://img.shields.io'
			],
			frameSrc: [
				"'self'",
				'https://en.m.wikipedia.org',
				'https://www.youtube.com',
				'https://platform.twitter.com'
			],
			connectSrc: [
				"'self'",
				'https://api.twitter.com',
				'https://static.cloudflareinsights.com'
			]
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

app.use(express.static('public'));

// Request logging middleware
app.use((req, res, next) => {
	logger.info('HTTP request', { method: req.method, path: req.path, ip: req.ip });
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
	res.render('home', {
		current_number: current_number,
		current_string: current_string,
		current_comma: current_comma
	});
});

app.get('/badge', async (req, res) => {
	// Validate that current_comma exists
	if (!current_comma) {
		return res.status(503).send('Service initializing');
	}

	const badge_url = `https://${CONFIG.BADGE.ALLOWED_DOMAIN}/badge/Von%20Countdown-${encodeURIComponent(current_comma)}-a26d9e.svg`;

	try {
		const response = await axios.get(badge_url, { responseType: 'stream' });
		response.data.pipe(res);
	} catch (error) {
		logger.error('Badge fetch error', { error: error.message });
		res.status(500).send('Error fetching badge');
	}
});

app.get('/health', healthLimiter, (req, res) => {
	res.json({
		status: 'ok',
		current_number: current_number || null,
		current_string: current_string || null,
		current_comma: current_comma || null,
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
	const sanitizedError = sanitizeError(err);
	logger.error('Express error handler', { 
		error: sanitizedError?.message || String(sanitizedError), 
		stack: sanitizedError?.stack, 
		path: req.path,
		name: sanitizedError?.name
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
	const server = app.listen(CONFIG.APP.PORT, () => {
		logger.info('Server started', { port: CONFIG.APP.PORT, env: process.env.NODE_ENV || 'development' });
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
module.exports = app;

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

//*******************************************************************
