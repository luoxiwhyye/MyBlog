// ============================================
// utils/tools/qr.ts - 二维码生成（纯前端）
// 使用 qrcode 库，输出 SVG 字符串（不依赖 canvas/DOM，
// 可在 Web Worker 中运行）。
// ============================================
import QRCode from "qrcode";

/**
 * 生成二维码 SVG 字符串。
 * @param content 二维码内容
 * @param size 拟显示尺寸（用于 width/height 属性，px）
 */
export const generateQrSvg = (content: string, size = 256): Promise<string> => {
  if (!content.trim()) {
    return Promise.reject(new Error("请输入二维码内容。"));
  }
  return QRCode.toString(content, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 2,
    width: size,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });
};
