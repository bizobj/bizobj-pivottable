(function(){
    var open = function(dbName, callback/*(db)*/){
		var indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.msIndexedDB;
		if (!indexedDB) {
	    	throw "当前浏览器不支持 IndexDB, 请使用 IE 11、Chrome 或者 Firefox 浏览器";
		}

    	var openRequest = indexedDB.open(dbName, 1);
		openRequest.onupgradeneeded = function(e) {
		    var db = e.target.result;
		    if(!db.objectStoreNames.contains("KV")){
		    	db.createObjectStore("KV", { keyPath: "key" }); 
		    }
		}
		openRequest.onsuccess = function(e) {
			var db = e.target.result;
		    callback.apply(e, [db]);
		}
		openRequest.onerror = function(e) {
		    throw e.target.error;
		}
    }
    var get = function(dbName, key, callback/*(value)*/){
    	open(dbName, function(db){
	    	var req = db.transaction(["KV"], "readonly").objectStore("KV").get(key);
	    	req.onsuccess = function(e){
	    		var data = e.target.result||{};
	    		callback.apply(e, [data.value])
	    	}
	    	req.onerror = function(){
	    		throw e.target.error;
	    	}
    	});
    };
    var put = function(dbName, key, value, callback){
    	open(dbName, function(db){
    		var data = {
	    		key: key,
	    		value: value
	    	};
	    	var req = db.transaction(["KV"], "readwrite").objectStore("KV").put(data);
	    	req.onsuccess = function(e){
	    		callback.apply(e)
	    	}
	    	req.onerror = function(){
	    		throw e.target.error;
	    	}
    	});
    };
    var del = function(dbName, key, callback){
    	open(dbName, function(db){
	    	var req = db.transaction(["KV"], "readwrite").objectStore("KV").delete(key);
	    	req.onsuccess = function(e){
	    		callback.apply(e)
	    	}
	    	req.onerror = function(){
	    		throw e.target.error;
	    	}
    	});
    };
    
    window.KV = {
    	get: get,
    	put: put,
    	del: del
    };
})();

(function(){
	var toDate = function(v) {
	    var d = null;
	    if (v != null) {
	        if (v instanceof Date) {
	            d = v;
	        } else if($.isNumeric(v)) {
	            var num = parseInt(v);
	            var tmp = num%10000;
	            var year = (num-tmp)/10000;
	            num = tmp;
	            tmp = num%100;
	            var month = (num-tmp)/100;
	            var date = tmp;
	            d = new Date(year+"/"+month+"/"+date);
	        } else if (typeof v == "string") {
	            v = v.replace(/-/g, "/");
	            if( v.length > 0 ) {
	                d = new Date(v);
	            }
	        }
	    }
	    return d;
	};
	
	var Q_MAP = ["Q1","Q1","Q1","Q2","Q2","Q2","Q3","Q3","Q3","Q4","Q4","Q4"];
	var getQuarter = function(d){
		var m = d.getMonth();
		return Q_MAP[m];
	}
	
	window.PTool = {
		toDate: toDate,
		getQuarter: getQuarter
	};
})();

