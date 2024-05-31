// 全量安装
var utils = require('./install.utils.js');
const version_manager_install = "http://rpa.shen-x.com/";
///http://rpa.shen-x.com/app-store/install.php?app=--appid--
var serverURL = '';
var download_url = '';
var download_ver = '';
var curVersion = "";
var VERINFO = {
	appid: "",
	run: false
}

//直接运行
function run(param) {
   param.run = true;
   upgrade(param);
}
/*
{
	show: true,
    title: "下载测试",
	appid : "__appid_"
	wgt: "http://",
	version_code: "不支持"
	run: false //是否立即运行，而不是安装
}
*/
function upgrade(param) {
	// #ifndef APP-PLUS
	return; //非手机环境
	// #endif 
	var dialog_hide = ()=>{};
	if (param.show) {
		var loadingText = param.title;
		if (!loadingText) {
			loadingText = '加载中...';
		}
		if (loadingText) {
			uni.showLoading({
				title: loadingText
			});
		}
		dialog_hide = ()=>{
			uni.hideLoading();
		}
	} 
	
	//安装指定的appid
	VERINFO.appid = param.appid;
	
	//安装指定的wgt地址
    if(param.wgt){
		installViaUrl(param.wgt, (status) => {
			dialog_hide();
		});
		return;
	}
	
	checkVersion((res) => {
		console.log('current version: ' + project.manifest.version.name);
		console.log('remote version: ' + res.version);
		if (project.manifest.version.name != res.version) { //准备更新
			// plus.nativeUI.confirm("是否安装更新？", function(e){
			// 	console.log("Close confirm: "+e.index);
			// });
			installViaUrl(res.download, (status) => {
				dialog_hide();
			});
		} else {
			dialog_hide();
		}
	});

}
//检查直接安装
function checkThenInstall(loadingText) {
	// #ifndef APP-PLUS
	return; //非手机环境
	// #endif 

	if (loadingText == undefined) {
		loadingText = '加载中...';
	}
	if (loadingText) {
		uni.showLoading({
			title: loadingText
		});
	}

	checkVersion((res) => {
		console.log('current version: ' + project.manifest.version.name);
		console.log('remote version: ' + res.version);
		if (project.manifest.version.name != res.version) { //准备更新
			// plus.nativeUI.confirm("是否安装更新？", function(e){
			// 	console.log("Close confirm: "+e.index);
			// });
			installViaUrl(res.download, (status) => {
				//
				//
			});
		} else {
			if (loadingText) {
				uni.hideLoading();
			}
		}
	});

}
//检查版本
function checkVersion(callback) {
	// #ifndef APP-PLUS
	return; //非手机环境
	// #endif

	if (project.manifest == undefined) {
		//过早的调用，请开发者做个异步即可
		console.error('checkVersion: Fail: 过早的调用，请在robotjs初始化完成后调用');
		return;
	}
	var channel = project.manifest.appid; //实际安装的appid
	if(VERINFO.appid){
		channel = VERINFO.appid;
	}
	return checkInfo(channel, (res) => {
		//console.log(res);
		if (res.err != undefined) {
			console.log(res.err);
			callback('ignore');
			return;
		}
		download_url = res.download;
		download_ver = res.version;
		callback(res);
		return res;
	});
}



//直接安装, //[url]有可能是空
function install(callback, url) {
	// #ifndef APP-PLUS
	return; //非手机环境
	// #endif
	return installViaUrl(url, callback);
}
//直接安装URL,  url有可能是空
function installViaUrl(download_url, callback) {
	if (download_url) {
		do_install(download_url, callback);
		return;
	}

	//如果url为空
	checkVersion(function(res) {
		console.log('remote version: ' + res.version);
		download_url = res.download;
		do_install(download_url, callback);
	});
	return;
}

function do_install(download_url, callback) {
	//console.log(download_url);
	utils.installZipUrl(download_url, (status) => {
		if (status == 'ok') {
			uni.setStorageSync('version', download_ver);
			// alert(status);
			//plus.runtime.restart();
			plus.nativeUI.alert("升级完成，请重启!", function() {
				plus.runtime.quit();
			});
		} else {
			uni.showToast({
				title: '完成，无更新',
				icon: 'none',
				duration: 3000
			});
		}
		callback(status);
	});
}

function checkInfo(channel, callback) {

	var server = version_manager_install;
	if(serverURL){
		server = serverURL
	}
	var url = server + "/app-store/install.php?app=" + channel;;
	
	uni.request({
		url: url,
		type: 'GET',
		success: res => {
			callback(res.data)
		},
		fail: err => {
			console.log('err')
			callback('err')
		}
	})
};

function manifest() {
	// #ifndef APP-PLUS
	console.log('not run in app');
	return; //非手机环境
	// #endif 

	//var jsbuf = files.readAssets('apps/__UNI__9D97713/www/manifest.json');
	//var robot = uni.requireNativePlugin('Robot');
	var robot = global.ROBOT_CURRENT.robot;
	//console.log(robot);
	var jsbuf = robot.resource('manifest.json', "utf-8");
	//console.log(jsbuf);
	manifestInfo = JSON.parse(jsbuf);
	manifestInfo.isDebug = global.ROBOT_CURRENT.isDebug;
	return manifestInfo;
}

var project = {};
var _appid;
//读取项目目录的文件
project.resource = function(filename, resolveBack) {
	var mf_path = plus.io.convertLocalFileSystemURL(filename);
	utils.getFileText(mf_path, resolveBack);
}



function prepare() {
	project.resource('./manifest.json', function(res) {
		project.manifest = (JSON.parse(res));
		project.appid = project.manifest.appid = project.manifest.id;
		project.version_name = project.manifest.version.name;
		project.version_code = project.manifest.version.code;

		if (prepare.onReadyCaller) {
			prepare.onReadyCaller();
		}
		prepare._readyDone = true;
	});;
}
prepare.onReadyCaller = null;
// #ifdef APP-PLUS
prepare();
// #endif
prepare._readyDone = false;



var isDebug = 'undefined';
// #ifdef APP-PLUS
isDebug = global.ROBOT_CURRENT.isDebug;
// #endif

var onReady = null;

// var _onReadyCaller = null;
// onReady = function(callback){
// 	_onReadyCaller = callback;
// }

module.exports = {
	checkVersion,
	install,
	checkThenInstall,
	manifest,
	isDebug,
	project,
	server: serverURL

}
// module.exports.prototype.appid = function(){
//    return project.appid;
// }

Object.defineProperty(module.exports, 'onReady', {
	set(callback) {
		prepare.onReadyCaller = callback;
		if (prepare._readyDone) { //如果已经过期了，则直接运行
			return callback();
		}
	}
});
Object.defineProperty(module.exports, 'appid', {
	get() {
		//console.log('获取')
		return project.manifest.appid;
	},
	// set(newValue) {
	//     console.log('设置')
	//     value = newValue
	// }
});
Object.defineProperty(module.exports, 'name', {
	get() {
		return project.manifest.version.name;
	},
});
Object.defineProperty(module.exports, 'code', {
	get() {
		return project.manifest.version.code;
	},
});
