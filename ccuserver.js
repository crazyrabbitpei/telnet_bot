var myBot = require('./bot/ccubot');
var fs = require('fs');
var iconv = require('iconv-lite'); 
var user = "username";
var psw = "password";
//create the connection object for robot.
myBot.login(user,psw,function(){
				console.log("hi,"+user+", how are you?");
});

