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
      <!-- 权重分级：字号/字重随文章数递增（以最多文章的标签为分母）。
           用 <NuxtLink> 而不是 span + @click —— 标签云是导航，链接才能中键打开 /
           新窗口打开 / 被爬虫跟随（原先 span 两者都做不到）。 -->
      <NuxtLink
        v-for="(tag, i) in tags"
        :key="tag.id"
        :to="`/tag/${tag.id}`"
        class="tag-item"
        :style="weightStyle(tag.articleCount)"
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

// 权重分级分母：最多文章的标签。全部为空时取 1，避免除零。
const maxCount = computed(() =>
  Math.max(1, ...tags.value.map((tag) => tag.articleCount)),
);

/**
 * 按相对权重给字号/字重分级（四档）。
 * 直接线性映射会让“1 篇 vs 30 篇”拉出巨大字号差、居中的标签云会很难看，
 * 故按比例分档：前 25% 最大、25~50% 次之，以此类推。
 */
const weightStyle = (count: number) => {
  const ratio = count / maxCount.value;
  if (ratio >= 0.75) return { fontSize: "17px", fontWeight: 700 };
  if (ratio >= 0.5) return { fontSize: "15.5px", fontWeight: 600 };
  if (ratio >= 0.25) return { fontSize: "14px", fontWeight: 500 };
  return { fontSize: "13px", fontWeight: 400 };
};

usePageSeo({
  title: t("tag.title"),
  description: t("tag.description"),
});
</script>

<style lang="scss" scoped>
@use "../../assets/css/abstracts/variables" as *;

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
}

.tag-item {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  padding: 8px 18px;
  background: var(--color-accent-light);
  color: var(--color-accent-deep);
  border-radius: 20px;
  text-decoration: none;
  transition: opacity 0.2s, transform 0.2s, box-shadow 0.2s;
}

.tag-item__count {
  font-size: 0.8em;
  font-weight: 400;
  opacity: 0.75;
}

.tag-item:hover {
  opacity: 1;
  transform: scale(1.05);
  box-shadow: var(--shadow-glow);
}

@media (max-width: 768px) {
  /* 移动端标签云提升到 44px 触摸目标 */  .tag-item {
    min-height: 44px;
    padding: 10px 20px;
    display: inline-flex;
    align-items: center;
  }
}
</style>
