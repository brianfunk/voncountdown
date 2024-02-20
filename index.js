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

const twitter = require('twitter');
const numberstring = require('numberstring');
const async = require('async');
const express = require('express');
const exphbs = require('express-handlebars');
const request = require('request');
const AWS = require('aws-sdk');
const { TwitterApi } = require('twitter-api-v2');

require('dotenv').config();

//*******************************************************************

AWS.config.update({
	accessKeyId: process.env.AWS_ACCESS_KEY_ID,
	secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
	region: 'us-east-1', // specify your AWS region
});

// const dynamoDB = new AWS.DynamoDB.DocumentClient();
const docClient = new AWS.DynamoDB.DocumentClient();

//*******************************************************************

const PORT = process.env.PORT || 12345;

//*******************************************************************

console.log('Twitter API Key:', process.env.TWITTER_API_KEY);
console.log('Twitter API Secret:', process.env.TWITTER_API_SECRET);
console.log('Twitter Access Token:', process.env.TWITTER_ACCESS_TOKEN);
console.log('Twitter Access Token Secret:', process.env.TWITTER_ACCESS_TOKEN_SECRET);

// Initialize Twitter API v2 client with OAuth 2.0 User Context authentication
const twitterClient = new TwitterApi({
	appKey: process.env.TWITTER_API_KEY,
	appSecret: process.env.TWITTER_API_SECRET,
	accessToken: process.env.TWITTER_ACCESS_TOKEN,
	accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

//*******************************************************************

let current_record;
let current_number;
let current_string;
let current_comma;
let current_twext;

//*******************************************************************

(async () => {
	try {

		const params = {
			TableName: 'voncountdown',
		};

		const data = await docClient.scan(params).promise();

		console.log('data : ' + JSON.stringify(data) );

		if (data.Items.length === 0) {
			console.log('no items found in the table');

			current_number = 1111373357579;
			current_comma = numberstring.comma(current_number);
			current_string = numberstring(current_number, { cap: 'title', punc: '!' });

			// Insert a record if no items are found
			const insertParams = {
				TableName: 'voncountdown',
				Item: {
					number: current_number,
					string: current_string,
					datetime: new Date().toISOString(),
					status: true,
				},
			};

			await docClient.put(insertParams).promise();

			console.log('inserted new record : ' + current_number);

		} else {

			const lowest_number = data.Items.sort((a, b) => a.number - b.number)[0];
			console.log('lowest_number : ' + JSON.stringify(lowest_number));

			current_number = lowest_number.number;
			current_comma = numberstring.comma(current_number);
			current_string = numberstring(parseInt(current_number), {'cap': 'title', 'punc': '!'});

			console.log('load number : ' + current_number);
			console.log('load string : ' + current_string );
			console.log('load commma : ' + current_comma );

			countdown();
		}
	} catch (error) {
		console.error(error.message);
	}
})();

//*******************************************************************

var random = function(min, max) {
	
	var rand = Math.floor(Math.random() * (max - min + 1)) + min;	
	//console.log('rand : ' + rand );
	
	return rand;	
}

//*******************************************************************

var short_phrase = [
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

var short_tags = [
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

var countdown = function() {	
	
	console.log('countdown start ' );
	
	current_number--;	
	current_string = numberstring(current_number, {'cap': 'title', 'punc': '!'});
	current_comma = numberstring.comma(current_number);
	
	console.log('updated number : ' + current_number );
	console.log('updated string : ' + current_string );
	console.log('updated comma : ' + current_comma );
	
	async.series(
		[
			function(callback){
				//*******************************************************************
				console.log('tweetdown ' );
				
				current_twext = current_string;
				
				if ( random(0,4) === 4 ) {					

					var twext_phrase = short_phrase[random(0,short_phrase.length-1)];
					var twext_tag = short_tags[random(0,short_tags.length-1)];
					
					console.log('twext_phrase : ' + twext_phrase );
					console.log('twext_tag : ' + twext_tag );	

					current_twext = current_comma +'! '+ twext_phrase + ' '+ twext_tag;
				}		

				console.log('current_twext : ' + current_twext );	
				
				
				(async () => {
					let tweet = await twitterClient.v2.tweet(current_twext);

					console.log('tweet posted : ', tweet);

					callback(null, current_twext);
				})();
				
			},
			function(callback){
				//*******************************************************************
				console.log('updatenumber ' );				

				(async () => {
					// Insert a record with new number
					const insertParams = {
						TableName: 'voncountdown',
						Item: {
							number: current_number,
							string: current_string,
							datetime: new Date().toISOString(),
							status: true,
						},
					};

					await docClient.put(insertParams).promise();

					console.log('inserted new record : ' + current_number);

					callback();

				})();

			}
		],
		function(err, results){
			
			var result_status = 'success';
			
			if (err) {				
				result_status = 'error';
				console.error('countdown series error : ' + JSON.stringify(err));
			}
			
			console.log('update results : ' + JSON.stringify(results) );
			
			//*******************************************************************

			var delay = random(1234567, 7654321);
			console.log('delay : ' + delay );
			console.log('delay hours : ' + delay / 3600000 );

			setTimeout(function() {
				countdown();
			}, delay);	
			
		}
	);
};

//*******************************************************************

var app = express();
 
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

app.use(express.static('public'));
 
app.get('/', function (req, res) {
	res.render('home', {
		current_number: current_number,
		current_string: current_string,
		current_comma: current_comma
	});
});

app.get('/badge', function(req,res) {
	var badge_url = 'https://img.shields.io/badge/Von%20Countdown-'+ encodeURIComponent(current_comma) +'-a26d9e.svg';
	//console.log('badge_url : ' + badge_url );
	request(badge_url).pipe(res);
});
 
app.listen(PORT);

//*******************************************************************

