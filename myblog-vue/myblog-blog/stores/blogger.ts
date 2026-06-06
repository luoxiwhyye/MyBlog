import { defineStore } from "pinia";
import { ref } from "vue";
import { bloggerApi } from "~/api";
import type { BloggerProfile } from "~/types";

export const useBloggerStore = defineStore("blogger", () => {
  const profile = ref<BloggerProfile | null>(null);
  const loading = ref(false);
  let pendingRequest: Promise<BloggerProfile | null> | null = null;

  const fetchProfile = async () => {
    if (pendingRequest) {
      return pendingRequest;
    }

    loading.value = true;
    pendingRequest = bloggerApi
      .getPublicProfile()
      .then((response) => {
        profile.value = response.data;
        return profile.value;
      })
      .catch(() => {
        // 静默失败，使用默认值
        profile.value = null;
        return null;
      })
      .finally(() => {
        loading.value = false;
        pendingRequest = null;
      });

    return pendingRequest;
  };

  const ensureProfile = () => {
    if (profile.value !== null) return Promise.resolve(profile.value);
    return fetchProfile();
  };

  const nickname = () => profile.value?.nickname || "博主";
  const avatar = () => profile.value?.avatar || "";
  const bio = () => profile.value?.bio || "";

  return {
    profile,
    loading,
    fetchProfile,
    ensureProfile,
    nickname,
    avatar,
    bio,
  };
});
