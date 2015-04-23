var myBot = require('./bot/pttbot');
var fs = require('fs');
var iconv = require('iconv-lite'); 
/*user informatoin*/
var user = "username";
var psw = "password";

/*choose crawler*/
const Announce = 'A';//【 精華公佈欄 】
const Favorite = 'F';//【 我 的 最愛 】
const Class = 'C';//【 分組討論區 】
var CBoardName = '12';//即時熱門看板

const SBoard = 's';
var SBoardName = 'chiayi';
var index=1;
var num=1;

fs.exists('./ptt_data/',function(exists){
        if(!exists) {
            fs.mkdir('./ptt_data/',function(){
                console.log("create ./ptt_data/");
            })
        }
});

var dir = './ptt_data/'+SBoardName;
fs.exists(dir,function(exists){
        if(exists) {
            console.log(dir+" is exists");
            fs.readFile('./ptt_data/'+SBoardName+'/index.txt',function read(err,data){
                if(err){
                    throw err;
                }
                else{
                    index = parseInt(data);
                    console.log("index:"+index);
                }
            });
        }
        else{
            console.log("no "+ dir);
            fs.mkdir(dir,function(){
                console.log("create:"+dir);
            });
            fs.writeFile(dir+'/log_web_article.txt', '',function(){
                console.log("write "+dir+'/log_web_article.txt');
            });
            fs.writeFile(dir+'/index.txt','1',function(){
                console.log("write "+dir+'/index.txt');
            });
            fs.writeFile(dir+'/toBoard.txt','',function(){
                console.log("write "+dir+'/toBoard.txt');
            });
        }
});

//create the connection object for robot.
myBot.login(user,psw,function(){
				console.log("hi,"+user+", how are you?");
				});
myBot.toBoard(SBoardName,function(){
				fs.writeFile('./ptt_data/'+SBoardName+'/toBoard.txt', iconv.encode(myBot.getScreen(),'big5'), function (err) {
						if (err) throw err;
						//console.log('toBoard is saved!');
						});

				num = parseInt(myBot.getNum());
				fs.writeFile('./ptt_data/'+SBoardName+'/index.txt', num, function (err) {
						if (err) throw err;
						console.log('num:'+num+' is saved as new index!');
						});
				console.log("num->"+num);
				for(var i=index;i<=num;i++){
				myBot.fetchArticle(i,function(){

						fs.appendFile('./ptt_data/'+SBoardName+'/'+index+'_'+num+'_article.txt', iconv.encode(myBot.getArticle(),'utf-8'), function (err) {
								if (err) throw err;
								//console.log('article '+i+ ' is saved!');

								});
						});
				}

});





/*
   myBot.toArticle('49440',function(){
   console.log('toArticle!');
   });

   myBot.fetchArticle(function(){
   console.log('fetchArticle!');
   });
 */
/*myBot.craw(Class,CBoardName,function(){
  console.log("crawler fin");		
  });*/

