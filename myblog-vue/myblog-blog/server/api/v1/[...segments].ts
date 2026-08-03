import {
  getQuery,
  getRequestHeaders,
  getRequestIP,
  getRouterParam,
  proxyRequest,
} from "h3";

export default defineEventHandler((event) => {
  const runtimeConfig = useRuntimeConfig();
  const segments = getRouterParam(event, "segments") || "";
  const query = getQuery(event);
  const searchParams = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => searchParams.append(key, String(item)));
      return;
    }

    if (value !== undefined) {
      searchParams.append(key, String(value));
    }
  });

  const baseUrl = runtimeConfig.apiBase.replace(/\/$/, "");
  const target = `${baseUrl}/${segments}${searchParams.size ? `?${searchParams.toString()}` : ""}`;

  // 透传真实客户端 IP（含 SSR 场景），供后端按访客独立限流，避免共享 127.0.0.1 配额
  const headers = getRequestHeaders(event);
  const clientIp =
    getRequestIP(event, { xForwardedFor: true }) ||
    headers["x-forwarded-for"] ||
    event.node.req.socket.remoteAddress;

  if (clientIp) {
    headers["x-forwarded-for"] = clientIp;
  }

  return proxyRequest(event, target, { headers });
});
