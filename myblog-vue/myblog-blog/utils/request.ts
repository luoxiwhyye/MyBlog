type RequestOptions = {
  params?: Record<string, string | number | boolean | undefined>;
};

const baseOptions = {
  baseURL: "/api/v1",
  timeout: 10000,
};

const request = {
  get: <T>(url: string, options?: RequestOptions) =>
    $fetch<T>(url, {
      ...baseOptions,
      query: options?.params,
    }),

  post: <T>(url: string, body?: unknown) =>
    $fetch<T>(url, {
      ...baseOptions,
      method: "POST",
      body,
    }),
};

export default request;
