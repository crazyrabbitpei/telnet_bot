/** node modulus **/
var net = require('net');
var iconv = require('iconv-lite'); 
var S = require('string');
var fs = require('fs');
var screen = require('./screen');

/** para @ global screen **/
var ip ="140.123.20.230";
var dname = "cd.twbbs.org";
//var name = "中正築夢園BBS站";

const nullScreen = '\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n';
const nullScreenRow = [' null_row;'].concat(S(nullScreen).lines());

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

function login(id, ps, callback){
		g_conn = net.createConnection(23,dname);
		g_conn.setTimeout(1000);
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
		g_conn.addListener('timeout', function(){
						var newdataStr = g_new_data;
						switch( g_workingState ){		
						case 'ExcutingLogin':
						loginDataHandler(newdataStr, id, ps);
						break;
						case 'LoadNextPttbotComand':
						g_screenBuf = screen.parseNewdata(g_cursor,newdataStr);
						executeCallback();
						g_screenBuf = '';//clear old data
						sendNextCommand();
						break;
						case 'EnteringBoard':
						enteringBoardDataHandler(newdataStr);
						case 'CollectingArticle':
						g_screenBuf = screen.parseNewdata(g_cursor,newdataStr);	
						collectArticle(); 
						moveToNextPage();
						break;

						default :
						console.log('working state is undifined.');

						}
						g_new_data = '' ;		

		});
		return g_conn;
}
/*
   export public function
 */
exports.login = login;

function loginDataHandler(newdataStr, id, ps){
		//for ccu bbs
		if (newdataStr.indexOf(ip) != -1) {
		}
		
		if (newdataStr.indexOf("您想踢掉其他重複的 login (Y/N)嗎") != -1){
				g_conn.write( 'y\r' );	
				console.log( '已刪除其他重複登入的連線' );
		}

		if (newdataStr.indexOf("[您的帳號]") != -1){
				console.log("[您的帳號]");
				g_conn.write( id+'\r' );
				console.log("[32m(已輸入帳號)[m");
		}

		if (newdataStr.indexOf("[您的密碼]") != -1){
				console.log("[您的密碼]");
				g_conn.write( ps+'\r' );
				console.log("[32m(已輸入密碼)[m");
		}		
		if (newdataStr.indexOf("請按任意鍵繼續") != -1){
				console.log(newdataStr);
				g_conn.write( '\r' );
				console.log("[32m(已按任意鍵繼續)[m");
		}
		if (newdataStr.indexOf("精華公佈欄") != -1){
				console.log(newdataStr);
				//console.log( 'Robot commands for main screen should be executed here.↓ ↓ ↓\n[1;32m您現在位於【主功能表】[m' ); 
		}

		if (newdataStr.indexOf("按任意鍵繼續") != -1 && newdataStr.indexOf("請勿頻繁登入以免造成系統過度負荷") != -1){
				g_conn.write( '\r' );
				console.log("[32m(請勿頻繁登入以免造成系統過度負荷)[m");
		}
		/*
		if (newdataStr.indexOf("歡迎光臨") != -1 && newdataStr.indexOf("目前線上人數") == -1){
				console.log(newdataStr);
				g_conn.write( '\r' );
				console.log("[32m(已按任意鍵繼續)[m");
		}
		
		if (newdataStr.indexOf("歡迎您第") != -1){
				console.log(newdataStr);
				g_conn.write( '\r' );
				console.log("[32m(已按任意鍵繼續)[m");
		}

		if (newdataStr.indexOf("本日十大熱門話題") != -1){
				console.log(newdataStr);
				g_conn.write( '\r' );
				console.log("[32m(已按任意鍵繼續)[m");
		}

		if (newdataStr.indexOf("酸") != -1){
				console.log(newdataStr);
				g_conn.write( '\r' );
				console.log("[32m(已按任意鍵繼續)[m");
		}
		*/

		
}
