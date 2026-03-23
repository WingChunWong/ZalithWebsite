<script setup lang="ts">
import { Footer } from "@theojs/lumen";
import { Footer_Data } from "../data";
import { useData } from "vitepress";

const { localeIndex, frontmatter } = useData();

const legalText: Record<string, string> = {
	root: '"Minecraft"及"我的世界"是 Microsoft Corporation 和 Mojang Synergies AB 的注册商标。ZalithLauncher 与 Microsoft、Mojang 或网易公司无任何从属或合作关系。',
	en: "Minecraft® is a registered trademark of Microsoft Corporation and Mojang Synergies AB. ZalithLauncher is not affiliated with or endorsed by Microsoft, Mojang, or NetEase.",
};
</script>

<template>
  <template v-if="frontmatter.layout === 'home'">
    <Footer :Footer_Data="Footer_Data" />
    <div class="legal-notice">
      <p>{{ legalText[localeIndex] || legalText.root }}</p>
    </div>
  </template>
</template>

<style scoped>
.legal-notice {
  text-align: center;
  padding: 0.5rem 1rem 1rem;
  font-size: 0.7rem;
  color: var(--vp-c-text-3);
  line-height: 1.5;
  background: var(--lm-Footer-bg);
}
</style>