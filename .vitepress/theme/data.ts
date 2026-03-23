import type { FooterData } from "@theojs/lumen";

export const Footer_Data: FooterData = {
	i18n: {
		root: {
			group: [
				{
					title: "项目",
					icon: "ri:folder-line",
					links: [
						{
							name: "Zalith Launcher 1",
							link: "https://github.com/ZalithLauncher/ZalithLauncher",
							icon: "ri:github-fill",
						},
						{
							name: "Zalith Launcher 2",
							link: "https://github.com/ZalithLauncher/ZalithLauncher2",
							icon: "ri:github-fill",
						},
						{
							name: "本站源码",
							link: "https://github.com/ZalithLauncher/ZalithWebsite",
							icon: "ri:github-fill",
						},
					],
				},
				{
					title: "资源",
					icon: "ri:link",
					links: [
						{ name: "下载 ZL1", link: "/download" },
						{ name: "下载 ZL2", link: "/zl2-download" },
						{ name: "启动器文档", link: "/docs/projects/zl2" },
					],
				},
				{
					title: "社区",
					icon: "ri:team-line",
					links: [
						{
							name: "GitHub 组织",
							link: "https://github.com/ZalithLauncher",
							icon: "ri:github-fill",
						},
						{ name: "QQ 群", link: "https://qm.qq.com/q/8y9z7k0k0" },
					],
				},
				{
					title: "关于",
					icon: "ri:information-line",
					links: [
						{ name: "关于本站", link: "/docs/about/about" },
						{ name: "隐私政策", link: "/docs/about/privacy" },
						{ name: "服务条款", link: "/docs/about/terms" },
					],
				},
			],
			beian: {
				icp: {
					number: "新ICP备2024015133号-4",
					link: "https://beian.miit.gov.cn/",
				},
				showIcon: true,
			},
			author: {
				name: "Zalith Launcher",
				link: "https://github.com/ZalithLauncher",
				startYear: 2024,
				text: "MIT License.",
			},
		},
		en: {
			group: [
				{
					title: "Projects",
					icon: "ri:folder-line",
					links: [
						{
							name: "Zalith Launcher 1",
							link: "https://github.com/ZalithLauncher/ZalithLauncher",
							icon: "ri:github-fill",
						},
						{
							name: "Zalith Launcher 2",
							link: "https://github.com/ZalithLauncher/ZalithLauncher2",
							icon: "ri:github-fill",
						},
						{
							name: "Website Source",
							link: "https://github.com/ZalithLauncher/ZalithWebsite",
							icon: "ri:github-fill",
						},
					],
				},
				{
					title: "Resources",
					icon: "ri:link",
					links: [
						{ name: "Download ZL1", link: "/en/download" },
						{ name: "Download ZL2", link: "/en/zl2-download" },
						{ name: "Launcher Docs", link: "/docs/projects/zl2" },
					],
				},
				{
					title: "Community",
					icon: "ri:team-line",
					links: [
						{
							name: "GitHub Org",
							link: "https://github.com/ZalithLauncher",
							icon: "ri:github-fill",
						},
					],
				},
				{
					title: "About",
					icon: "ri:information-line",
					links: [
						{ name: "About", link: "/en/docs/about/about" },
						{ name: "Privacy Policy", link: "/en/docs/about/privacy" },
						{ name: "Terms of Service", link: "/en/docs/about/terms" },
					],
				},
			],
			author: {
				name: "Zalith Launcher",
				link: "https://github.com/ZalithLauncher",
				startYear: 2024,
				text: "MIT License.",
			},
		},
	},
};
