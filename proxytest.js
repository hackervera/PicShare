var request = require("request");
var addresses = ["tc3tunegsmlicdp33kv5mkwyv723ya4kmctpj3yxf2ithb3bmtta.b32.i2p"];
var proxy = "pdxbrain.com:4444";
for(var i=0; i < addresses.length; i++){
	request.get({
		uri:"http://"+addresses[i],
		proxy: "http://"+proxy
		}, function(err, res, body){ console.log(body)});
}