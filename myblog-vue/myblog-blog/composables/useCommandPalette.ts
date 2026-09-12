/**
 * 命令面板（Cmd / Ctrl + K）开关状态
 *
 * 用 Nuxt 的 useState 而非模块级 ref：
 *   ① 模块级 ref 在 SSR 下会被多个请求共享，可能把「打开」状态泄漏给其他访客；
 *   ② useState 是 per-request 的，且天然在 app.vue 与 Header 之间共享同一份。
 */
export const useCommandPalette = () => {
  const isOpen = useState("command-palette-open", () => false);

  const open = () => {
    isOpen.value = true;
  };
  const close = () => {
    isOpen.value = false;
  };
  const toggle = () => {
    isOpen.value = !isOpen.value;
  };

  return { isOpen, open, close, toggle };
};
