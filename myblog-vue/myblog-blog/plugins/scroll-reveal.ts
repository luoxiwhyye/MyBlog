// ============================================
// plugins/scroll-reveal.ts
// 滚动入场动效 v-reveal 指令
// 注册为「全端」插件：SSR 端需要能解析到指令（提供 getSSRProps 避免报错），
// 但实际 DOM / IntersectionObserver 逻辑只在客户端钩子（mounted）里执行。
// 设计原则：
//   - 渐进增强：SSR / 无 JS 时元素按正常状态渲染（不预置隐藏），
//     避免 SEO 内容缺失、水合闪烁与无 JS 场景空白。
//   - 尊重 prefers-reduced-motion：系统要求减少动效时直接显示，不做 reveal。
//   - Vue 指令的 mounted 只会在客户端触发，因此这里的 DOM 操作天然安全。
// 用法：
//   <div v-reveal>            普通滚动入场
//   <div v-reveal="120">      带 120ms 延迟（用于列表 stagger）
// ============================================

export default defineNuxtPlugin((nuxtApp) => {
  const prefersReducedMotion = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const isInViewport = (el: HTMLElement): boolean => {
    const rect = el.getBoundingClientRect();
    return (
      rect.top < window.innerHeight + 40 &&
      rect.bottom > -40 &&
      rect.width > 0 &&
      rect.height > 0
    );
  };

  const reveal = (el: HTMLElement) => {
    el.classList.add("reveal-in");
  };

  nuxtApp.vueApp.directive("reveal", {
    // SSR 渲染时只需返回空 props，确保不因缺失该方法而报 500
    getSSRProps: () => ({}),
    mounted(el: HTMLElement, binding) {
      // 系统要求减少动效：直接保持可见，不做入场动画
      if (prefersReducedMotion()) {
        return;
      }

      const hasIO = typeof IntersectionObserver !== "undefined";

      // 已经在视口内的元素：直接显示，避免"先消失再出现"的闪烁
      if (isInViewport(el)) {
        return;
      }

      // 视口之外的元素：先隐藏，进入视口再加可见类（带动画）
      const delay = typeof binding.value === "number" ? binding.value : 0;
      el.classList.add("reveal");
      if (delay > 0) {
        el.style.transitionDelay = `${delay}ms`;
      }

      let revealed = false;
      const doReveal = () => {
        if (revealed) return;
        revealed = true;
        reveal(el);
        cleanup();
      };

      const cleanup = () => {
        const obs = (
          el as HTMLElement & {
            __revealObserver?: IntersectionObserver;
            __revealScroll?: () => void;
          }
        ).__revealObserver;
        if (obs) obs.disconnect();
        const scroll = (el as HTMLElement & { __revealScroll?: () => void })
          .__revealScroll;
        if (scroll) {
          window.removeEventListener("scroll", scroll);
          window.removeEventListener("resize", scroll);
        }
        (
          el as HTMLElement & { __revealObserver?: undefined }
        ).__revealObserver = undefined;
        (el as HTMLElement & { __revealScroll?: undefined }).__revealScroll =
          undefined;
      };

      // 兜底：IntersectionObserver 不可用（或投递异常）时，用滚动/resize 判断，
      // 确保内容绝不会因动效而永久隐藏。
      const scrollFallback = () => {
        if (!hasIO || isInViewport(el)) {
          doReveal();
        }
      };

      if (hasIO) {
        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                doReveal();
              }
            });
          },
          // 元素可见 8% 或距视口底部 40px 即触发，兼顾长列表与提前感受
          { threshold: 0.08, rootMargin: "0px 0px -40px 0px" },
        );
        observer.observe(el);
        (
          el as HTMLElement & { __revealObserver?: IntersectionObserver }
        ).__revealObserver = observer;
      }

      // 始终保留滚动/resize 兜底，增强健壮性（IO 正常时 by isInViewport 不会重复 reveal）
      const onScroll = () => scrollFallback();
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll, { passive: true });
      (el as HTMLElement & { __revealScroll?: () => void }).__revealScroll =
        onScroll;

      // 初始判断一次，避免 scroll 恰好未再触发
      scrollFallback();
    },
    unmounted(el) {
      const obs = (
        el as HTMLElement & {
          __revealObserver?: IntersectionObserver;
        }
      ).__revealObserver;
      if (obs) obs.disconnect();
      const scroll = (el as HTMLElement & { __revealScroll?: () => void })
        .__revealScroll;
      if (scroll) {
        window.removeEventListener("scroll", scroll);
        window.removeEventListener("resize", scroll);
      }
    },
  });
});
