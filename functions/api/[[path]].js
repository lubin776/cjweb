// 你的默认影视采集接口
const SOURCES = [
  { key: "feifan", name: "🍀非凡资源", api: "http://ffzy5.tv/api.php/provide/vod" },
  { key: "wolong", name: "卧龙资源", api: "https://wolongzyw.com/api.php/provide/vod" },
  { key: "zuida", name: "🍀最大资源", api: "https://api.zuidapi.com/api.php/provide/vod" }
];

// 去广告黑名单关键词（可按需自行增减）
const AD_KEYWORDS = [
  "赌", "彩", "群", "加V", "加v", "兼职", "wx", "WX", "QQ", "qq", 
  "联系", "防失联", "福利", "返利", "发财", "皇冠", "棋牌", "澳门", 
  "TG", "飞机", "t.me", "h.b", "http", "www"
];

// 过滤剧集列表中的广告分集
function cleanEpisodes(playUrlStr) {
  if (!playUrlStr) return "";
  
  // 苹果CMS格式通常是: 剧集名$URL#剧集名$URL$$$剧集名2$URL2   const groups = playUrlStr.split('$$$');
  const cleanedGroups = groups.map(group => {
    const episodes = group.split('#');
    const validEpisodes = episodes.filter(ep => {
      const parts = ep.split('$');       const epName = parts[0] \vert{}\vert{} "";       const epUrl = parts[1] \vert{}\vert{} "";              // 1. 检查剧集名称是否包含广告关键词       const hasAdKeyword = AD_KEYWORDS.some(keyword => epName.includes(keyword));       // 2. 检查播放链接是否异常（比如带非视频后缀或垃圾链接）       const isInvalidUrl = !epUrl \vert{}\vert{} epUrl.includes('ads') \vert{}\vert{} epUrl.includes('banner');        return !hasAdKeyword && !isInvalidUrl;     });     return validEpisodes.join('#');   });      return cleanedGroups.filter(g => g.length > 0).join('$$$');
}

// 清洗单条影片数据（简介、备注、名称等）
function cleanVod(vod) {
  if (!vod) return vod;
  
  // 清洗播放地址
  if (vod.vod_play_url) {
    vod.vod_play_url = cleanEpisodes(vod.vod_play_url);
  }

  // 清洗备注中的垃圾广告信息 (如 vod_remarks 里的 “加群送XXX”)
  if (vod.vod_remarks) {
    AD_KEYWORDS.forEach(kw => {
      if (vod.vod_remarks.includes(kw)) {
        vod.vod_remarks = "高清"; // 替换为安全默认值
      }
    });
  }

  // 清洗简介中的广告段落
  if (vod.vod_content) {
    // 简单剥离包含广告关键词的句子
    let sentences = vod.vod_content.split(/[。！？\n]/);
    let cleanSentences = sentences.filter(sent => {
      return !AD_KEYWORDS.some(kw => sent.includes(kw));
    });
    vod.vod_content = cleanSentences.join('。');
  }

  return vod;
}

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  
  const sourceKey = url.searchParams.get("source") || "feifan";
  const targetApi = SOURCES.find(s => s.key === sourceKey)?.api || SOURCES[0].api;

  // 1. 获取源配置列表
  if (path.endsWith("/api/sources")) {
    return new Response(JSON.stringify(SOURCES), {
      headers: { "Content-Type": "application/json;charset=UTF-8", "Access-Control-Allow-Origin": "*" }
    });
  }

  // 2. 图片防盗链代理
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

  // 3. 影视资源接口代理 (自动去广告清洗)
  if (path.endsWith("/api/vod")) {
    const ac = url.searchParams.get("ac") || "list";
    const pg = url.searchParams.get("pg") || "1";
    const wd = url.searchParams.get("wd") || "";
    const t = url.searchParams.get("t") || "";
    const ids = url.searchParams.get("ids") || "";

    let targetUrl = `${targetApi}?ac=${ac}&pg=${pg}`;
    if (wd) targetUrl += `&wd=${encodeURIComponent(wd)}`;
    if (t) targetUrl += `&t=${t}`;
    if (ids) targetUrl += `&ids=${ids}`;

    try {
      const response = await fetch(targetUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
      });
      let data = await response.json();

      // 执行去广告过滤清洗
      if (data && data.list && Array.isArray(data.list)) {
        data.list = data.list.map(vod => cleanVod(vod));
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
