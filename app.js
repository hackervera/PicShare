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
	
	    var jsonBody = {
			source:  "http://"+config.i2pcouches[i].source+"/"+config.i2pcouches[i].db, 
			target: config.i2pcouches[i].name,
			continuous: true,
			proxy: "http://"+config.proxy
		};
		if(!/i2p/.test(config.i2pcouches[i].source)){
		    delete jsonBody.proxy;
		}
		
		request.put({
			uri: "http://"+config.couchauth+"@localhost:5984/"+config.i2pcouches[i].name
		}, function(err, res, body){
			console.log(body);
			
			request.post({
				uri:"http://"+config.couchauth+"@localhost:5984/_replicate", 
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


		createDatabase(i);
	}
	
}

var files;

app.get('/', function(req, res) {
	//console.log(photos);
	if(files){
		res.render('index', {files: files});
	} else {
		setTimeout(function(){
			res.render('index', {files: files});
		}, 2000);
	}
	
	
});

var magic = function(photos){
	files = photos;
	

	
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
	
	var couchPost = function(options){

		var file = fs.readFileSync('../../Me/flickr/originals/'+photos[options.id].id+".jpg", 'base64');
		
		if(options.action == "add"){
			request.put({
				uri: "http://"+config.couchauth+"@localhost:5984/"+config.shared
			}, function(err, res, body){ 
				console.log(body)
				
				request.put({
					body: JSON.stringify(photos[options.id]),
					uri: "http://"+config.couchauth+"@localhost:5984/"+config.shared+"/"+photos[options.id].id
				}, function(err, res, body){
					console.log(body);
				});
			});
		
			photos[options.id]._attachments = {};
			photos[options.id]._attachments[photos[options.id].id+".jpg"]= {};
			photos[options.id]._attachments[photos[options.id].id+".jpg"].content_type = "image/jpeg";
			photos[options.id]._attachments[photos[options.id].id+".jpg"].data = file;
		} else {
			request.get({
				uri:"http://"+config.couchauth+"@localhost:5984/"+config.shared+"/"+photos[options.id].id
			}, function(err, res, body){
					console.log(JSON.parse(body)._rev);
					var rev = JSON.parse(body)._rev;
					request.del({
						uri: "http://"+config.couchauth+"@localhost:5984/"+config.shared+"/"+
							photos[options.id].id+"?rev="+rev
					}, function(err, res, body){
							console.log(body);
					});
			
			});

		}
		

	}
	
	
	
	app.post("/", function(req, res){
		if(req.body.shared){
			photos[req.body.id].shared = "true";
			couchPost({id: req.body.id, action: "add"});
		} else {
			photos[req.body.id].shared = undefined;
			couchPost({id: req.body.id, action: "delete"});
		}
		lfs.writeObjectsToFile(photosFile, photos);
	});
	
	setTimeout(replicate, 3000);
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