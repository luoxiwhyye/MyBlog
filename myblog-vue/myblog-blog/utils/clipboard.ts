/**
 * 剪贴板工具
 *
 * 统一「复制文本」的实现：优先用 `navigator.clipboard`，不可用（非安全上下文 /
 * 旧浏览器）时回退到临时 `textarea` + `execCommand("copy")`。
 *
 * 为什么需要这个工具：项目里原本有两处各写了一遍剪贴板逻辑
 * （`pages/article/[id].vue` 的代码块复制、`composables/useTool.ts` 的工具页复制），
 * 社交链接的「点击复制」若再写一遍就是第三份。这里只做**能力封装**，不负责提示文案——
 * 提示交给调用方（前台统一用 ElMessage）。
 */

/** execCommand 回退路径：临时 textarea 选中后执行 copy */
const copyByExecCommand = (text: string): boolean => {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.top = "-9999px";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.body.removeChild(ta);
  return ok;
};

/**
 * 复制文本到剪贴板。
 * @returns 是否复制成功（失败时由调用方决定如何提示）
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  if (!text) return false;

  // 服务端渲染 / 非浏览器环境直接视为失败
  if (typeof navigator === "undefined" || typeof document === "undefined") {
    return false;
  }

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // 例如用户拒绝授权、页面非聚焦 —— 继续尝试回退方案
    }
  }

  return copyByExecCommand(text);
};
