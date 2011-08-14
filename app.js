var lfs = require('../../Common/node/lfs.js');
var photosFile = "../../Me/flickr/photos.json";
var configFile = "config.json"

var express = require('express'),connect = require('connect');
var app = express.createServer(connect.bodyParser(), connect.cookieParser(), connect.session({secret : "locker"}));
app.register('.html', require('ejs'));
app.set('views', __dirname + '/views');
app.set('view engine', 'html');
app.use(express.static('../../Me/flickr/'));
var request = require("request");
var fs = require("fs");

app.get("/jquery.js", function(req, res){
	res.send(fs.readFileSync('../../Ops/Dashboard/static/js/jquery-1.6.1.min.js','utf8'));
});

var config = JSON.parse(fs.readFileSync(configFile,'utf8'));

var replicate = function(){

	var createDatabase = function(i){
		request.put({
			uri: "http://"+config.couchauth+"@localhost:5984/"+config.i2pcouches[i].name
		}, function(err, res, body){
			console.log(body);
			
			request.post({
				uri:"http://"+config.i2pcouches[i].source+"/_replicate", 
				proxy: "http://"+config.proxy,
				json: jsonBody
	
			}, function(err, res, body){
				console.log("replicate output");
				console.log(jsonBody);
				console.log(body);
				console.log(err);
				//console.log(res);
			});
					
	
		})
	
	}
	for(var i=0; i < config.i2pcouches.length; i++){
		console.log("attempting replication");
		var jsonBody = {
			source: config.i2pcouches[i].db, 
			target: "http://"+config.couchauth+"@localhost:5984/"+config.i2pcouches[i].name	
		};

		createDatabase(i);
	}
	
}

//replicate();

var magic = function(photos){
	app.get('/', function(req, res) {
		console.log(photos);
		res.render('index', {files: photos});
	});
	
	var selectedPhotos = function(){
		var selected = [];
		for(var i=0;i < photos.length; i++){
			if(photos[i].shared){
				selected.push(photos[i])
			}
		}
		return selected;
	}
	
	var selectedJson = function(){
		var selected = selectedPhotos();
		var shared = [];
		for(var i=0;i < selected.length; i++){
			shared.push({
				id: selected[i].id, 
				original: "/original/"+selected[i].id, 
				thumb: "/thumbs/"+selected[i].id
				});
		}
		return shared;
		
	}
	
	var couchPost = function(){
		var selected = selectedPhotos();
		var requests = function(i){
			request.put({
				uri: "http://"+config.couchauth+"@localhost:5984/shared"
			}, function(err, res, body){ 
				//console.log(body)
				
				request.put({
					body: JSON.stringify(selected[i]),
					uri: "http://"+config.couchauth+"@localhost:5984/shared/"+selected[i].id
				}, function(err, res, body){
					//console.log(body);
				});
			});
		
		}
		for(var i=0;i < selected.length; i++){
			var file = fs.readFileSync('public/originals/'+selected[i].id+".jpg", 'base64');

			selected[i]._attachments = {};
			selected[i]._attachments[selected[i].id+".jpg"]= {};
			selected[i]._attachments[selected[i].id+".jpg"].content_type = "image/jpeg";
			selected[i]._attachments[selected[i].id+".jpg"].data = file;
			requests(i);
	
		}
	}
	
	//couchPost();
	
	
	
	
};


var loadPhotos = function(){
	lfs.readObjectsFromFile(photosFile, function(photos){ 
		magic(photos);
	});
}

loadPhotos();




var stdin = process.openStdin();
stdin.setEncoding('utf8');
stdin.on('data', function (chunk) {
    var processInfo = JSON.parse(chunk);
    process.chdir(processInfo.workingDirectory);
    app.listen(processInfo.port);
    var returnedInfo = {};
    console.log(JSON.stringify(returnedInfo));
});