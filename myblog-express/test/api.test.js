import { describe, it, expect } from "vitest";
import request from "supertest";

const BASE = process.env.TEST_API_BASE || "http://localhost:3000";
const api = request(BASE);

describe("API 健康检查", () => {
  it("GET /health 返回 ok", async () => {
    const res = await api.get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

describe("公开接口", () => {
  it("GET /api/v1/settings 返回配置数据", async () => {
    const res = await api.get("/api/v1/settings");
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data).toBeTypeOf("object");
  });

  it("GET /api/v1/articles 返回文章列表", async () => {
    const res = await api.get(
      "/api/v1/articles?status=published&page=1&pageSize=10",
    );
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("list");
    expect(res.body.data).toHaveProperty("total");
  });
});

describe("认证接口", () => {
  it("POST /api/v1/blogger/login 缺少凭据返回 400", async () => {
    const res = await api.post("/api/v1/blogger/login").send({});
    expect(res.status).toBe(400);
  });
});
