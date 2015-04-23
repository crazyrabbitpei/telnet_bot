/** node modulus **/
var net = require('net');
var iconv = require('iconv-lite'); 
var S = require('string');
var fs = require('fs');
var screen = require('./screen');

/** Regular Expression && Pattern **/
const AnsiSetDisplayAttr = /\[(\d+)*;*(\d+)*;*(\d+)*;*(\d+)*[mHK]/g ;
const ArticleListStart = /\s人氣:[0-9]{1,5}\s/ ;
const ArticleListEnd = "[34;46m 文章選讀" ;
const AnsiEraseEOL = /\[K/g ;
const AnsiCursorHome = /\[(\d+)*;*(\d+)*H/g
const ArticleIndexStart = "目前顯示: 第";
const ArticleIndexEnd = "行";
const ArticlePercentStart = " 頁 (";
const ArticlePercentEnd = "%)";

/** Telnet Keyboard Equivalents **/
const Enter = '\x0d';
const Left = '\u001b[D';
const Right = '\u001b[C';
const Up = '\u001b[A';
const Down = '\u001b[B';
const PageUp = '\u001b[5~';
const PageDown = '\u001b[6~';
const CtrlL = '\u000c';
const Read = 'r';

/** Screens **/
const Main = 0; //【主功能表】
const HotBoard = 1; //【熱門看板列表】
const FavBoard = 2; //【我的最愛看板列表】
const BoardClass = 3; //【分類看板】
const BoardList = 4; //【看板列表】
const ArticleList = 5; //【文章列表】
const Article = 6; //【文章內】

/** para @ global screen **/
var ip ="140.112.172.11";
var dname = "ptt.cc";
var name = "批踢踢實業坊";

const nullScreen = '\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n';
const nullScreenRow = [' null_row;'].concat(S(nullScreen).lines());

var crawl_num=1;
var crawl_limit=10;
var lastnum=0;
var g_conn ;//connecton to ptt-sever
var g_screenBuf = 'wait...';//mimic screen of terminal
var g_screenBufRow = [];
var g_articleBuf = '';
var g_new_data = '';
var g_workingState = 'ExcutingLogin';
var g_commandsObj = {
PttCommands: [],
			 callbacks: []
}
var g_cursor = {
row: 1,
	 col: 1
}
//fs.writeFile('./ptt_data/log_article.txt','');

function login(id, ps, callback){
		g_conn = net.createConnection(23,dname);
		g_conn.setTimeout(50);
		g_commandsObj.callbacks.push((callback ? callback : function(){}));	
		//Listeners
		g_conn.addListener('connect', function(){
						console.log('[1;31mconnected to ptt-sever[m');
						});
		
		g_conn.addListener('end',function(){
						console.log("[1;31mDisconnected...![m");
						});
		
		g_conn.addListener('data', function(data){
						g_new_data += iconv.decode(data,'big5');
						});
		g_conn.addListener('timeout', function(){//Emitted if the socket times out from inactivity. This is only to notify that the socket has been idle. The user must manually close the connection.
						var newdataStr = g_new_data;
						switch( g_workingState ){		
						case 'ExcutingLogin':
						loginDataHandler(newdataStr, id, ps);
						break;
						case 'LoadNextPttbotComand':
						//g_screenBuf = screen.parseNewdata(g_cursor,newdataStr);
						//console.log("LoadNextPttbotComand");
						g_screenBuf = newdataStr;
						executeCallback();
						g_screenBuf = '';//clear old data
						sendNextCommand();
						break;
						case 'EnteringBoard':
						console.log("EnteringBoard");
						enteringBoardDataHandler(newdataStr);
						break;
						case 'CollectingArticle':
						//console.log("CollectingArticle");
						//g_screenBuf = screen.parseNewdata(g_cursor,newdataStr);//先註解起來，因為文章大於一定長度(ex:15，這行就會出錯(parseNewdata function)
						g_screenBuf = newdataStr;//不轉編碼，直接給值
						//fs.appendFile('./ptt_data/log_article.txt',newdataStr);
						//console.log("->:["+newdataStr.length+"]");
						if(newdataStr.length==0){
								g_conn.write(Enter);
								g_workingState = 'LoadNextPttbotComand';
								break;
						}
						if (newdataStr.indexOf("此文章無內容") !=-1){
								g_conn.write(Enter);
								g_workingState = 'LoadNextPttbotComand';
								break;
						}
						if(newdataStr.indexOf("(本文已被刪除)") !=-1){
								//console.log("本文已被刪除");
								g_conn.write(Enter);
								g_workingState = 'LoadNextPttbotComand';
								break;
						}
						if(newdataStr.indexOf("這份文件是可播放的文字動畫") !=-1){
								//console.log("本文已被刪除");
								g_conn.write('n');
						}
						collectArticle(); 
						moveToNextPage();
						break;
						case 'LoadNextArticle':
						console.log('LoadNextArticle');

						break
						default :
						console.log('working state is undifined.');

						}
						g_new_data = '' ;		

		});
		return g_conn;
}
function toBoard( BoardName,callback ){

		var command = 's' + BoardName + '\r';
		addCommands(CtrlL,function(){
						g_workingState = 'EnteringBoard';
						g_screenBufRow = [' null_row;'].concat(S(nullScreen).lines());//clean old data, since g_screenBufRow is not used until nextPttComand. 
						});
		addCommands(command,callback);

}

function getNum(){
		return lastnum;

}
function getScreen(){
		return g_screenBuf;

}

function fetchArticle(Num,callback){
		var command = Num+Enter+Enter;
		addCommands(CtrlL,function(){
						g_workingState = 'CollectingArticle';
						console.log("num:"+Num);
						g_screenBufRow = [' null_row;'].concat(S(nullScreen).lines());//clean old data, since g_screenBufRow is not used until nextPttComand. 
						});
		addCommands(command,callback);

}
function getArticle(){
			//console.log("getArticle");
			return g_articleBuf;

}

function fetchBoardHeader(){
			var output = S(g_screenBuf).between('[33m', '[0;1;37;44m').s;
				return output;

}
/*
   function craw(crawler_option,BoardName){
   switch(crawler_option){
   case 'C':
   if (newdataStr.indexOf("主功能表") != -1){
   console.log("主功能表");
   g_conn.write(Class+Enter);
   }

   if (newdataStr.indexOf("分類看板") != -1){
   console.log("已進到分類看板");
   g_conn.write('1');
   }
   if (newdataStr.indexOf("跳至第幾項") != -1){
//console.log("跳至第幾項?");
g_conn.write(BoardName+Enter);
g_conn.write(Enter);
}

if (newdataStr.indexOf("看板列表") != -1){
console.log("已進入即時熱門看板");
console.log(newdataStr);

}
}
}
 */
/*
   export public function
 */
exports.login = login;
exports.toBoard = toBoard;
exports.getScreen = getScreen;
exports.getNum = getNum;
exports.fetchArticle = fetchArticle;
exports.getArticle = getArticle;
exports.fetchBoardHeader = fetchBoardHeader;

function executeCallback(){

		g_commandsObj.callbacks.shift()();

}
function sendNextCommand(){

		if(g_commandsObj.PttCommands.length != 0){		
				var PttCommand = g_commandsObj.PttCommands.shift();
				//console.log("next:"+PttCommand);
				g_conn.write(PttCommand+CtrlL);	//FixMe
				//g_conn.write(PttCommand);	//FixMe
		}

		else {
				g_conn.removeAllListeners('timeout');
				g_conn.end();
		}	

}
function addCommands(command,callback){
		g_commandsObj.PttCommands.push(command);
		g_commandsObj.callbacks.push((callback ? callback : function(){}));	

}
function moveToNextPage(){
		if(g_workingState=='CollectingArticle') {
				g_conn.write(PageDown);
		}
		else{
				executeCallback();
				g_conn.write(Left);	//goes back to 【文章列表】
				sendNextCommand();
				g_articleBuf= '';
		}

}

function collectArticle(){
		var row = S(g_screenBuf).between(ArticleIndexStart,ArticleIndexEnd).replaceAll(' ', '"').replaceAll('~', '","').s; 
		var rowStart = parseInt(S(row).parseCSV()[0]==1 ? 1 : S(row).parseCSV()[0]);
		var rowEnd = parseInt(S(row).parseCSV()[1]);	
		var articleRow = S(g_articleBuf).lines();
		var newArticleRow = S(g_screenBuf).lines().slice(1);
		/*
		console.log(">>>>--------------------------------<<<<");
		console.log("row:"+row);
		console.log("rowStart:"+rowStart);
		console.log("rowEnd:"+rowEnd);
		
		console.log("articleRow:"+articleRow);
		
		console.log("newArticleRow:"+newArticleRow);
		*/
		for(var i=rowStart;i<=rowEnd;i++){
					articleRow[i] = newArticleRow[i-rowStart];
		}

		g_articleBuf = '';

		for(var _ = -1, n = articleRow.length; ++_ < n ;){
				if( typeof articleRow[_]!=='undefined'){
					g_articleBuf += articleRow[_] + '\r\n';
				}
		}

		if(S(g_screenBuf).between(ArticlePercentStart,ArticlePercentEnd).s == '100'){
				g_workingState = 'LoadNextPttbotComand';
				//g_workingState = 'LoadNextArticle';
		}

}

function loginDataHandler(newdataStr, id, ps){
		//for ptt
		if (newdataStr.indexOf(ip) != -1 && newdataStr.indexOf(name) != -1) {
		}

		if (newdataStr.indexOf("您想刪除其他重複登入的連線嗎") != -1){
				g_conn.write( 'n\r' );
				//console.log( '已刪除其他重複登入的連線' );
		}

		if (newdataStr.indexOf("登入中") != -1){
				//console.log("登入中...");
		}

		if (newdataStr.indexOf("請輸入代號，或以 guest 參觀，或以 new 註冊:") != -1){
				console.log("請輸入代號，或以 guest 參觀，或以 new 註冊:");
				g_conn.write( id+'\r' );
				console.log("(已輸入帳號)");
		}

		if (newdataStr.indexOf("請輸入您的密碼") != -1){
				console.log("請輸入您的密碼:");
				g_conn.write( ps+'\r' );
				console.log("(已輸入密碼)");
		}		

		if (newdataStr.indexOf("歡迎您再度拜訪") != -1){
				console.log("歡迎您再度拜訪!");
				g_conn.write( '\r' );
				//console.log("(已按任意鍵繼續)");
		}

		if (newdataStr.indexOf("按任意鍵繼續") != -1 && newdataStr.indexOf("請勿頻繁登入以免造成系統過度負荷") != -1){
				g_conn.write( '\r' );
				console.log("(請勿頻繁登入以免造成系統過度負荷)");
		}

		if (newdataStr.indexOf("主功能表") != -1){
				console.log( 'Robot commands for main screen should be executed here.↓ ↓ ↓\n[1;32m您現在位於【主功能表】[m' ); 
				g_workingState = 'LoadNextPttbotComand';
				g_screenBufRo = screen.parseNewdata(g_cursor,newdataStr);
				g_conn.write(CtrlL);
		}
}
function enteringBoardDataHandler(newdataStr){

		console.log('enteringBoardDataHandler');
		if (newdataStr.indexOf("按任意鍵繼續") != -1){
				g_conn.write(Enter+Down);
				console.log("已按任意見繼續 進入看板");
				//console.log(newdataStr);
		}
		else{ 
				g_conn.write(CtrlL);
				console.log("已在看版裡");
				console.log('重整畫面CtrlL');
				//console.log(newdataStr);
				var array = newdataStr.split("\n");
				for(var i=array.length-1;i>=0;i--){
					array1 = array[i].split(' ');
						j=2;
						l = array1[j].length;
						t = array1[j][l-1];
						//console.log("["+i+"]"+j+":["+array1[j]+"]->t="+t+"->l="+l);
						result  = parseInt(t);
						if(!isNaN(result)){
							console.log("break");
							break;
						}
				}
				console.log("last:"+array1[j]);
				lastnum = array1[j];
				
				g_workingState = 'LoadNextPttbotComand';

		}	
}
