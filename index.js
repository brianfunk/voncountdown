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
const axios = require('axios');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { TwitterApi } = require('twitter-api-v2');

require('dotenv').config();

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
	console.error('Unhandled Rejection at:', promise, 'reason:', reason);
	// Don't exit - allow server to continue running
});

//*******************************************************************
// Configuration Constants
//*******************************************************************

const CONFIG = {
	AWS: {
		REGION: process.env.AWS_REGION || 'us-east-1',
		TABLE_NAME: process.env.DYNAMODB_TABLE || 'voncountdown',
	},
	APP: {
		PORT: process.env.PORT || 8080,
		START_NUMBER: 1111373357579,
	},
	COUNTDOWN: {
		DELAY_MIN_MS: 1234567,
		DELAY_MAX_MS: 7654321,
		PHRASE_PROBABILITY: 4, // 1 in 5 chance (when random(0,4) === 4)
		ERROR_RETRY_DELAY_MS: 60000, // 1 minute
	},
	BADGE: {
		ALLOWED_DOMAIN: 'img.shields.io',
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
		console.error(`ERROR: Missing required environment variable: ${varName}`);
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
// Application State
//*******************************************************************

let current_number;
let current_string;
let current_comma;
let current_twext;

//*******************************************************************
// Utility Functions
//*******************************************************************

/**
 * Generates a random integer between min and max (inclusive)
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random integer
 */
function randomInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

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

		const data = await docClient.send(new ScanCommand(params));

		console.log('DynamoDB scan result:', JSON.stringify(data));

		if (data.Items.length === 0) {
			console.log('No items found in table, initializing with start number');

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

			console.log('Inserted new record:', current_number);

		} else {
			const lowest_number = data.Items.sort((a, b) => a.number - b.number)[0];
			console.log('Lowest number found:', JSON.stringify(lowest_number));

			current_number = lowest_number.number;
			current_comma = numberstring.comma(current_number);
			current_string = numberstring(parseInt(current_number), { 'cap': 'title', 'punc': '!' });

			console.log('Loaded number:', current_number);
			console.log('Loaded string:', current_string);
			console.log('Loaded comma:', current_comma);

			countdown();
		}
	} catch (error) {
		console.error('Initialization error:', error.message);
		console.error(error.stack);
		console.warn('Continuing without DynamoDB connection. Web server will still run.');
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
 */
async function countdown() {
	console.log('Countdown start');

	current_number--;
	current_string = numberstring(current_number, { 'cap': 'title', 'punc': '!' });
	current_comma = numberstring.comma(current_number);

	console.log('Updated number:', current_number);
	console.log('Updated string:', current_string);
	console.log('Updated comma:', current_comma);

	try {
		// Step 1: Post a tweet with the current count
		console.log('Preparing tweet');

		current_twext = current_string;

		if (randomInt(0, CONFIG.COUNTDOWN.PHRASE_PROBABILITY) === CONFIG.COUNTDOWN.PHRASE_PROBABILITY) {
			const twext_phrase = short_phrase[randomInt(0, short_phrase.length - 1)];
			const twext_tag = short_tags[randomInt(0, short_tags.length - 1)];

			console.log('Tweet phrase:', twext_phrase);
			console.log('Tweet tag:', twext_tag);

			current_twext = `${current_comma}! ${twext_phrase} ${twext_tag}`;
		}

		console.log('Tweet text:', current_twext);

		// Send the tweet
		const tweet = await twitterClient.v2.tweet(current_twext);
		console.log('Tweet posted:', tweet);

		// Step 2: Update the DynamoDB record with the new number
		console.log('Updating DynamoDB');

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
		console.log('Inserted new record:', current_number);

		// Schedule next countdown
		const delay = randomInt(CONFIG.COUNTDOWN.DELAY_MIN_MS, CONFIG.COUNTDOWN.DELAY_MAX_MS);
		const delayHours = delay / 3600000;
		console.log(`Delay: ${delay}ms (${delayHours.toFixed(2)} hours)`);

		setTimeout(() => countdown(), delay);

	} catch (error) {
		console.error('Countdown error:', error.message);
		console.error('Error stack:', error.stack);

		// Retry after shorter delay on error
		console.log(`Retrying in ${CONFIG.COUNTDOWN.ERROR_RETRY_DELAY_MS / 1000} seconds...`);
		setTimeout(() => countdown(), CONFIG.COUNTDOWN.ERROR_RETRY_DELAY_MS);
	}
}

//*******************************************************************
// Express Application Setup
//*******************************************************************

const app = express();

app.engine('handlebars', exphbs.engine({ defaultLayout: 'main' }));
app.set('view engine', 'handlebars');

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100, // limit each IP to 100 requests per windowMs
	message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

app.use(express.static('public'));

// Request logging middleware
app.use((req, res, next) => {
	console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
	next();
});

//*******************************************************************
// Routes
//*******************************************************************

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
		console.error('Badge fetch error:', error.message);
		res.status(500).send('Error fetching badge');
	}
});

app.get('/health', (req, res) => {
	res.json({
		status: 'ok',
		current_number: current_number || null,
		current_string: current_string || null,
		current_comma: current_comma || null,
		uptime: process.uptime(),
		timestamp: new Date().toISOString()
	});
});

//*******************************************************************
// Server Startup
//*******************************************************************

const server = app.listen(CONFIG.APP.PORT, () => {
	console.log(`Server running on port ${CONFIG.APP.PORT}`);
});

// Graceful shutdown handler
process.on('SIGTERM', () => {
	console.log('SIGTERM received, shutting down gracefully');
	server.close(() => {
		console.log('Process terminated');
		process.exit(0);
	});
});

process.on('SIGINT', () => {
	console.log('SIGINT received, shutting down gracefully');
	server.close(() => {
		console.log('Process terminated');
		process.exit(0);
	});
});

//*******************************************************************