$(function () {
  var showMsg = function(msg){
      var $msg = $("#msg-dialog");
      $msg.attr("title", "通知信息");
      $msg.html("<p>"+msg+"</p>");
      $msg.dialog({ height: 140, width:420, modal: true });
  }
  var showError = function(msg){
      var $msg = $("#msg-dialog");
      $msg.attr("title", "错误信息");
      $msg.html("<p>"+msg+"</p>");
      $msg.dialog({ height: 140, width:420, modal: true });
  }
  window.onerror = function(message, _source, _lineno, _colno, _error) {
	  showError(message);
  };
  var showConfirm = function(msg, callback){
  	var $dialog = $("#confirm-dialog");
	//标题
	$dialog.find(".confirm-message").text(msg);

    $dialog.find(".confirm-yes").unbind().click(function(){
    	$dialog.dialog( "close" );
    	callback.apply({msg: msg, button: "yes"}, [true]);
    });
    $dialog.find(".confirm-no").unbind().click(function(){
    	$dialog.dialog( "close" );
    	callback.apply({msg: msg, button: "no"}, [false]);
    });

  	//显示对话框
  	$dialog.dialog( { modal: true } );
  }
  
  //从 window.name 获取数据
  var __Window_Name_Data = $.parseJSON(window.name);
  
  document.title = "透视表: "+__Window_Name_Data.tableCaption+"("+(new Date()).toLocaleString()+")";
  
  var attributes = __Window_Name_Data.attributes||{};
  var getAttr = function(key, defaultValue){
  	return attributes[key]||defaultValue;
  }
  var getAttrJSON = function(key, defaultValue){
      var json = getAttr(key, "");
      if (json){
		if (json.constructor === String){
			json = $.parseJSON(json);
		}
      }else{
      	json = defaultValue;
      }
      return json;
  }
  
  //本地存储相关
  var DB_NAME = "PIVOTTABLE_CONFIGS/"+__Window_Name_Data.storageIdentify;
  var KEY_ALL_CONFIGS = __Window_Name_Data.tableKey + "/configs";
  var KEY_CURRENT = __Window_Name_Data.tableKey + "/current";
  var default_config = {};
  var listSavedConfigs = function(callback/*(configs)*/){
  	KV.get(DB_NAME, KEY_ALL_CONFIGS, function(configs){
  		callback.apply({}, [configs||{}]);
  	});
  }
  var loadConfig = function(name, callback/*(config)*/){
  	listSavedConfigs(function(configs){
  		callback.apply({}, [configs[name]]);
  	});
  }
  var saveConfig = function(name, config, callback){
  	listSavedConfigs(function(configs){
  	    if (config){
 	  		configs[name] = config;
  	    }else{
  	    	delete configs[name];
  	    }
  		KV.put(DB_NAME, KEY_ALL_CONFIGS, configs, function(){
  			callback.apply({}, []);
  		});
  	});
  }

  var saveAsCurrentConfig = function(config, callback){
	KV.put(DB_NAME, KEY_CURRENT, config, function(){
		callback.apply({}, []);
	});
  }
  var loadCurrentConfig = function(callback/*(currentConfig)*/){
  	KV.get(DB_NAME, KEY_CURRENT, function(currentConfig){
		callback.apply({}, [currentConfig]);
  	});
  }
  var cleanCurrentConfig = function(callback){
  	KV.del(DB_NAME, KEY_CURRENT, function(){
		callback.apply({}, []);
  	});
  }

  var doSaveConfig = function(){
  	var $dialog = $("#save-config-dialog");
  	//备份原来的输入
  	$dialog.data("configNameBackup", $dialog.find(".save-config-name").val());
  	//必要的初始化
  	var initStatus = $dialog.data("initStatus");
  	if (! initStatus){
  	    $dialog.find(".save-config-ok").click(function(){
  	    	var name = ($dialog.find(".save-config-name").val() || "").trim();
  	    	if (! name){
  	    		$dialog.find(".validate-error").text("请输入名称");
  	    		return;
  	    	}
  	    	loadConfig(name, function(config){
  	    		if (config){
      	    		$dialog.dialog( "close" );	//必须先关闭当前 dialog
      	    		showConfirm("配置 '"+name+"' 已经存在, 是否覆盖?", function(yes){
      	    			if (yes){
      	    				saveConfig(name, readPivotUIOptions(), function(){});
      	    			}else{
      	    				$dialog.dialog( "open" );
      	    			}
      	    		});
  	    		}else{
      	    		saveConfig(name, readPivotUIOptions(), function(){});
      	    		$dialog.dialog( "close" );
  	    		}
  	    	});
  	    });
  	    $dialog.find(".save-config-name").change(function(){
  	    	$dialog.find(".validate-error").text("");
  	    });
  	    $dialog.find(".save-config-cancel").click(function(){
  	    	//取消时恢复原来的输入
  	    	$dialog.find(".save-config-name").val($dialog.data("configNameBackup")||"");
  	    	
  	    	$dialog.dialog( "close" );
  	    });
  		$dialog.data("initStatus", "yes");
  	}
  	//显示对话框
  	$dialog.find(".validate-error").text("");	//清除校验信息
  	$dialog.dialog( { height: 240, width: 480, modal: true } );
  }
  var doApplyConfig = function(){
  	var $dialog = $("#apply-config-dialog");
  	var $select = $dialog.find(".apply-config-list");
  	//必要的初始化
  	var initStatus = $dialog.data("initStatus");
  	if (! initStatus){
  	    $dialog.find(".apply-config-ok").click(function(){
  	    	var selectedName = ($select.val() || "").trim();
  	    	if (! selectedName){
  	    		$dialog.find(".validate-error").text("请选择已经保存的配置");
  	    		return;
  	    	}
  	    	loadConfig(selectedName, function(config){
  	    		if (config){
      	    		$dialog.dialog( "close" );
      	    		renderPivotUI(config);
      	    		//同时记住这个配置的名称
      	    		$("#save-config-dialog").find(".save-config-name").val(selectedName);
  	    		}else{
      	    		$dialog.find(".validate-error").text("无法加载配置 '"+selectedName+"'");
  	    			return;
  	    		}
  	    	});
  	    });
  	    $dialog.find(".apply-config-list").change(function(){
  	    	$dialog.find(".validate-error").text("");
  	    });
  	    $dialog.find(".apply-config-cancel").click(function(){
  	    	$dialog.dialog( "close" );
  	    });
  		$dialog.data("initStatus", "yes");
  	}
  	//构造可选的配置列表
  	listSavedConfigs(function(configs){
  	    $select.html("<option value=''></option>");
  	    
  	    //在保存对话框记录当前的配置名称
  	    var curName = $("#save-config-dialog").find(".save-config-name").val();
      	for (var name in configs){
      	    var opt = $("<option/>").val(name).text(name);
      	    if (name==curName){
      	    	opt.attr("selected", true);
      	    }
      		$select.append(opt);
      	}
  	});
  	//显示对话框
  	$dialog.dialog( { height: 240, width: 480, modal: true } );
  }
  
  var doExportExcel = function(){
  	var $table = $(".pvtRendererArea").children("table");
  	if (! $table[0]){
  		showMsg("只有统计表格可以导出为 Excel。");
  		return;
  	}
  	var tableCaption = __Window_Name_Data.tableCaption||"透视表文件";
  	var fileName = tableCaption.replace(/\\/g, "_").replace(/\//g, "_").replace(/\:/g, "_");
  	$table.table2excel({
        exclude: ".noExl",
        name: fileName,
        filename: fileName+".xls",
        exclude_img: true,
        exclude_links: true,
        exclude_inputs: true
    });
  }
  
  var doManageSettings = function(){
  	var $dialog = $("#manage-settings-dialog");
  	//必要的初始化
  	var initStatus = $dialog.data("initStatus");
  	if (! initStatus){
  	    $dialog.find(".manage-settings-delete-config").click(function(){
  	    	doManageSettings_DeleteConfig($dialog);
  	    });
  	    $dialog.find(".manage-settings-restore").click(function(){
  	    	doManageSettings_Restore($dialog);
  	    });
  	    $dialog.find(".manage-settings-close").click(function(){
  	    	$dialog.dialog( "close" );
  	    });
  		$dialog.data("initStatus", "yes");
  	}
  	//显示对话框
  	$dialog.dialog( { height: 240, width: 360, modal: true } );
  }
  var doManageSettings_Restore = function($dialog){
	$dialog.dialog( "close" );
  	showConfirm("是否恢复默认透视表格式?", function(yes){
  		if (yes){
  			renderPivotUI(default_config, true);
  			cleanCurrentConfig(function(){});
  			//同时清除配置名称记录
    		$("#save-config-dialog").find(".save-config-name").val("");
  		}else{
  			$dialog.dialog( "open" );
  		}
  	});
  }
  var doManageSettings_DeleteConfig = function($preDialog){
	$preDialog.dialog( "close" );

  	var $dialog = $("#delete-config-dialog");
    var $select = $dialog.find(".delete-config-list");
  	//必要的初始化
  	var initStatus = $dialog.data("initStatus");
  	if (! initStatus){
  	    $dialog.find(".delete-config-ok").click(function(){
  	    	var selectedName = ($select.val() || "").trim();
  	    	if (! selectedName){
  	    		$dialog.find(".validate-error").text("请选择已经保存的配置");
  	    		return;
  	    	}
  	    	$dialog.dialog( "close" );
			showConfirm("是否删除配置 '"+selectedName+"' ?", function(yes){
	      		if (yes){
	      			saveConfig(selectedName, null, function(){});
	      			$preDialog.dialog( "open" );
	      		}else{
					$dialog.dialog( "open" );
				}
	      	});
  	    });
  	    $dialog.find(".delete-config-list").change(function(){
  	    	$dialog.find(".validate-error").text("");
  	    });
  	    $dialog.find(".delete-config-cancel").click(function(){
  	    	$dialog.dialog( "close" );
  	    	$preDialog.dialog( "open" );
  	    });
  		$dialog.data("initStatus", "yes");
  	}
  	//构造可选的配置列表
  	listSavedConfigs(function(configs){
  	    $select.html("<option value=''></option>");
  	    var curName = $("#save-config-dialog").find(".save-config-name").val();
      	for (var name in configs){
      	    var opt = $("<option/>").val(name).text(name);
      	    if (name==curName){
      	    	opt.attr("selected", true);
      	    }
      		$select.append(opt);
      	}
  	});
  	//显示对话框
  	$dialog.dialog( { height: 240, width: 480, modal: true } );
  }
  
  //Toolbar 初始化
  $("#save-config").click(function(){
  	doSaveConfig();
  });
  $("#apply-saved-config").click(function(){
  	doApplyConfig();
  });
  $("#export-excel").click(function(){
  	doExportExcel();
  });
  $("#manage-settings").click(function(){
  	doManageSettings();
  });

  //准备表格 Key 与 标题 的 映射表
  var keyCaptionTable = getAttrJSON("__KEY_CAPTION_TABLE", {});
  var _mapping = function(keys){
  	if (keys && Array.isArray(keys)){
  		var result = [];
	  	for (var i=0; i<keys.length; i++){
	  		result[result.length] = keyCaptionTable[keys[i]]||keys[i];
	  	}
	  	return result;
  	}else{
  		return keys;
  	}
  }
  //处理 renderer 属性, 默认 "Table"
  var rendererName = getAttr("renderer", "Table");
  //处理 aggregator 属性, JSON 格式 {name:XXX, vals:[val1,val2]}
  var aggregator = getAttrJSON("aggregator", {});
  if (aggregator){
  	aggregator.vals = _mapping(aggregator.vals);
  }
  //处理 fields 属性, JSON 格式 {cols:[col1, col2], rows:[row1, row2]}
  var fields = getAttrJSON("fields", {});
  if (fields){
    fields.cols = _mapping(fields.cols);
    fields.rows = _mapping(fields.rows);
  }
  //处理 dateFields 属性, JSON 格式 [field1, field2]
  var dateFields = getAttrJSON("dateFields", []);
  dateFields = _mapping(dateFields);
  var derivedAttributes = {};
  for (var i=0; i<dateFields.length; i++){
  	var dateField = dateFields[i];
  	derivedAttributes[dateField+"@年"] = function(record){
	  var d = PTool.toDate(record[dateField]);
	  return d.getFullYear();
    };
  	derivedAttributes[dateField+"@月份"] = function(record){
	  var d = PTool.toDate(record[dateField]);
	  return (d.getMonth()+1);
    };
  	derivedAttributes[dateField+"@季度"] = function(record){
	  var d = PTool.toDate(record[dateField]);
	  return PTool.getQuarter(d);
    };
  	derivedAttributes[dateField+"@星期"] = function(record){
	  var d = PTool.toDate(record[dateField]);
	  return d.getDay();
    };
  	derivedAttributes[dateField+"@年/月份"] = function(record){
	  var d = PTool.toDate(record[dateField]);
	  var m = (d.getMonth()+1);
	  if (m<10){
	  	m = "0"+m;
	  }else{
	  	m = ""+m;
	  }
	  return d.getFullYear() + m;
    };
  	derivedAttributes[dateField+"@年/季度"] = function(record){
	  var d = PTool.toDate(record[dateField]);
	  return d.getFullYear() + PTool.getQuarter(d);
    };
  }
  
  default_config = {
  	rendererName: rendererName,
  	aggregatorName: aggregator.name, vals: aggregator.vals,
  	cols: fields.cols, rows: fields.rows
  }
  
  var bulidPivotUIOptions = function(config){
    config = JSON.parse(JSON.stringify(config));
    config.derivers = $.pivotUtilities.derivers;
    config.aggregatorTemplates = $.pivotUtilities.aggregatorTemplates;
    config.renderers = $.extend($.pivotUtilities.renderers, $.pivotUtilities.plotly_renderers);
    
    config.unusedAttrsVertical = true;	//强制未使用列在左侧
    
    config.derivedAttributes = derivedAttributes;
    
  	return config;
  }
  
  var readPivotUIOptions = function(){
    var config = $("#output").data("pivotUIOptions");
    var config_copy = JSON.parse(JSON.stringify(config));
    
    //delete some values which will not serialize to JSON
    delete config_copy["aggregators"];
    delete config_copy["renderers"];
	//delete some bulky default values
    delete config_copy["rendererOptions"];
    delete config_copy["localeStrings"];

    delete config_copy["derivedAttributes"];
    
    return config_copy;
  }
  
  var __ParsedData = null;
  var __RenderAsDefault = false;
  var renderPivotUI_onRefresh = function(_config){
  	if (__RenderAsDefault){	//当使用默认配置时不需要保存当前配置
  		__RenderAsDefault = false;
  		return;
  	}
  	var config_copy = readPivotUIOptions();
    saveAsCurrentConfig(config_copy, function(){});
  }
  var renderPivotUI = function(config, isDefault){
	__RenderAsDefault = isDefault;
    
    var cfg = bulidPivotUIOptions(config);
    cfg.onRefresh = renderPivotUI_onRefresh;
    
  	//完全没有定义 cols 和 rows, 则把所有的列作为 rows
    if ( (!cfg.cols) && (!cfg.rows) ){
	  	if (__ParsedData[0]){
	  		cfg.rows = __ParsedData[0];
	  	}
    }
    
  	$("#output").pivotUI(__ParsedData, cfg, true, "zh");
  }
  //构造文件下载 url, 初始化透视表
  Papa.parse(__Window_Name_Data.fileUrl, {
    download: true,
    skipEmptyLines: true,
    complete: function (parsed) {
      __ParsedData = parsed.data;

      $("#toolbar").show(); $("#toolbar-separator").show();
      
      loadCurrentConfig(function(currentConfig){
      	if (currentConfig){
      		renderPivotUI(currentConfig);
      	}else{
      		renderPivotUI(default_config, true);
      	}
      });
    },
    error: function(_err, _file, _inputElem, reason){
    	var msg = "数据处理错误" + (reason?": "+reason: "")+", 请在表单上重新执行 [透视表] 操作";
    	showError(msg);
    }
  });
  
});
