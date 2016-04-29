var fs = require('fs');
var http = require('http');
var request = require('request');
var cheerio = require('cheerio');
var colors = require('colors/safe');
var wget = require('wget-improved');
var path = require('path');

//Setup
var options = {
	'baseUrl': 'http://iconmonstr.com/collections/page/1',
	'tempDir': path.join(__dirname, '/temp'),
	'logFile': path.join(__dirname, '/temp', 'failed-requests.txt'),
	'maxRetries': 5
};

var failedRequests = {};

function logFailedRequest(url, error){
	fs.appendFile(options.logFile, new Date().toISOString() + '\t' + url + '\t' + error + '\n');
}

function retryFailedRequests(){
	for(var key in failedRequests){
		if(failedRequests[key] >= 5) continue;
		console.log(colors.white.bgBlack('Retrying:\t' + key + '\tRetries: ' + colors.yellow.bgBlack(failedRequests[key] + '/' + options.maxRetries)));
		drillPage(key);
	}
}

function downloadIcon($){

	//Build the download url like the website does
	var e = '/?s2member_file_download_key=';
	var n = $('.active-id').attr('id').substr(0, 32);
	var i = '&s2member_file_download=';
	var s = $('.date').attr('id');
	var r = '/' + $('.active.toggle-btn').attr('id') + '/iconmonstr-';
	var o = $('.download-btn').attr('id');
	var a = '.' + $('.container-content-preview').attr('id');

	var downloadUrl = 'http://iconmonstr.com' + e + n + i + s + r + o + a;
	var fileName = o + a;
	var filePath = path.join(options.tempDir, fileName);

	//If the file is already in the /temp folder, skip it
	if(fs.existsSync(filePath)){
		console.log(colors.cyan.bgBlack('Skipping file: ' + fileName));
		return;
	}

	//Download the file
	wget.download(downloadUrl, filePath).on('error', function(err){
		console.log(colors.red.bgBlack('Error downloading file:\t' + fileName + '\t' + err));
	}).on('end', function(output){
		console.log(colors.green.bgBlack('Finished download:\t' + fileName + '\t' + output));		
		delete failedRequests[downloadUrl]; //Remove the completed download from a previous failed request
	});
}

function drillPage(url){
	console.log(colors.magenta.bgBlack('Scraping:\t' + url));

	//Starts the request
	request(url, function(error, response, body){
		if(error || response.statusCode != 200){
			if(response && response.statusCode > 400) failedRequests[url] = failedRequests.hasOwnProperty(url) ? ++failedRequests[url] : 1;
			console.log(colors.red.bgBlack('Request failed:\t' + url + '\t' + error || response.statusCode));
			logFailedRequest(url, error);			
			return;
		}

		var $ = cheerio.load(body);

		//If the page has a download button
		if($('.download-btn').length){  
			downloadIcon($);
			return;
		}

		//Cheerio's map function returns object by default instead of array, hence the conversion
		//Gets the visible collections links and the hidden ones in the first page
		$('.container-tags-thumb-wrap a, .collection.content-items-thumb-wrap a, .single-collection.content-items-thumb-wrap a')
		.map(function(){ return $(this).attr('href') }).toArray()
		.forEach( function(url, index) { drillPage(url); });

		//If the page has subpages, drill next page
		if($('.pagination-next a').attr('href')) {
			drillPage($('.pagination-next a').attr('href'));
			return;
		}

		//Try retrieving possible failed requests first
		//Only retry requests the are not 403 or 404 less than 5 times
		retryFailedRequests();
	});
}

//Create temp dir if doens't exists
fs.existsSync(options.tempDir) || fs.mkdirSync(options.tempDir);

//Starts the *magic*
drillPage(options.baseUrl);