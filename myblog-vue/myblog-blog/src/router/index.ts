import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "Home",
      component: () => import("@/views/Home.vue"),
    },
    {
      path: "/article/:id",
      name: "ArticleDetail",
      component: () => import("@/views/article/ArticleDetail.vue"),
    },
    {
      path: "/category",
      name: "Category",
      component: () => import("@/views/Category.vue"),
    },
    {
      path: "/category/:id",
      name: "CategoryDetail",
      component: () => import("@/views/CategoryDetail.vue"),
    },
    {
      path: "/tag",
      name: "Tag",
      component: () => import("@/views/Tag.vue"),
    },
    {
      path: "/tag/:id",
      name: "TagDetail",
      component: () => import("@/views/TagDetail.vue"),
    },
    {
      path: "/archive",
      name: "Archive",
      component: () => import("@/views/Archive.vue"),
    },
    {
      path: "/about",
      name: "About",
      component: () => import("@/views/About.vue"),
    },
    {
      path: "/search",
      name: "Search",
      component: () => import("@/views/Search.vue"),
    },
  ],
});

export default router;
