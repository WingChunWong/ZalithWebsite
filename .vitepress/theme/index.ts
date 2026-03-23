// https://vitepress.dev/guide/custom-theme
import { h } from "vue";
import type { Theme } from "vitepress";
import DefaultTheme from "vitepress/theme";
import Download from "./components/Download.vue";
import DownloadZL2 from "./components/DownloadZL2.vue";
import ApngPlayer from "./components/ApngPlayer.vue";
import "@theojs/lumen/style";
import "./style.css";
import "./style/blur.css";

import DomainWarningPopup from "./components/DomainWarningPopup.vue";
import CustomFooter from "./components/CustomFooter.vue";

export default {
	extends: DefaultTheme,
	Layout: () => {
		return h(DefaultTheme.Layout, null, {
			// 在布局中插入弹窗组件和页脚
			"layout-bottom": () => [h(CustomFooter), h(DomainWarningPopup)],
		});
	},
	enhanceApp({ app, router, siteData }) {
		app.component("Download", Download);
		app.component("DownloadZL2", DownloadZL2);
		app.component("ApngPlayer", ApngPlayer);
	},
} satisfies Theme;
