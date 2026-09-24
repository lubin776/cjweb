// 预设的 TVBox 采集接口
const SOURCES = [
  { key: "feifan", name: "🍀非凡资源", api: "http://ffzy5.tv/api.php/provide/vod" },
  { key: "wolong", name: "卧龙资源", api: "https://wolongzyw.com/api.php/provide/vod" },
  { key: "zuida", name: "🍀最大资源", api: "https://api.zuidapi.com/api.php/provide/vod" }
];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const sourceKey = url.searchParams.get("source") || "feifan";
    const targetApi = SOURCES.find(s => s.key === sourceKey)?.api || SOURCES[0].api;

    // 1. 获取源列表 / 分类数据
    if (path === "/api/vod") {
      const ac = url.searchParams.get("ac") || "list";
      const pg = url.searchParams.get("pg") || "1";
      const wd = url.searchParams.get("wd") || "";
      const t = url.searchParams.get("t") || "";

      let targetUrl = `${targetApi}?ac=${ac}&pg=${pg}`;
      if (wd) targetUrl += `&wd=${encodeURIComponent(wd)}`;
      if (t) targetUrl += `&t=${t}`;

      try {
        const response = await fetch(targetUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
        });
        const data = await response.json();
        return new Response(JSON.stringify(data), {
          headers: { "Content-Type": "application/json;charset=UTF-8", "Access-Control-Allow-Origin": "*" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ code: 500, msg: err.message }), { status: 500, headers: { "Access-Control-Allow-Origin": "*" } });
      }
    }

    // 2. 获取可用源配置
    if (path === "/api/sources") {
      return new Response(JSON.stringify(SOURCES), {
        headers: { "Content-Type": "application/json;charset=UTF-8", "Access-Control-Allow-Origin": "*" }
      });
    }

    // 3. 图片防盗链代理（部分采集站图片直接加载会403）
    if (path === "/api/image") {
      const imgUrl = url.searchParams.get("url");
      if (!imgUrl) return new Response("Missing url", { status: 400 });
      const imgRes = await fetch(imgUrl, {
        headers: { "User-Agent": "Mozilla/5.0", "Referer": new URL(imgUrl).origin }
      });
      return new Response(imgRes.body, {
        headers: { "Content-Type": imgRes.headers.get("Content-Type") || "image/jpeg", "Access-Control-Allow-Origin": "*" }
      });
    }

    return new Response("Not Found", { status: 404 });
  }
};
