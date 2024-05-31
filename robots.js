/*
  *** 用法 ****
var robot = require('robots.js');

//
param = { vue: this, file:'a.js', arguments , onMessage:(){}}


//强制停止机器人
robot.start(param);
robot.showMenu();
robot.stop();
robot.exec(function(){...});

*/
var pathAnalysis = require('./path_analysis.js');
var ROBOT = {};
(function() {
	// #ifndef APP-PLUS
	return;
	//#endif
	var robot;
	robot = uni.requireNativePlugin('Robot');
	robot.init(plus.runtime.appid, (msg) => {
		if (msg != 'fail') {
			return; //good
		}
		//console.log("[init] -> " + msg);
		uni.showModal({
			title: '提示',
			content: 'appid未设置(robot)',
		});
	});
	ROBOT = {
		robot: robot,
		//isready: false,
		started: false,
		permission: () => {},
		start: () => {},
		stop: () => {},
	};
	Object.assign(ROBOT, pathAnalysis);
})(); //
/**
 * @param {Object} {
 *  file: String,                               // 文件地址
 *  httpCacheType?: HttpCacheType,      // 缓存类型
 *  header: Object,                             // HTTP 请求 Header, header
 *  onCacheFile?: () => string            // 缓存地址回调
 * }
 */
ROBOT.init = function(obj) {
	var that = this;
	// #ifndef APP-PLUS
	return; //非手机环境
	// #endif
	if (!that.permission()) {
		//throw new Error('permission fail');
		return false;
	}
	if (typeof(obj) == 'string') {
		obj = {
			file: obj
		}
	}
	if (obj.arguments == undefined) {
		if (obj.vue) {
			obj.arguments = obj.vue.$data;
		} else {
			obj.arguments = {};
		}
	}

	obj.arguments._debug = ROBOT.isDebug;


	this.started = false;
	//
	//准备脚本资源
	this.prepareResorce(obj, (params) => {
		//console.log(params);
		params.arguments.__vue_keys = keys4back(params.vue);
		that.params = params;
		that.robot.setJsDir(params.dir);
		that.robot.setJsFile(params.file);
		that.robot.setJsArguments(JSON.stringify(params.arguments));
		//  VER: 1.1.3
		that.robot.setFailCallback(function(msg) {
			that.started = false;
			if (params.fail != undefined) params.fail(msg);
		});
		that.robot.setStartCallback(function() {
			that.started = true;
			if (params.start != undefined) params.start();
		});
		that.robot.setFinishCallback(function(res) {
			that.started = false;
			if (params.finish != undefined) params.finish(res);
		});
		//
		that.robot.setJsCallback(function(data) {
			var rlt = that.vueCallback(data);
			that.robot.backVueData(rlt);
			return rlt;
		});
		return that;
	});

	return true;
}
//wait  不立即执行
ROBOT.start = function(params, wait) {
	if (params != undefined) {
		if (!this.init(params)) {
			return false;
		}
	}
	this.menu.show();
	if (!wait) {
		this.robot.start();
	}
	return true;
}
ROBOT.menu = {};
ROBOT.menu.move = function(x, y) {
	try { //没初始化的
		ROBOT.robot.moveMenu(x, y)
	} catch (e) {}
}
ROBOT.menu.close = function() {
	try { //
		ROBOT.robot.closeMenu()
	} catch (e) {}
}
ROBOT.menu.show = function() {
	try {
		ROBOT.robot.startMenu();
	} catch (e) {}
}



function _isDebug() {
	var dcloud_control = ROBOT.robot.assets('data/dcloud_control.xml', 'utf-8');
	if (dcloud_control.indexOf('debug="true"') > 0) {
		return true;
	} else {
		return false;
	}
}

// #ifdef APP-PLUS
ROBOT.isDebug = _isDebug();
//#endif

//state: stoped,starting
ROBOT.menu.state = function(state) {
	try {
		ROBOT.robot.changeMenu(state);
	} catch (e) {}
}

ROBOT.showMenu = function(obj) {
	if (!this.init(obj)) {
		return false;
	}
	this.menu.show();
	uni.showToast({
		icon: 'none',
		title: "请打开目标窗口，\n然后从悬浮机器人处启动",
		duration: 5000
	});
}
ROBOT.closeMenu = ROBOT.menu.close;

