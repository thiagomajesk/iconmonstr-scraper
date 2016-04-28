var fs = require('fs');
var http = require('http');
var request = require('request');
var cheerio = require('cheerio');
var request = require('sync-request');
var colors = require('colors/safe');
var wget = require('wget-improved');
var path = require('path');

function drillPage(url, downloadPath){	
	console.log(colors.magenta.bgBlack('Scraping:\t' + url));

	var response = request('GET', url);

	//In case the request fails
	if(response == null || response.statusCode != 200){
		console.log(colors.red.bgBlack('Request failed for:\t' + url) + colors.yellow('\t with code: ' + response.statusCode));
		return;
	}
	
	var $ = cheerio.load(response.getBody('utf8'));

		//If the page has a download button, means that we have drilled till the download page
		if($('.download-btn').length){
			
			//Build the download url like the website does
			var e = '/?s2member_file_download_key=';
			var n = $('.active-id').attr('id').substr(0, 32);
			var i = '&s2member_file_download=';
			var s = $('.date').attr('id');
			var r = '/' + $('.active.toggle-btn').attr('id') + '/iconmonstr-';
			var o = $('.download-btn').attr('id');
			var a = '.' + $('.container-content-preview').attr('id');

			//Download file
			var downloadUrl = 'http://iconmonstr.com' + e + n + i + s + r + o + a;
			console.log(colors.blue.bgBlack('Download url:\t'+ downloadUrl));
			var fileName = downloadUrl.split('/').slice(-1)[0];

			wget.download(downloadUrl, path.join(downloadPath, fileName)).on('start', function(fileSize){
				console.log(colors.blue.bgBlack('Starting download:\t' +fileName + '\t' + fileSize + 'Kb'));
			}).on('error', function(err){
				console.log(colors.red.bgBlack('Error when downloading file:\t' + fileName + '\t' + err));
			}).on('progress', function(progress){
				console.log(colors.yellow.bgBlack('Progress: \t' + fileName + '\t' + progress * 100 + '%'));
			}).on('end', function(output){
				console.log(colors.green.bgBlack('Finished download:\t' + fileName + '\t' + output));
			});

			return;
		}

		//Cheerio's map function returns object by default instead of array, hence the conversion
		//Gets the 'hidden' in the first page
		var collections = $('.container-tags-thumb-wrap a, .collection.content-items-thumb-wrap a, .single-collection.content-items-thumb-wrap a')
		.map(function(){ return $(this).attr('href') }).toArray();
		
		console.log(colors.cyan.bgBlack(collections.join('\n')));

		collections.forEach( function(element, index) {
			drillPage(element, downloadPath);
		});

		//Drill next page
		var nextPageUrl = $('.pagination-next a').attr('href');
		if(nextPageUrl) drillPage(nextPageUrl, downloadPath);	
	}


//Temp dir
var tempDir = path.normalize(path.join(__dirname, '/temp'));

//Create temp dir if doens't exists
fs.existsSync(tempDir) || fs.mkdirSync(tempDir);

//Base url
var url = 'http://iconmonstr.com/collections/'; 

//Starts the *magic*
drillPage(url, tempDir);
