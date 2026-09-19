/**
 * 功能开关（setting 键 `enable_*`）的唯一判定实现。
 *
 * 语义：只有**显式**配置为字符串 "false" 才算关闭 —— 键不存在、值为空串、
 * 或后台表单未提交该键时都保持开启，避免「配置读不到 = 功能静默消失」。
 *
 * 使用场景：导航项过滤（Header / CommandPalette）、页面内引导区块（关于页 CTA）、
 * 以及由页面自己渲染的关闭提示（`FeatureDisabled`）。
 */
export const useFeatureFlags = () => {
  const settingsStore = useSettingsStore();

  const isEnabled = (key: string) => settingsStore.getSetting(key) !== "false";

  return { isEnabled };
};