//执行新代码
ROBOT.exec = function(fun) {
	// var dir = plus.io.convertLocalFileSystemURL('static/robots/');
	// this.robot.setJsDir(dir);

	var code = getJsCode(fun);
	//console.log('start exec');
	//console.log('code =>' + code);
	//console.log('------ code ');
	return ROBOT.robot.exec(code);
}

//为exec准备环境
var checkTimer = null;
ROBOT.eval = function(fun) {
	return eval_do(fun);; ////////不要搞这么麻烦了
	;
	var that = this;
	if (that.started) {
		return eval_do(fun);
	}
	//执行一个空内容 , 绑定各种参数
	this.start('_blank'); //这是个异步操作
	if (checkTimer != null) return;
	checkTimer = setInterval(() => {
		if (that.started) {
			if (checkTimer) {
				clearInterval(checkTimer);
				checkTimer = null;
				return eval_do(fun);
			}
		}
	}, 500);
}

function eval_do(fun) {
	var code = getJsCode(fun);
	//console.log('start eval');
	code = "__exec_autofinish ='yes'; " + code;
	return ROBOT.robot.eval(code);
}
ROBOT.eval_do = eval_do;

function getJsCode(fun) {
	if (typeof(fun) == 'string') {
		return fun;
	}
	var code = fun.toString();
	if (typeof(fun) == 'function') {
		code = "(" + code + ")();"
	}

	var pre_code = "var " + consolename() + "=function(tag, msg, file){ console[tag](msg)};";
	code = pre_code + code;
	//console.log(code);
	return (code);
}

function consolename() {
	var _log2name = function() {
		console.log('log2name');
	}
	var buf = _log2name.toString();
	var p = buf.indexOf('{');
	var p2 = buf.indexOf('("log"');
	var funcName = buf.substring(p + 1, p2);
	return funcName;
}
//检查权限
ROBOT.permission = function() {
	console.log(" robot.permission: ");
	var b = this.robot.permission();
	return b;
}




ROBOT.stop = function() {
	// #ifndef APP-PLUS
	return; //非手机环境
	//#endif
	if (this.robot == null) {
		return;
	}
	this.started = false;
	this.robot.stop();
}


String.prototype.replaceAll = function(s1, s2) {
	return this.replace(new RegExp(s1, "gm"), s2);
}

function keys4back(vue) {
	if (vue == undefined) return {};
	if (vue.$options == undefined) {
		console.log('robot参数：不再支持传递普通对象, 当前仅支持传递vue的this');
		return {};
	}
	var list = {};
	for (var w in vue.$options.methods) {
		list[w] = 'function';
	}
	for (var w in vue.$data) {
		list[w] = typeof(vue.$data[w]);
	}
	return list;
}

function keys4back___old(obj) {
	var list = {};
	for (var key in obj) {
		var type = typeof(obj[key]);
		if (type == 'object') {
			// expode(obj[k], tab+"  ");
		}
		if (!key.startsWith("_") && !key.startsWith("$")) {
			if (type == 'function') {
				list[key] = type;
			} else {
				list[key] = type;
			}
		}
	}
	return list;
}
ROBOT.vueCallback = function(data) {
	//console.log(JSON.stringify(data));
	var obj = this.params;
	var js;
	try {
		js = JSON.parse(data);
	} catch (e) {
		return;
	}
	var error = js.error;
	if (error != undefined && error.indexOf('permission') > -1) {
		//---that.permission();
		js.status = "error"
		//data = JSON.stringify(js)
		return;
	}
	if (!js.__prop) {
		if (obj.onMessage != undefined) {
			return obj.onMessage(js);
		}
	}
	if (js.__prop) { //属性访问，函数调用
		if (js.__type == 'function') { //直接调用
			var new_args = [];
			var args = (js.__arguments);
			for (var k in args) {
				new_args.push(args[k]);
			}
			return obj.vue[js.__prop].apply(null, new_args);
		} else if (js.__type == 'set') {
			//console.log(js.__arguments);
			try {
				return obj.vue[js.__prop] = js.__arguments["0"];
			} catch (e) {
				return obj.vue[js.__prop] = js.__arguments
			}
		} else if (js.__type == 'get') {
			return obj.vue[js.__prop];
		}
	}
}
module.exports = ROBOT;
