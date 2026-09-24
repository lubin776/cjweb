const SOURCES = [
  { key: "feifan", name: "非凡资源", api: "https://ffzy5.tv/api.php/provide/vod" },
  { key: "wolong", name: "卧龙资源", api: "https://wolongzyw.com/api.php/provide/vod" },
  { key: "zuida", name: "最大资源", api: "https://api.zuidapi.com/api.php/provide/vod" }
];

// ... cleanEpisodes / cleanVod 不变 ...

export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);
  const path = url.pathname;

  const sourceKey = url.searchParams.get("source") || "feifan";
  let targetApi = SOURCES[0].api;
  for (const s of SOURCES) {
    if (s.key === sourceKey) { targetApi = s.api; break; }
  }

  if (path.includes("/api/sources")) {
    return new Response(JSON.stringify(SOURCES), {
      headers: { "Content-Type": "application/json;charset=UTF-8", "Access-Control-Allow-Origin": "*" }
    });
  }

  if (path.includes("/api/vod")) {
    const ac = url.searchParams.get("ac") || "list";
    const pg = url.searchParams.get("pg") || "1";
    const wd = url.searchParams.get("wd") || "";
    const t  = url.searchParams.get("t")  || "";
    const ids = url.searchParams.get("ids") || "";

    let targetUrl = `${targetApi}?ac=${ac}&pg=${pg}&at=json`;
    if (wd) targetUrl += `&wd=${encodeURIComponent(wd)}`;
    if (t)  targetUrl += `&t=${t}`;
    if (ids) targetUrl += `&ids=${ids}`;

    try {
      const response = await fetch(targetUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
      });
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); }
      catch { return jsonResp({ code: 500, msg: "上游返回非 JSON" }, 500); }

      if (data && Array.isArray(data.list)) {
        data.list = data.list.map(cleanVod);
      }
      return jsonResp(data);
    } catch (err) {
      return jsonResp({ code: 500, msg: err.message }, 500);
    }
  }

  return new Response("API Not Found", { status: 404 });
}

function jsonResp(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json;charset=UTF-8", "Access-Control-Allow-Origin": "*" }
  });
}