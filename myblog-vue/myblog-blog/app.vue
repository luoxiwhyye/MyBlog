<template>
  <NuxtLoadingIndicator color="#F8FAFC" />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <!-- 全局命令面板：挂在根组件，保证快捷键（Cmd / Ctrl + K）在所有页面可用 -->
  <CommandPalette />
</template>
