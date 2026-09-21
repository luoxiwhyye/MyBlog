import { describe, it, expect } from "vitest";
import { buildPoliceIcpUrl, POLICE_QUERY_URL } from "./policeIcp";

describe("policeIcp 工具", () => {
  describe("buildPoliceIcpUrl", () => {
    it("从完整备案号里提取编码，拼出带 code 的查询地址", () => {
      expect(buildPoliceIcpUrl("粤公网安备44030002000000号")).toBe(
        `${POLICE_QUERY_URL}?code=44030002000000`,
      );
    });

    it("容忍空格、括号等书写差异", () => {
      expect(buildPoliceIcpUrl("京公网安备 11010502030000 号")).toBe(
        `${POLICE_QUERY_URL}?code=11010502030000`,
      );
      expect(buildPoliceIcpUrl("（粤）公网安备44030002000000号")).toBe(
        `${POLICE_QUERY_URL}?code=44030002000000`,
      );
    });

    it("只填编码本身同样可用", () => {
      expect(buildPoliceIcpUrl("44030002000000")).toBe(
        `${POLICE_QUERY_URL}?code=44030002000000`,
      );
    });

    it("空值或提取不到编码时退回查询首页", () => {
      expect(buildPoliceIcpUrl("")).toBe(POLICE_QUERY_URL);
      expect(buildPoliceIcpUrl(undefined)).toBe(POLICE_QUERY_URL);
      expect(buildPoliceIcpUrl(null)).toBe(POLICE_QUERY_URL);
      expect(buildPoliceIcpUrl("粤公网安备号")).toBe(POLICE_QUERY_URL);
    });

    it("过短的数字不被当作编码", () => {
      expect(buildPoliceIcpUrl("2026 年备案")).toBe(POLICE_QUERY_URL);
    });
  });
});
