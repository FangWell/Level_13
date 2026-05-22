/*

 @name    : 锅巴汉化 - Web汉化插件
 @author  : 麦子、JAR、小蓝、好阳光的小锅巴
 @version : V0.6.1 - 2019-07-09
 @website : http://www.g8hh.com
 @idle games : http://www.gityx.com
 @QQ Group : 627141737

*/

var CNITEM_DEBUG = (function () {
    try {
        var search = new URLSearchParams(window.location.search || "");
        var queryVal = search.get("cnDebug");
        if (queryVal !== null) {
            return queryVal === "1" || queryVal === "true";
        }
        var storedVal = window.localStorage ? window.localStorage.getItem("cnDebug") : null;
        if (storedVal !== null) {
            return storedVal === "1" || storedVal === "true";
        }
    } catch (e) {
        // ignore
    }
    return 0;
})();
function cnItemByTag(text, itemgroup, node, textori){
	for (let i in itemgroup){
		if (i[0] == '.') { //匹配节点及其父节点的class
			let current_node = node;
			while (current_node){
				if ( current_node.classList && current_node.classList.contains(i.substr(1)) ){
					return itemgroup[i];
				}
				else if( current_node.parentElement && current_node.parentElement != document.documentElement ) {
					current_node = current_node.parentElement;
				}
				else {
					break;
				}
			}
		}
		else if (i[0] == '#'){ //匹配节点及其父节点的id
			let current_node = node;
			while (current_node){
				if ( current_node.id == i.substr(1) ){
					return itemgroup[i];
				}
				else if( current_node.parentElement && current_node.parentElement != document.documentElement ) {
					current_node = current_node.parentElement;
				}
				else {
					break;
				}
			}
		}
		else if (i[0] == '$'){	//执行document.querySelector
			if (document.querySelector(i.substr(1)) != null){
				return itemgroup[i];
			}
		}
		else if (i[0] == '*'){	//搜索原始文本
			if ( textori.includes(i.substr(1)) ){
				return itemgroup[i];
			}
		}
		// and more ...
		else{
			CNITEM_DEBUG && console.log({text, itemgroup, dsc:"不识别的标签" + i})
		}
	}
	return null;
}

//2.采集新词
//20190320@JAR  rewrite by 麦子
var cnItem = function (text, node) {

    if (typeof (text) != "string")
        return text;
	let textori = text;
    //剥离首尾空白（空格/制表符/换行等），最后拼回，避免空白导致字典/正则匹配失败
    let leading_ws = "";
    let trailing_ws = "";
    {
        let m = text.match(/^(\s+)([\s\S]*?)(\s*)$/);
        if (m) {
            leading_ws = m[1];
            trailing_ws = m[3];
            text = m[2];
        } else {
            let m2 = text.match(/^([\s\S]*?)(\s+)$/);
            if (m2) {
                trailing_ws = m2[2];
                text = m2[1];
            }
        }
    }
    //处理前缀
    let text_prefix = leading_ws;
    for (let prefix in cnPrefix) {
        if (text.substr(0, prefix.length) === prefix) {
            text_prefix += cnPrefix[prefix];
            text = text.substr(prefix.length);
        }
    }
    //处理后缀
    let text_postfix = "";
    for (let postfix in cnPostfix) {
        if (text.substr(-postfix.length) === postfix) {
            text_postfix = cnPostfix[postfix] + text_postfix;
            text = text.substr(0, text.length - postfix.length);
        }
    }
    //处理正则后缀
    let text_reg_exclude_postfix = "";
    for (let reg of cnExcludePostfix) {
        let result = text.match(reg);
        if (result) {
            text_reg_exclude_postfix = result[0] + text_reg_exclude_postfix;
            text = text.substr(0, text.length - result[0].length);
        }
    }
    // 把剥离的尾部空白追加回去
    text_reg_exclude_postfix = text_reg_exclude_postfix + trailing_ws;

    //检验字典是否可存
    if (!cnItems._OTHER_) cnItems._OTHER_ = [];

    //检查是否排除
    for (let reg of cnExcludeWhole) {
        if (reg.test(text)) {
            return text_prefix + text + text_reg_exclude_postfix + text_postfix;;
        }
    }

    //尝试正则替换
    for (let [key, value] of cnRegReplace.entries()) {
        if (key.test(text)) {
            return text_prefix + text.replace(key, value) + text_reg_exclude_postfix + text_postfix;
        }
    }

    //遍历尝试匹配（也尝试首字母小写版本，兼容 Text.capitalize() 的大写首字母）
    const textUncap = text.length > 0 ? text[0].toLowerCase() + text.slice(1) : text;
    for (let i in cnItems) {
        //字典已有词汇或译文、且译文不为空，则返回译文
        if (typeof(cnItems[i]) == "string" && (text == i || text == cnItems[i] || textUncap == i)){
			return text_prefix + cnItems[i] + text_reg_exclude_postfix + text_postfix;
		} else if ( typeof(cnItems[i]) == "object" && (text == i || textUncap == i) ){
			let result = cnItemByTag(i, cnItems[i], node, textori);
			if (result != null){
				return text_prefix + result + text_reg_exclude_postfix + text_postfix;
			} else {
				CNITEM_DEBUG && console.log({text:i, cnitem:cnItems[i], node});
			}
		} else {
            // continue;
        }
    }

    //已含中文则无需汉化，直接返回，不计入生词表
    if (/[\u4e00-\u9fff]/.test(textori)) {
        return text_prefix + text + text_reg_exclude_postfix + text_postfix;
    }

    //调整收录的词条：0=收录原文（完整上下文），1=收录去除前后缀的文本
    let save_cfg = 0;
    let save_text = (save_cfg ? text : textori).trim();
    // 首字母还原小写，使 Text.capitalize() 产生的大写变体与原文合并为同一条目
    if (save_text.length > 0) save_text = save_text[0].toLowerCase() + save_text.slice(1);
    //遍历生词表是否收录
    for (
        let i = 0; i < cnItems._OTHER_.length; i++
    ) {
        //已收录则直接返回
        if (save_text == cnItems._OTHER_[i])
            return text_prefix + text + text_reg_exclude_postfix + text_postfix;
    }

    if (cnItems._OTHER_.length < 1000) {
        //未收录则保存
        cnItems._OTHER_.push(save_text);
        cnItems._OTHER_.sort(
            function (a, b) {
                return a.localeCompare(b)
            }
        );
    }

    //开启生词打印
        CNITEM_DEBUG && console.log(
            '有需要汉化的英文：', text
        );

    //返回生词字串
    return text_prefix + text + text_reg_exclude_postfix + text_postfix;
};

