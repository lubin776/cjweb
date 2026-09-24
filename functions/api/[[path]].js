const SOURCES = [
  { key: "feifan", name: "非凡资源", api: "http://ffzy5.tv/api.php/provide/vod" },
  { key: "wolong", name: "卧龙资源", api: "https://wolongzyw.com/api.php/provide/vod" },
  { key: "zuida", name: "最大资源", api: "https://api.zuidapi.com/api.php/provide/vod" }
];

const AD_KEYWORDS = [
  "赌", "彩", "群", "加V", "加v", "兼职", "wx", "WX", "QQ", "qq", 
  "联系", "防失联", "福利", "返利", "发财", "皇冠", "棋牌", "澳门", 
  "TG", "飞机", "t.me", "http", "www"
];

function cleanEpisodes(playUrlStr) {
  if (!playUrlStr) {
    return "";
  }
  
  var groups = playUrlStr.split("$$$");
  var cleanedGroups = [];
  
  for (var g = 0; g < groups.length; g++) {
    var episodes = groups[g].split("#");
    var validEpisodes = [];
    
    for (var e = 0; e < episodes.length; e++) {
      var parts = episodes[e].split("$");
      var epName = "";
      var epUrl = "";
      
      if (parts.length > 0) {
        epName = parts[0];
      }
      if (parts.length > 1) {
        epUrl = parts[1];
      }
      
      var hasAdKeyword = false;
      for (var i = 0; i < AD_KEYWORDS.length; i++) {
        if (epName.indexOf(AD_KEYWORDS[i]) !== -1) {
          hasAdKeyword = true;
          break;
        }
      }
      
      var isInvalidUrl = false;
      if (!epUrl) {
        isInvalidUrl = true;
      } else {
        if (epUrl.indexOf("ads") !== -1) {
          isInvalidUrl = true;
        }
        if (epUrl.indexOf("banner") !== -1) {
          isInvalidUrl = true;
        }
      }
      
      if (!hasAdKeyword) {
        if (!isInvalidUrl) {
          validEpisodes.push(episodes[e]);
        }
      }
    }
    cleanedGroups.push(validEpisodes.join("#"));
  }
  
  var finalGroups = [];
  for (var j = 0; j < cleanedGroups.length; j++) {
    if (cleanedGroups[j].length > 0) {
      finalGroups.push(cleanedGroups[j]);
    }
  }
  return finalGroups.join("$$$");
}

function cleanVod(vod) {
  if (!vod) {
    return vod;
  }
  
  if (vod.vod_play_url) {
    vod.vod_play_url = cleanEpisodes(vod.vod_play_url);
  }

  if (vod.vod_remarks) {
    for (var i = 0; i < AD_KEYWORDS.length; i++) {
      if (vod.vod_remarks.indexOf(AD_KEYWORDS[i]) !== -1) {
        vod.vod_remarks = "高清";
        break;
      }
    }
  }

  return vod;
}

export async function onRequest(context) {
  var request = context.request;
  var url = new URL(request.url);
  var path = url.pathname;
  
  var sourceKey = url.searchParams.get("source");
  if (!sourceKey) {
    sourceKey = "feifan";
  }
  
  var targetApi = SOURCES[0].api;
  for (var i = 0; i < SOURCES.length; i++) {
    if (SOURCES[i].key === sourceKey) {
      targetApi = SOURCES[i].api;
      break;
    }
  }

  if (path.indexOf("/api/sources") !== -1) {
    return new Response(JSON.stringify(SOURCES), {
      headers: { "Content-Type": "application/json;charset=UTF-8", "Access-Control-Allow-Origin": "*" }
    });
  }

  if (path.indexOf("/api/vod") !== -1) {
    var ac = url.searchParams.get("ac");
    if (!ac) { ac = "list"; }
    var pg = url.searchParams.get("pg");
    if (!pg) { pg = "1"; }
    var wd = url.searchParams.get("wd");
    if (!wd) { wd = ""; }
    var t = url.searchParams.get("t");
    if (!t) { t = ""; }
    var ids = url.searchParams.get("ids");
    if (!ids) { ids = ""; }

    var targetUrl = targetApi + "?ac=" + ac + "&pg=" + pg;
    if (wd) { targetUrl = targetUrl + "&wd=" + encodeURIComponent(wd); }
    if (t) { targetUrl = targetUrl + "&t=" + t; }
    if (ids) { targetUrl = targetUrl + "&ids=" + ids; }

    try {
      var response = await fetch(targetUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
      });
      var data = await response.json();

      if (data) {
        if (data.list) {
          if (Array.isArray(data.list)) {
            for (var k = 0; k < data.list.length; k++) {
              data.list[k] = cleanVod(data.list[k]);
            }
          }
        }
      }

      return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json;charset=UTF-8", "Access-Control-Allow-Origin": "*" }
      });
    } catch (err) {
      return new Response(JSON.stringify({ code: 500, msg: err.message }), { 
        status: 500, 
        headers: { "Content-Type": "application/json;charset=UTF-8", "Access-Control-Allow-Origin": "*" } 
      });
    }
  }

  return new Response("API Not Found", { status: 404 });
}
