import { describe, it, expect } from "vitest";
import { parseJwt } from "./jwt";
import { generatePassword } from "./password";
import { diffJson, diffToText } from "./diff";
import { parseCron } from "./cron";
import { generateQrSvg } from "./qr";

const sampleJwt =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

describe("jwt", () => {
  it("解析 header/payload（base64url）", async () => {
    const result = await parseJwt(sampleJwt);
    expect(result.header.alg).toBe("HS256");
    expect(result.header.typ).toBe("JWT");
    expect(result.payload.name).toBe("John Doe");
    expect(result.payload.sub).toBe("1234567890");
  });

  it("HMAC 签名校验（正确密钥通过）", async () => {
    const result = await parseJwt(sampleJwt, "your-256-bit-secret");
    expect(result.signatureValid).toBe(true);
    expect(result.signatureMessage).toContain("有效");
  });

  it("HMAC 签名校验（错误密钥失败）", async () => {
    const result = await parseJwt(sampleJwt, "wrong-secret");
    expect(result.signatureValid).toBe(false);
  });

  it("非法 JWT 抛错", async () => {
    await expect(parseJwt("not-a-jwt")).rejects.toThrow();
  });
});

describe("password", () => {
  it("生成指定长度密码", () => {
    const password = generatePassword({
      length: 16,
      upper: true,
      lower: true,
      number: true,
      symbol: true,
    });
    expect(password.length).toBe(16);
  });

  it("无字符集抛错", () => {
    expect(() =>
      generatePassword({
        length: 8,
        upper: false,
        lower: false,
        number: false,
        symbol: false,
      }),
    ).toThrow();
  });

  it("仅数字则全为数字", () => {
    const password = generatePassword({
      length: 10,
      upper: false,
      lower: false,
      number: true,
      symbol: false,
    });
    expect(password).toMatch(/^\d+$/);
  });
});

describe("diff", () => {
  it("比较两个 JSON 差异", () => {
    const lines = diffJson('{"name":"A","count":1}', '{"name":"B","count":2}');
    expect(lines.some((l) => l.type === "remove" && l.text.includes("A"))).toBe(
      true,
    );
    expect(lines.some((l) => l.type === "add" && l.text.includes("B"))).toBe(
      true,
    );
  });

  it("相同 JSON 无差异", () => {
    const lines = diffJson('{"a":1}', '{"a":1}');
    expect(lines.filter((l) => l.type !== "context")).toHaveLength(0);
  });

  it("非法 JSON 抛错", () => {
    expect(() => diffJson("{bad", '{"a":1}')).toThrow();
  });

  it("diffToText 输出 +/-/空格前缀", () => {
    const lines = diffJson('{"a":1}', '{"a":2}');
    const text = diffToText(lines);
    expect(text).toContain("+");
    expect(text).toContain("-");
  });
});

describe("cron", () => {
  it("解析 5 段表达式并计算下次执行", () => {
    const result = parseCron("0 */5 * * *", 3);
    expect(result.nextRunTimes).toHaveLength(3);
    expect(result.expression).toBe("0 */5 * * *");
  });

  it("非法段数抛错", () => {
    expect(() => parseCron("* * *", 3)).toThrow();
  });
});

describe("qr", () => {
  it("生成二维码 SVG", async () => {
    const svg = await generateQrSvg("https://example.com", 256);
    expect(svg).toContain("<svg");
    expect(svg).toContain("xmlns");
  });

  it("空内容抛错", async () => {
    await expect(generateQrSvg("   ", 256)).rejects.toThrow();
  });
});