var cnDebug = {
    setEnabled: function (enabled) {
        CNITEM_DEBUG = !!enabled;
        try {
            if (window.localStorage) {
                window.localStorage.setItem("cnDebug", CNITEM_DEBUG ? "1" : "0");
            }
        } catch (e) {
            // ignore
        }
        return CNITEM_DEBUG;
    },
    getEnabled: function () {
        return !!CNITEM_DEBUG;
    },
    getOtherTerms: function () {
        if (!cnItems || !cnItems._OTHER_) return [];
        return cnItems._OTHER_.slice(0);
    },
    clearOtherTerms: function () {
        if (!cnItems) return 0;
        cnItems._OTHER_ = [];
        return 0;
    },
    exportOtherTermsJson: function () {
        var list = this.getOtherTerms();
        return JSON.stringify(list, null, 2);
    },
    copyOtherTermsJson: function () {
        var content = this.exportOtherTermsJson();
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(content);
            return true;
        }
        return false;
    }
};

window.cnDebug = cnDebug;

transTaskMgr = {
    tasks: [],
    addTask: function (node, attr, text) {
        this.tasks.push({
            node,
            attr,
            text
        })
    },
    doTask: function () {
        let task = null;
        while (task = this.tasks.pop())
            task.node[task.attr] = task.text;
    },
}

function TransSubTextNode(node) {
    if (node.childNodes.length > 0) {
        for (let subnode of node.childNodes) {
            if (subnode.nodeName === "#text") {
                let text = subnode.textContent;
                let cnText = cnItem(text, subnode);
                cnText !== text && transTaskMgr.addTask(subnode, 'textContent', cnText);
                //console.log(subnode);
            } else if (subnode.nodeName !== "SCRIPT" && subnode.nodeName !== "STYLE" && subnode.nodeName !== "TEXTAREA") {
                if (!subnode.childNodes || subnode.childNodes.length == 0) {
                    let text = subnode.innerText;
                    let cnText = cnItem(text, subnode);
                    cnText !== text && transTaskMgr.addTask(subnode, 'innerText', cnText);
                    //console.log(subnode);
                } else {
                    TransSubTextNode(subnode);
                }
            } else {
                // do nothing;
            }
        }
    }
}

! function () {
    console.log("加载汉化模块");
        if (CNITEM_DEBUG) {
		console.log("汉化调试已开启。可用命令：cnDebug.getOtherTerms() / cnDebug.exportOtherTermsJson() / cnDebug.clearOtherTerms() / cnDebug.setEnabled(false)");
	}

    let observer_config = {
        attributes: false,
        characterData: true,
        childList: true,
        subtree: true
    };
    let targetNode = document.body;
    //汉化静态页面内容
    TransSubTextNode(targetNode);
    transTaskMgr.doTask();
    //监听页面变化并汉化动态内容
    let observer = new MutationObserver(function (e) {
        //window.beforeTransTime = performance.now();
        observer.disconnect();
        for (let mutation of e) {
            if (mutation.target.nodeName === "SCRIPT"|| mutation.target.nodeName === "STYLE" || mutation.target.nodeName === "TEXTAREA") continue;
			if (mutation.target.nodeName === "#text") {
                mutation.target.textContent = cnItem(mutation.target.textContent, mutation.target);
            } else if (!mutation.target.childNodes || mutation.target.childNodes.length == 0) {
                mutation.target.innerText = cnItem(mutation.target.innerText, mutation.target);
            } else if (mutation.addedNodes.length > 0) {
                for (let node of mutation.addedNodes) {
                    if (node.nodeName === "#text") {
                        node.textContent = cnItem(node.textContent, node);
                        //console.log(node);
                    } else if (node.nodeName !== "SCRIPT" && node.nodeName !== "STYLE" && node.nodeName !== "TEXTAREA") {
                        if (!node.childNodes || node.childNodes.length == 0) {
							if (node.innerText)
								node.innerText = cnItem(node.innerText, node);
                        } else {
                            TransSubTextNode(node);
                            transTaskMgr.doTask();
                        }
                    }
                }
            }
        }
        observer.observe(targetNode, observer_config);
        //window.afterTransTime = performance.now();
        //console.log("捕获到页面变化并执行汉化，耗时" + (afterTransTime - beforeTransTime) + "毫秒");
    });
    observer.observe(targetNode, observer_config);
}();
