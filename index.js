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

var pg = require('pg');
var twitter = require('twitter');
var numberstring = require('numberstring');
var async = require('async');

require('dotenv').config();

//*******************************************************************

var TWITTER_CONSUMER_KEY = process.env.TWITTER_CONSUMER_KEY;
var TWITTER_CONSUMER_SECRET = process.env.TWITTER_CONSUMER_SECRET;
var TWITTER_ACCESS_TOKEN_KEY = process.env.TWITTER_ACCESS_TOKEN_KEY;
var TWITTER_ACCESS_TOKEN_SECRET = process.env.TWITTER_ACCESS_TOKEN_SECRET;

var DATABASE_URL = process.env.DATABASE_URL;

var current_number;
var current_string;
var current_comma;
var current_twext;

//*******************************************************************

pg.defaults.ssl = true;

var client = new pg.Client(DATABASE_URL);

client.connect(function (err) {
	if (err) throw err;	
});

client.query('SELECT number FROM number ORDER BY number LIMIT 1', function(err, result) {
		
	if (err) {
		return console.error('error running query', err);
	}
	else {
		current_number = result.rows[0].number;		
		console.log('load number : ' + current_number );
		
		countdown();
	}	
});	

//*******************************************************************

var twlient = new twitter({
	consumer_key: TWITTER_CONSUMER_KEY,
	consumer_secret: TWITTER_CONSUMER_SECRET,
	access_token_key: TWITTER_ACCESS_TOKEN_KEY,
	access_token_secret: TWITTER_ACCESS_TOKEN_SECRET
});

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
	//console.log('updated string : ' + current_string );
	//console.log('updated comma : ' + current_comma );
	
	async.series(
		[
			function(callback){
				//*******************************************************************
				//console.log('tweetdown ' );
				
				current_twext = current_string;
				
				if ( random(0,4) === 4 ) {					

					var twext_phrase = short_phrase[random(0,short_phrase.length-1)];
					var twext_tag = short_tags[random(0,short_tags.length-1)];
					
					//console.log('twext_phrase : ' + twext_phrase );
					//console.log('twext_tag : ' + twext_tag );	

					current_twext = current_comma +'! '+ twext_phrase + ' '+ twext_tag;
				}		

				console.log('current_twext : ' + current_twext );				
				
								
				twlient.post('statuses/update', {status: current_twext},  function(error, tweet, response) {
					
					if (error) {						
						current_number++;
						
						callback(error);						
						
						throw error;
					}
					else {
						//console.log(tweet);  // Tweet body. 
						//console.log(response);  // Raw response object. 
						
						callback(null, current_twext);
					}	
					
				});
							
				
				//callback(null, current_twext);
			},
			function(callback){
				//*******************************************************************
				//console.log('updatenumber ' );	
	
				client.query('UPDATE number SET number = $1', [current_number], function(err, result) {
					
					if (err) {
						callback(err);
						
						//return console.error('error running query', err);
					}
					else {	
						//console.log('update : ' + JSON.stringify(result) );		
						
						callback();
					}	
				});					
			}
		],
		function(err, results){
			
			var result_status = 'success';
			
			if (err) {				
				result_status = 'error';
				console.error('countdown series error');
			}
			
			//console.log('update results: ' + JSON.stringify(results) );
			
			//*******************************************************************
			var current_date = new Date();
			//console.log('current_date : ' + current_date );
			
			client.query('INSERT INTO logs (number, string, datetime, status) VALUES ($1, $2, $3, $4)', [current_number, current_twext, current_date, result_status], function(err, result) {
					
				if (err) {
					//callback(err);
					
					return console.error('error running query', err);
				}
				else {	
					//console.log('update : ' + JSON.stringify(result) );					
	
				}	
			});							
			
				
			//*******************************************************************
			var delay = random(1234567, 76543210);
			//console.log('delay : ' + delay );
			console.log('delay hours : ' + delay / 3600000 );
			
			setTimeout(function() {
				countdown();
			}, delay);	
			
		}
	);
};


//*******************************************************************


//*******************************************************************

