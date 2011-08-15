var lfs = require('../../Common/node/lfs.js');
var photosFile = "photos.json";
var configFile = "config.json"



var express = require('express'),connect = require('connect');
var app = express.createServer(connect.bodyParser(), connect.cookieParser(), connect.session({secret : "locker"}));
app.register('.html', require('ejs'));
app.set('views', __dirname + '/views');
app.set('view engine', 'html');
app.use(express.static('../../Me/'));
var request = require("request");
var fs = require("fs");


app.get("/showpics/:username", function(req, res){
    request.get({
        uri: "http://localhost:5984/"+req.params.username+"/_all_docs"
    }, function(){
        console.log(arguments[2]);
        var docs = JSON.parse(arguments[2]);
        console.log(docs);
        res.render('friends', {
            docs: docs.rows, 
            friends: config.i2pcouches, 
            username: req.params.username
        });

    });
});



app.post("/setup", function(req, res){
    var config;
    var proxy;
    if(req.body.proxy){
        proxy = req.body.proxy;
    } else {
        proxy = "pdxbrain.com:4444"
    }
    config = {
        couchauth: req.body.username+":"+req.body.password,
        proxy: proxy,
        i2pcouches: [{
            "name":"tyler",
            "source":"tc3tunegsmlicdp33kv5mkwyv723ya4kmctpj3yxf2ithb3bmtta.b32.i2p",
            "db":"shared"
        }],
        shared: "shared"
    };

    fs.writeFileSync("config.json", JSON.stringify(config));
    
    res.redirect("/Me/picshare/");
    
});

var config;



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
	    var byId = function(element, index, array){
	        //console.log(element.id);
	        return (element.id == options.id);
	    }
	    //console.log(photos);
	    //console.log(options.id);
        var dbphoto = photos.filter(byId)[0];
        console.log(dbphoto.sources);
        console.log(process.cwd());
		var original = fs.readFileSync('../'+dbphoto.sources[0].service+'/originals/'+dbphoto.sources[0].id+".jpg", 'base64');
		var thumb = fs.readFileSync('../'+dbphoto.sources[0].service+'/thumbs/'+dbphoto.sources[0].id+".jpg", 'base64');
		
		
        dbphoto._attachments = {
            "original.jpg": {
                content_type: "image/jpeg",
                data: original
            },
            "thumb.jpg": {
                content_type: "image/jpeg",
                data: thumb
            }
        };

		
		if(options.action == "add"){
			request.put({
				uri: "http://"+config.couchauth+"@localhost:5984/"+config.shared
			}, function(err, res, body){ 
				console.log(body)
				
				request.put({
					body: JSON.stringify(dbphoto),
					uri: "http://"+config.couchauth+"@localhost:5984/"+config.shared+"/"+dbphoto.sources[0].id
				}, function(err, res, body){
					console.log(body);
				});
			});
		

		} else {
			request.get({
				uri:"http://"+config.couchauth+"@localhost:5984/"+config.shared+"/"+dbphoto.sources[0].id
			}, function(err, res, body){
					console.log(JSON.parse(body)._rev);
					var rev = JSON.parse(body)._rev;
					request.del({
						uri: "http://"+config.couchauth+"@localhost:5984/"+config.shared+"/"+
							dbphoto.sources[0].id+"?rev="+rev
					}, function(err, res, body){
							console.log(body);
					});
			
			});

		}
		

	}
	
	
	
	app.post("/", function(req, res){
		lfs.readObjectsFromFile(photosFile, function(shared){
            
            if(req.body.shared){
                couchPost({id: req.body.id, action: "add"});
                shared.push(req.body.id);
            } 
            
            else {
                couchPost({id: req.body.id, action: "delete"});
                shared = shared.filter(function(element, index, array){
                    return element != req.body.id
                });
            }
            console.log("Shared: "+shared);
            if(shared.length < 1){
                shared = [""];
            }
            lfs.writeObjectsToFile(photosFile, shared);
        });
	});
	
	
};


var loadPhotos = function(){
	
	return request.get({
	    uri: "http://localhost:8042/Me/photos/allPhotos"
	}, function(){
	    magic(JSON.parse(arguments[2]));
	});
	

}






var stdin = process.openStdin();
stdin.setEncoding('utf8');
stdin.on('data', function (chunk) {
    var processInfo = JSON.parse(chunk);
    process.chdir(processInfo.workingDirectory);
    app.listen(processInfo.port);
    var returnedInfo = {};
    console.log(JSON.stringify(returnedInfo));
    
    try {
        config = JSON.parse(fs.readFileSync(configFile,'utf8'));
    } catch(e){
        config;
    }
    
    app.get('/', function(req, res) {
         
    
        if(config){
            setTimeout(replicate, 3000);
            //console.log(photos);
            
            var indexRender = function(){
                lfs.readObjectsFromFile(photosFile, function(shared){
                    res.render('index', {
                        files: files, 
                        friends: config.i2pcouches, 
                        fs: fs,
                        shared: shared
                    });
                });
                
            }
            
            if(files){
                indexRender();
            } 
            
            else {
                setTimeout(function(){
                    indexRender();
                }, 2000);
            }
            
            request.put({
				uri: "http://"+config.couchauth+"@localhost:5984/"+config.shared
			});
        } 
        
        else {
            res.render('firstrun', {layout: false});
        }
        
    });
    
    

    loadPhotos();
});