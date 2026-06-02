import { getQuery, getRouterParam, proxyRequest } from "h3";

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
  return proxyRequest(event, target);
});
