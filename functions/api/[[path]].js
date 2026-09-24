const SOURCES = [
  { key: "feifan", name: "🍀非凡资源", api: "http://ffzy5.tv/api.php/provide/vod" },
  { key: "wolong", name: "卧龙资源", api: "https://wolongzyw.com/api.php/provide/vod" },
  { key: "zuida", name: "🍀最大资源", api: "https://api.zuidapi.com/api.php/provide/vod" }
];

const AD_KEYWORDS = [
  "赌", "彩", "群", "加V", "加v", "兼职", "wx", "WX", "QQ", "qq", 
  "联系", "防失联", "福利", "返利", "发财", "皇冠", "棋牌", "澳门", 
  "TG", "飞机", "t.me", "http", "www"
];

function cleanEpisodes(playUrlStr) {
  if (!playUrlStr) return "";
  
  const groups = playUrlStr.split('$$$');
  const cleanedGroups = groups.map(group => {
    const episodes = group.split('#');
    const validEpisodes = episodes.filter(ep => {
      const parts = ep.split('$');
      let epName = "";
      let epUrl = "";
      
      if (parts.length > 0) {
        epName = parts[0];
      }
      if (parts.length > 1) {
        epUrl = parts[1];
      }
      
      let hasAdKeyword = false;
      for (let i = 0; i < AD_KEYWORDS.length; i++) {
        if (epName.indexOf(AD_KEYWORDS[i]) !== -1) {
          hasAdKeyword = true;
          break;
        }
      }
      
      const isInvalidUrl = (!epUrl) || (epUrl.indexOf('ads') !== -1) || (epUrl.indexOf('banner') !== -1);

      return (!hasAdKeyword) && (!isInvalidUrl);
    });
    return validEpisodes.join('#');
  });
  
  return cleanedGroups.filter(function(g) { return g.length > 0; }).join('$$$');
}

function cleanVod(vod) {
  if (!vod) return vod;
  
  if (vod.vod_play_url) {
    vod.vod_play_url = cleanEpisodes(vod.vod_play_url);
  }

  if (vod.vod_remarks) {
    for (let i = 0; i < AD_KEYWORDS.length; i++) {
      if (vod.vod_remarks.indexOf(AD_KEYWORDS[i]) !== -1) {
        vod.vod_remarks = "高清";
        break;
      }
    }
  }

  if (vod.vod_content) {
    let sentences = vod.vod_content.split(/[。！？\n]/);
    let cleanSentences = sentences.filter(function(sent) {
      for (let i = 0; i < AD_KEYWORDS.length; i++) {
        if (sent.indexOf(AD_KEYWORDS[i]) !== -1) {
          return false;
        }
      }
      return true;
    });
    vod.vod_content = cleanSentences.join('。');
  }

  return vod;
}

export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);
  const path = url.pathname;
  
  let sourceKey = url.searchParams.get("source");
  if (!sourceKey) {
    sourceKey = "feifan";
  }
  
  let targetApi = SOURCES[0].api;
  for (let i = 0; i < SOURCES.length; i++) {
    if (SOURCES[i].key === sourceKey) {
      targetApi = SOURCES[i].api;
      break;
    }
  }

  if (path.endsWith("/api/sources")) {
    return new Response(JSON.stringify(SOURCES), {
      headers: { "Content-Type": "application/json;charset=UTF-8", "Access-Control-Allow-Origin": "*" }
    });
  }

  if (path.endsWith("/api/image")) {
    const imgUrl = url.searchParams.get("url");
    if (!imgUrl) return new Response("Missing url", { status: 400 });
    try {
      const imgRes = await fetch(imgUrl, {
        headers: { "User-Agent": "Mozilla/5.0", "Referer": new URL(imgUrl).origin }
      });
      return new Response(imgRes.body, {
        headers: { "Content-Type": imgRes.headers.get("Content-Type") || "image/jpeg", "Access-Control-Allow-Origin": "*" }
      });
    } catch (e) {
      return new Response("Image load failed", { status: 500 });
    }
  }

  if (path.endsWith("/api/vod")) {
    let ac = url.searchParams.get("ac");
    if (!ac) ac = "list";
    let pg = url.searchParams.get("pg");
    if (!pg) pg = "1";
    let wd = url.searchParams.get("wd");
    if (!wd) wd = "";
    let t = url.searchParams.get("t");
    if (!t) t = "";
    let ids = url.searchParams.get("ids");
    if (!ids) ids = "";

    let targetUrl = targetApi + "?ac=" + ac + "&pg=" + pg;
    if (wd) targetUrl = targetUrl + "&wd=" + encodeURIComponent(wd);
    if (t) targetUrl = targetUrl + "&t=" + t;
    if (ids) targetUrl = targetUrl + "&ids=" + ids;

    try {
      const response = await fetch(targetUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
      });
      let data = await response.json();

      if (data && data.list && Array.isArray(data.list)) {
        data.list = data.list.map(function(vod) {
          return cleanVod(vod);
        });
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
