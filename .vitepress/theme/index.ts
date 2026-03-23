// https://vitepress.dev/guide/custom-theme
import { h } from "vue";
import type { Theme } from "vitepress";
import DefaultTheme from "vitepress/theme";
import DownloadComponent from "./components/DownloadComponent.vue";
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
		app.component("DownloadComponent", DownloadComponent);
		app.component("ApngPlayer", ApngPlayer);
	},
} satisfies Theme;
