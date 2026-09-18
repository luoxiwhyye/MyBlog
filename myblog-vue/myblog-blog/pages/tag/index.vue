<template>
  <div class="tag">
    <PageHeader
      :title="t('tag.title')"
      :description="t('tag.description')"
    />
    <div v-if="pending" class="loading">
      <el-icon class="is-loading">
        <Loading />
      </el-icon>
      {{ t('archive.loading') }}
    </div>
    <EmptyState
      v-else-if="tags.length === 0"
      :message="t('tag.empty')"
      :description="t('tag.emptyDesc')"
      :action-text="t('notFound.backHome')"
      action-to="/home"
    />
    <div v-else class="tags-cloud">
      <!-- 胶囊一律<NuxtLink>而不是 span + @click —— 标签云是导航，链接才能中键打开 /
           新窗口打开 / 被爬虫跟随（原先 span 两者都做不到）。
           权重只由条目右侧的计数表达，不再用字号分级：实测 27 个标签分布在
           5 / 3 / 2 / 1 篇四档，21 个（78%）落在最小档，字号分级在这种分布下
           会把「权重」表达成一个几乎不变的常量（实测卡片高度 35~36px 全等）。 -->
      <NuxtLink
        v-for="(tag, i) in tags"
        :key="tag.id"
        :to="`/tag/${tag.id}`"
        class="tag-item"
        v-reveal="i * 30"
      >
        {{ tag.labelName }}
        <span class="tag-item__count">{{ tag.articleCount }}</span>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Loading } from "@element-plus/icons-vue";
import { tagApi } from "~/api";
import type { Tag } from "~/types";

const { t } = useI18n();

const fetchAllTags = async () => {
  const pageSize = 100;
  let page = 1;
  let total = 0;
  const items: Tag[] = [];

  do {
    const response = await tagApi.getList({ page, pageSize });
    items.push(...(response.data.list || []));
    total = response.data.total || 0;
    page += 1;
  } while (items.length < total);

  return items;
};

const { data: allTags, pending } = await useAsyncData("tag-list", fetchAllTags, {
  default: () => [],
});

// 0 篇文章的标签对访客没有意义（点进去只会得到空列表）→ 隐藏；
// 全部为空时由模板渲空状态。后台仍可见全部标签。
const tags = computed(() =>
  allTags.value.filter((tag) => tag.articleCount > 0),
);

usePageSeo({
  title: t("tag.title"),
  description: t("tag.description"),
});
</script>

<style lang="scss" scoped>
@use "../../assets/css/abstracts/variables" as *;
@use "../../assets/css/abstracts/mixins" as *;

.tag {
  margin: 0 auto;
}

.loading {
  text-align: center;
  padding: $spacing-8;
  color: var(--text-secondary);
}

.tags-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-3;
  justify-content: center;
  /* 标签不再直接压在背景图上：容器走站点唯一的卡片配方。
     原来每个胶囊是 16% 透明底 + 无边框，观感完全由背景图的亮暗决定
     （压在深蓝区上看不清、压在云区上又糊），换成卡片后可读性由卡片保证。 */
  @include card-glass;
}

.tag-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 18px;
  /* 胶囊配方：铉住行盒。原先桌面端是 align-items: baseline，拉丁字下降部分更大 →
     实测拉丁 8/13、中文 12/9（中心差 4px）。只改 align-items 对中文无效，必须铉行盒。 */
  @include text-pill(37px, 21px, 18px);
  /* 统一字号（改用 rem 跟根字号走，不再写 px）：标签云是导航入口，
     取原四档的中间偏上值。 */
  font-size: 0.95rem;
  background: var(--color-accent-light);
  color: var(--color-accent-deep);
  border-radius: 20px;
  text-decoration: none;
  transition: transform 0.2s, box-shadow 0.2s;
}

.tag-item__count {
  font-size: 0.8em;
  font-weight: 400;
  opacity: 0.75;
}

.tag-item:hover {
  transform: scale(1.05);
  box-shadow: var(--shadow-glow);
}

@media (max-width: 768px) {
  /* 移动端标签云提升到 44px 触摸目标 */
  .tag-item {
    min-height: 44px;
    padding-left: 20px;
    padding-right: 20px;
  }
}
</style>
