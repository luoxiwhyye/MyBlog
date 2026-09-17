// ============================================
// composables/useSmartImage.ts - 「推导 WebP 变体 + 失败回退原图」
//
// 后端只为「非 webp/avif 的栅格图」生成 .webp 与 _thumb.webp 两个变体，
// 而且**生成失败是静默的**（Express 未装 sharp / Spring 的 webp-imageio 不可用 /
// 变体文件被删），此时前端推导出来的 URL 会 404 → 图裂。
//
// 所以页面里不要直接绑 getThumbWebpUrl / getWebpUrl，一律用这个组合式：
//
//   const { src, onError } = useSmartImage(() => settingsStore.getSetting("site_logo"));
//   <img v-if="src" :src="src" @error="onError" />
//
// 这是「推导 + 回退」的唯一实现，新页面照抄上面两行即可，不会再漏。
// ============================================

import { computed, ref, toValue } from "vue";
import type { MaybeRefOrGetter } from "vue";
import { getThumbWebpUrl, getWebpUrl, normalizeAssetUrl } from "~/utils/image";

/** thumb = 缩略图（列表 / 头像 / Logo）；full = 主图（详情页大图、hero 卡） */
export type SmartImageVariant = "thumb" | "full";

export const useSmartImage = (
  source: MaybeRefOrGetter<string | undefined>,
  variant: MaybeRefOrGetter<SmartImageVariant> = "thumb",
) => {
  // 哪个 URL 加载失败过 —— 记 URL 而不是记布尔值：
  // 换图（切文章 / 改配置）后失败记录自然失效，不需要再 watch 源做重置。
  // ⚠️ 不要改成「布尔 + watch(source)」：watch 会在 setup 期间**立即**求值源，
  //    而调用方的数据（如 `await useAsyncData` 得到的 article）往往声明在更后面
  //    → `ReferenceError: Cannot access 'article' before initialization`。
  const failedUrl = ref("");

  // 归一化 localhost 前缀（手机 / 局域网访问时浏览器会把 localhost 解析到访客自身）
  const original = computed(() => normalizeAssetUrl(toValue(source)));

  const src = computed(() => {
    const raw = original.value;
    if (!raw || failedUrl.value === raw) {
      return raw;
    }
    // 变体不存在时的兜底：改回原图，不再重试推导
    // （否则 @error → 重设同一个 URL → 反复失败）
    return toValue(variant) === "full" ? getWebpUrl(raw) : getThumbWebpUrl(raw);
  });

  /** 已回退到原图（供调用方挂 class 等） */
  const failed = computed(
    () => !!original.value && failedUrl.value === original.value,
  );

  const onError = () => {
    failedUrl.value = original.value;
  };

  return { src, failed, onError };
};
