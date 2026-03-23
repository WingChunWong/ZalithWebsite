<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { useData } from "vitepress";
import { marked } from "marked";

const { lang } = useData();

// Props 定义
const props = withDefaults(
	defineProps<{
		/** 项目类型: zl1 或 zl2 */
		project: "zl1" | "zl2";
	}>(),
	{
		project: "zl1",
	},
);

// 项目配置
const PROJECT_CONFIG = {
	zl1: {
		cacheKeyPrefix: "zl_download_cache_",
		githubRepo: "ZalithLauncher/ZalithLauncher",
		localVersionFile: "/version.json",
		versionJsonUrl: "https://fcl.lemwood.icu/zalith-info/launcher_version.json",
		mirrorPrefix: "zl",
		mirrorVersionTransform: (v: string) => v.replace(/\./g, ""),
		hasFoxington: true,
		foxingtonUrl:
			"https://next.foldcraftlauncher.cn/data/down/zl/1/1.4.1.0/index.json",
		hahaUrl: "https://api.mirror.frostlynx.work/api/projects/zl/latest",
		lemwoodUrl: "https://mirror.lemwood.icu/api/status/zl",
		enableDesktopPlatforms: true,
		sources: [
			{
				id: "github",
				name: "GitHub 官方",
				description: "官方发布渠道",
				speed: "海外较快",
			},
			{
				id: "mirror",
				name: "国内镜像",
				description: "第三方加速",
				speed: "国内较快",
				contributor: {
					name: "咬一口的鱼py(fishcpy)",
					url: "https://github.com/fishcpy",
				},
			},
			{
				id: "foxington",
				name: "XiaoluoFoxington源",
				description: "第三方镜像源",
				speed: "国内较快",
				contributor: {
					name: "XiaoluoFoxington",
					url: "https://github.com/XiaoluoFoxington",
				},
			},
			{
				id: "haha",
				name: "哈哈源",
				description: "FrostLynx 提供",
				speed: "国内较快",
				contributor: { name: "FrostLynx", url: "https://frostlynx.work" },
			},
			{
				id: "lemwood",
				name: "柠枺镜像",
				description: "由 柠枺(lemwood.cn) 提供",
				speed: "国内较快",
				contributor: { name: "柠枺", url: "https://lemwood.cn" },
			},
		],
	},
	zl2: {
		cacheKeyPrefix: "zl2_download_cache_",
		githubRepo: "ZalithLauncher/ZalithLauncher2",
		localVersionFile: "/version2.json",
		versionJsonUrl:
			"https://fcl.lemwood.icu/zalith-info/v2/latest_version_md.json",
		mirrorPrefix: "zl2",
		mirrorVersionTransform: (v: string) => v,
		hasFoxington: false,
		foxingtonUrl: "",
		hahaUrl: "https://api.mirror.frostlynx.work/api/projects/zl2/latest",
		lemwoodUrl: "https://mirror.lemwood.icu/api/status/zl2",
		enableDesktopPlatforms: false,
		sources: [
			{
				id: "github",
				name: "GitHub 官方",
				description: "官方发布渠道",
				speed: "海外较快",
			},
			{
				id: "mirror",
				name: "fishcpy源",
				description: "咬一口的鱼py提供",
				speed: "国内较快",
				contributor: {
					name: "咬一口的鱼py(fishcpy)",
					url: "https://github.com/fishcpy",
				},
			},
			{
				id: "haha",
				name: "哈哈源",
				description: "FrostLynx 提供",
				speed: "国内较快",
				contributor: { name: "FrostLynx", url: "https://frostlynx.work" },
			},
			{
				id: "lemwood",
				name: "柠枺镜像",
				description: "Lemwood 提供",
				speed: "国内较快",
				contributor: { name: "Lemwood", url: "https://lemwood.cn" },
			},
		],
	},
};

const config = computed(() => PROJECT_CONFIG[props.project]);

// 类型定义
interface DeviceType {
	id: string;
	name: string;
	icon: string;
	description: string;
	patterns: string[];
}

interface DownloadSource {
	id: string;
	name: string;
	description: string;
	speed: string;
	contributor?: { name: string; url: string };
}

// 常量
const CACHE_EXPIRY_MS = 30 * 60 * 1000;

// 响应式状态
const latestRelease = ref<Record<string, unknown> | null>(null);
const foxingtonData = ref<unknown[] | null>(null);
const lemwoodData = ref<unknown[] | null>(null);
const hahaData = ref<Record<string, unknown> | null>(null);
const versionJsonData = ref<Record<string, unknown> | null>(null);
const loadingStage = ref<"ui" | "release" | "notes" | "mirror">("ui");
const hasError = ref(false);
const errorMessage = ref("");
const parsedBody = ref("");
const selectedDeviceType = ref("all");
const selectedDownloadSource = ref("github");
const isDeviceDropdownOpen = ref(false);
const isSourceDropdownOpen = ref(false);
const apiFailed = ref(false);
const fallbackToLocal = ref(false);
const isSyncing = ref(false);

// 计算属性
const sourceAvailability = computed(
	(): Record<string, boolean> => ({
		github: true,
		mirror: !fallbackToLocal.value,
		foxington:
			config.value.hasFoxington &&
			!fallbackToLocal.value &&
			foxingtonData.value !== null,
		haha: !fallbackToLocal.value && hahaData.value !== null,
		lemwood:
			!fallbackToLocal.value &&
			lemwoodData.value !== null &&
			Array.isArray(lemwoodData.value) &&
			lemwoodData.value.length > 0,
	}),
);

const downloadSources = computed(
	() => config.value.sources as DownloadSource[],
);

// 基础设备类型
const baseDeviceTypes = computed((): DeviceType[] => {
	const base: DeviceType[] = [
		{
			id: "all",
			name: "全部文件",
			icon: "",
			description: "显示所有下载文件",
			patterns: ["*"],
		},
	];

	if (config.value.enableDesktopPlatforms) {
		base.push(
			{
				id: "windows",
				name: "Windows",
				icon: "",
				description: "Windows 电脑",
				patterns: ["windows", "win", ".exe", ".msi"],
			},
			{
				id: "macos",
				name: "macOS",
				icon: "",
				description: "Mac 电脑",
				patterns: ["macos", "mac", "darwin", ".dmg"],
			},
			{
				id: "linux",
				name: "Linux",
				icon: "",
				description: "Linux 系统",
				patterns: ["linux", ".appimage", ".deb", ".rpm", ".tar.gz"],
			},
			{
				id: "ios",
				name: "iOS",
				icon: "",
				description: "iPhone/iPad",
				patterns: ["ios", ".ipa"],
			},
		);
	}

	return base;
});

// 动态设备类型
const dynamicDeviceTypes = computed(() => {
	if (!latestRelease.value?.assets) return baseDeviceTypes.value;

	const assets = latestRelease.value.assets as Array<{ name: string }>;
	const detectedTypes = new Set<string>();
	const architectures = new Set<string>();

	assets.forEach((asset) => {
		const fileName = asset.name.toLowerCase();

		if (fileName.includes("arm64-v8a") || fileName.includes("arm64"))
			architectures.add("arm64");
		else if (fileName.includes("armeabi-v7a") || fileName.includes("armeabi"))
			architectures.add("armeabi");
		else if (fileName.includes("x86_64") || fileName.includes("x86-64"))
			architectures.add("x86_64");
		else if (fileName.includes("x86")) architectures.add("x86");
		else if (fileName.includes("universal")) architectures.add("universal");

		baseDeviceTypes.value.forEach((type) => {
			if (
				type.id !== "all" &&
				type.patterns.some(
					(p) => p === "*" || fileName.includes(p.toLowerCase()),
				)
			) {
				detectedTypes.add(type.id);
			}
		});
	});

	const result = [baseDeviceTypes.value[0]];

	baseDeviceTypes.value.slice(1).forEach((type) => {
		if (detectedTypes.has(type.id)) result.push(type);
	});

	const archOrder = ["arm64", "armeabi", "x86_64", "x86", "universal"];
	archOrder.forEach((arch) => {
		if (architectures.has(arch)) {
			result.push({
				id: arch,
				name: getArchDisplayName(arch),
				icon: "",
				description: getArchDescription(arch),
				patterns: getArchPatterns(arch),
			});
		}
	});

	return result;
});

// 辅助函数
function getArchPatterns(arch: string): string[] {
	const patterns: Record<string, string[]> = {
		arm64: ["arm64-v8a", "arm64"],
		armeabi: ["armeabi-v7a", "armeabi"],
		x86_64: ["x86_64", "x86-64"],
		x86: ["x86.apk"],
		universal: ["universal"],
	};
	return patterns[arch] || [arch];
}

function getArchDisplayName(arch: string): string {
	const names: Record<string, string> = {
		arm64: "ARM64",
		armeabi: "ARMv7",
		x86_64: "x86-64",
		x86: "x86",
		universal: "通用版本",
	};
	return names[arch] || arch.toUpperCase();
}

function getArchDescription(arch: string): string {
	const descriptions: Record<string, string> = {
		arm64: "64位 ARM 架构（推荐）",
		armeabi: "32位 ARM 架构",
		x86_64: "64位 x86 架构",
		x86: "32位 x86 架构",
		universal: "通用架构版本",
	};
	return descriptions[arch] || "特定架构";
}

function detectUserDeviceType(): string {
	const ua = navigator.userAgent.toLowerCase();

	if (/android/.test(ua)) {
		if (/arm64|aarch64/.test(ua)) return "arm64";
		if (/armv7|armeabi/.test(ua)) return "armeabi";
		if (/x86_64|x64/.test(ua)) return "x86_64";
		if (/x86/.test(ua)) return "x86";
		return "arm64";
	}
	if (/iphone|ipad|ipod/.test(ua)) return "ios";
	if (/mac/.test(ua)) return "macos";
	if (/win/.test(ua)) return "windows";
	if (/linux/.test(ua)) return "linux";

	return "all";
}

// 缓存函数
function getCache(key: string): unknown {
	try {
		const cached = localStorage.getItem(`${config.value.cacheKeyPrefix}${key}`);
		if (!cached) return null;
		const { data, timestamp } = JSON.parse(cached);
		if (Date.now() - timestamp > CACHE_EXPIRY_MS) {
			localStorage.removeItem(`${config.value.cacheKeyPrefix}${key}`);
			return null;
		}
		return data;
	} catch {
		return null;
	}
}

function setCache(key: string, data: unknown): void {
	try {
		localStorage.setItem(
			`${config.value.cacheKeyPrefix}${key}`,
			JSON.stringify({ data, timestamp: Date.now() }),
		);
	} catch {
		/* ignore */
	}
}

// IP 检测
async function detectIsChinaIP(): Promise<boolean> {
	const cached = localStorage.getItem("isChineseIP");
	const cachedExpire = localStorage.getItem("isChineseIPExpire");
	if (cached && cachedExpire && Date.now() < parseInt(cachedExpire, 10)) {
		return cached === "true";
	}

	const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
	const isChinaTZ = [
		"Asia/Shanghai",
		"Asia/Chongqing",
		"Asia/Harbin",
		"Asia/Urumqi",
	].includes(timeZone);

	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 3000);
		const response = await fetch("https://ipapi.co/json/", {
			headers: {
				Accept: "application/json",
				"User-Agent": "ZalithLauncher-Website/1.0",
			},
			signal: controller.signal,
		});
		clearTimeout(timeoutId);

		if (response.ok) {
			const data = await response.json();
			const isCN = data.country === "CN" || data.region === "China";
			localStorage.setItem("isChineseIP", isCN.toString());
			localStorage.setItem(
				"isChineseIPExpire",
				(Date.now() + 24 * 60 * 60 * 1000).toString(),
			);
			return isCN;
		}
	} catch {
		/* ignore */
	}

	return isChinaTZ;
}

// 数据获取函数
async function fetchFromApi(): Promise<Record<string, unknown>> {
	const url = `https://api.github.com/repos/${config.value.githubRepo}/releases/latest`;
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), 10000);

	const response = await fetch(url, {
		headers: {
			Accept: "application/vnd.github.v3+json",
			"User-Agent": "ZalithLauncher-Website/1.0",
		},
		signal: controller.signal,
	});
	clearTimeout(timeoutId);

	if (!response.ok) throw new Error(`HTTP ${response.status}`);
	return response.json();
}

async function loadLocalVersionInfo(): Promise<Record<string, unknown>> {
	const response = await fetch(config.value.localVersionFile);
	if (!response.ok) throw new Error("Local version load failed");
	const localData = await response.json();

	return {
		name: `ZalithLauncher ${localData.latest_version}`,
		tag_name: `v${localData.latest_version}`,
		published_at: localData.release_date,
		body: localData.body || "",
		assets: localData.assets.map((a: Record<string, unknown>) => ({
			id: Math.random().toString(36).slice(2),
			name: a.name,
			browser_download_url: a.browser_download_url,
			size: a.size,
			download_count: a.download_count || 0,
		})),
	};
}

async function fetchFoxingtonData(): Promise<void> {
	if (!config.value.hasFoxington) return;

	try {
		const response = await fetch(config.value.foxingtonUrl);
		if (response.ok) foxingtonData.value = await response.json();
	} catch {
		/* ignore */
	}
}

async function fetchHahaData(): Promise<void> {
	try {
		const response = await fetch(config.value.hahaUrl);
		if (response.ok) hahaData.value = await response.json();
	} catch {
		/* ignore */
	}
}

async function fetchLemwoodData(): Promise<void> {
	try {
		const response = await fetch(config.value.lemwoodUrl);
		if (response.ok) lemwoodData.value = await response.json();
	} catch {
		/* ignore */
	}
}

async function fetchVersionJsonData(): Promise<void> {
	try {
		const response = await fetch(config.value.versionJsonUrl);
		if (response.ok) versionJsonData.value = await response.json();
	} catch {
		/* ignore */
	}
}

// 本地化描述
const localizedDescription = computed(() => {
	if (!versionJsonData.value) return null;

	if (props.project === "zl1") {
		const desc = versionJsonData.value.description as
			| Record<string, string>
			| undefined;
		if (!desc) return null;

		const currentLang = lang.value.toLowerCase();
		if (currentLang.includes("zh-tw") || currentLang.includes("zh-hk"))
			return desc.zh_tw || desc.zh_cn || desc.en_us;
		if (currentLang.includes("zh")) return desc.zh_cn || desc.en_us;
		return desc.en_us || desc.zh_cn;
	} else {
		const bodies =
			(versionJsonData.value.bodies as Array<{
				language: string;
				markdown: string;
			}>) || [];
		const defaultBody = versionJsonData.value.default_body as
			| { markdown?: string }
			| undefined;
		const currentLang = lang.value.toLowerCase();

		const targetBody = currentLang.includes("zh")
			? bodies.find((b) => b.language === "zh")
			: bodies.find((b) => b.language === "en");

		return targetBody?.markdown || defaultBody?.markdown || null;
	}
});

// 云盘链接（ZL2 独有）
const cloudDrive = computed(() => {
	if (props.project !== "zl2" || !versionJsonData.value) return null;
	return versionJsonData.value.default_cloud_drive as { link: string } | null;
});

// 主加载函数
async function fetchLatestRelease(): Promise<void> {
	hasError.value = false;
	errorMessage.value = "";
	apiFailed.value = false;
	fallbackToLocal.value = false;

	// 1. 从缓存加载
	const cachedRelease = getCache("release") as Record<string, unknown> | null;
	const cachedMirrors = getCache("mirrors") as {
		foxington?: unknown;
		haha?: unknown;
		lemwood?: unknown;
	} | null;
	const cachedVersionJson = getCache("versionJson") as Record<
		string,
		unknown
	> | null;

	let hasCache = false;

	if (cachedRelease) {
		latestRelease.value = cachedRelease;
		loadingStage.value = "release";
		hasCache = true;
	}
	if (cachedVersionJson) {
		versionJsonData.value = cachedVersionJson;
		loadingStage.value = "notes";
	}
	if (cachedMirrors) {
		foxingtonData.value = (cachedMirrors.foxington as unknown[] | null) ?? null;
		hahaData.value =
			(cachedMirrors.haha as Record<string, unknown> | null) ?? null;
		lemwoodData.value = (cachedMirrors.lemwood as unknown[] | null) ?? null;
		loadingStage.value = "mirror";
	}

	if (hasCache) {
		isSyncing.value = true;
		autoSelectDeviceType();
		const body =
			localizedDescription.value || (cachedRelease?.body as string) || "";
		if (body) parsedBody.value = await marked.parse(body);
	} else {
		loadingStage.value = "ui";
	}

	// 2. 并行请求
	const fetchReleaseTask = async () => {
		try {
			const data = await fetchFromApi();
			latestRelease.value = data;
			setCache("release", data);
			loadingStage.value = "release";
		} catch {
			apiFailed.value = true;
			const localRelease = await loadLocalVersionInfo();
			latestRelease.value = localRelease;
			setCache("release", localRelease);
			loadingStage.value = "release";
		}
	};

	const fetchVersionJsonTask = async () => {
		await fetchVersionJsonData();
		if (versionJsonData.value) {
			setCache("versionJson", versionJsonData.value);
			loadingStage.value = "notes";
		}
	};

	const fetchMirrorsTask = async () => {
		await Promise.allSettled([
			fetchFoxingtonData(),
			fetchHahaData(),
			fetchLemwoodData(),
		]);
		setCache("mirrors", {
			foxington: foxingtonData.value,
			haha: hahaData.value,
			lemwood: lemwoodData.value,
		});
		loadingStage.value = "mirror";
	};

	const detectIPTask = async () => {
		if (await detectIsChinaIP()) selectedDownloadSource.value = "lemwood";
	};

	await Promise.allSettled([
		fetchReleaseTask(),
		fetchVersionJsonTask(),
		fetchMirrorsTask(),
		detectIPTask(),
	]);

	// 3. 更新 body
	const body =
		localizedDescription.value || (latestRelease.value?.body as string) || "";
	if (body) parsedBody.value = await marked.parse(body);

	isSyncing.value = false;
	autoSelectDeviceType();

	if (!latestRelease.value) {
		hasError.value = true;
		errorMessage.value = "无法获取版本信息，请检查网络连接或稍后重试";
	}
}

function autoSelectDeviceType(): void {
	if (dynamicDeviceTypes.value.length > 1) {
		const detectedType = detectUserDeviceType();
		const availableType = dynamicDeviceTypes.value.find(
			(t) => t.id === detectedType,
		);
		if (availableType) selectedDeviceType.value = detectedType;
	}
}

// URL 生成函数
function generateMirrorUrl(assetName: string, tagName: string): string {
	const version = config.value.mirrorVersionTransform(tagName.replace("v", ""));
	return `https://download.fishcpy.top/dl/${config.value.mirrorPrefix}/${version}/${assetName}`;
}

function getFoxingtonUrl(asset: Record<string, unknown>): string {
	if (!foxingtonData.value || !Array.isArray(foxingtonData.value))
		return asset.browser_download_url as string;

	const fileName = (asset.name as string).toLowerCase();
	let targetArchName = "all 架构";

	if (fileName.includes("arm64")) targetArchName = "arm64-v8a 架构";
	else if (fileName.includes("armeabi")) targetArchName = "armeabi-v7a 架构";
	else if (fileName.includes("x86_64")) targetArchName = "x86_64 架构";
	else if (fileName.includes("x86")) targetArchName = "x86 架构";

	const matchedFile = (
		foxingtonData.value as Array<Record<string, unknown>>
	).find((f) => f.name === targetArchName);
	return (matchedFile?.url as string) || (asset.browser_download_url as string);
}

function getHahaUrl(asset: Record<string, unknown>): string {
	if (!hahaData.value || !hahaData.value.files)
		return asset.browser_download_url as string;

	const fileName = (asset.name as string).toLowerCase();
	let targetArch = "";

	if (fileName.includes("arm64")) targetArch = "arm64-v8a";
	else if (fileName.includes("armeabi")) targetArch = "armeabi-v7a";
	else if (fileName.includes("x86_64")) targetArch = "x86_64";
	else if (fileName.includes("x86")) targetArch = "x86";

	const matchedFile = (
		hahaData.value.files as Array<{ arch: string; link: string }>
	).find(
		(f) =>
			f.arch === targetArch || (!targetArch && (!f.arch || f.arch === "all")),
	);
	return matchedFile?.link || (asset.browser_download_url as string);
}

function getLemwoodUrl(asset: Record<string, unknown>): string {
	if (!lemwoodData.value || !Array.isArray(lemwoodData.value))
		return asset.browser_download_url as string;

	const currentTagName = latestRelease.value?.tag_name as string;
	const normalizedTagName = currentTagName?.replace(/^v/, "");

	let matchedRelease = (
		lemwoodData.value as Array<{
			tag_name: string;
			assets?: Array<{ name: string; url: string }>;
		}>
	).find(
		(r) => r.tag_name === currentTagName || r.tag_name === normalizedTagName,
	);

	if (matchedRelease?.assets) {
		const matchedAsset = matchedRelease.assets.find(
			(a) => a.name === asset.name,
		);
		if (matchedAsset) return matchedAsset.url;
	}

	for (let i = lemwoodData.value.length - 1; i >= 0; i--) {
		const release = lemwoodData.value[i] as {
			assets?: Array<{ name: string; url: string }>;
		};
		if (release.assets) {
			const matchedAsset = release.assets.find((a) => a.name === asset.name);
			if (matchedAsset) return matchedAsset.url;
		}
	}

	return asset.browser_download_url as string;
}

function getDownloadUrl(asset: Record<string, unknown>): string {
	if (fallbackToLocal.value) return asset.browser_download_url as string;

	switch (selectedDownloadSource.value) {
		case "mirror":
			return generateMirrorUrl(
				asset.name as string,
				latestRelease.value?.tag_name as string,
			);
		case "foxington":
			return getFoxingtonUrl(asset);
		case "haha":
			return getHahaUrl(asset);
		case "lemwood":
			return getLemwoodUrl(asset);
		default:
			return asset.browser_download_url as string;
	}
}

// 过滤资源
const filteredAssets = computed(() => {
	if (!latestRelease.value?.assets) return [];

	const assets = latestRelease.value.assets as Array<Record<string, unknown>>;
	if (selectedDeviceType.value === "all") return assets;

	const currentType = dynamicDeviceTypes.value.find(
		(t) => t.id === selectedDeviceType.value,
	);
	if (!currentType) return assets;

	return assets.filter((asset) => {
		const fileName = (asset.name as string).toLowerCase();
		return currentType.patterns.some(
			(p) => p === "*" || fileName.includes(p.toLowerCase()),
		);
	});
});

const currentDeviceType = computed(
	() =>
		dynamicDeviceTypes.value.find((t) => t.id === selectedDeviceType.value) ||
		dynamicDeviceTypes.value[0],
);
const currentDownloadSource = computed(
	() =>
		downloadSources.value.find((s) => s.id === selectedDownloadSource.value) ||
		downloadSources.value[0],
);

// 格式化
function formatFileSize(bytes: number): string {
	if (bytes === 0) return "0 Bytes";
	const k = 1024;
	const sizes = ["Bytes", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

function handleDeviceDropdownBlur(): void {
	setTimeout(() => {
		isDeviceDropdownOpen.value = false;
	}, 200);
}

function handleSourceDropdownBlur(): void {
	setTimeout(() => {
		isSourceDropdownOpen.value = false;
	}, 200);
}

// 生命周期
onMounted(() => {
	fetchLatestRelease();
});
</script>

<template>
  <div class="download-container">
    <!-- 骨架屏 -->
    <div v-if="loadingStage === 'ui'" class="skeleton-container">
      <div class="skeleton-header"></div>
      <div class="skeleton-selector"></div>
      <div class="skeleton-assets"></div>
      <div class="skeleton-notes"></div>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="hasError" class="error">
      <div class="error-content">
        <span class="error-icon">⚠️</span>
        <h3>无法获取版本信息</h3>
        <p>{{ errorMessage }}</p>
        <button class="retry-btn" @click="fetchLatestRelease()">重新加载</button>
      </div>
    </div>

    <!-- 主内容 -->
    <div v-else-if="latestRelease" class="release-info">
      <!-- API 失败警告 -->
      <div v-if="apiFailed" class="api-fallback-notice">
        <div class="notice-content">
          <span class="notice-icon">⚠️</span>
          <div class="notice-text">
            <strong>API版本信息获取失败</strong>
            <p>已使用本地版本信息，部分功能可能受限。</p>
          </div>
          <button class="notice-retry-btn" @click="fetchLatestRelease()">重新尝试</button>
        </div>
      </div>

      <!-- 版本信息头部 -->
      <div class="release-header">
        <div class="selector-header">
          <h3>{{ latestRelease.name }}</h3>
          <span v-if="isSyncing" class="sync-indicator">
            <span class="sync-spinner"></span>
            同步中...
          </span>
        </div>
        <div class="version-info">
          <span class="version-tag">{{ latestRelease.tag_name }}</span>
          <span class="release-date">{{ new Date(latestRelease.published_at as string).toLocaleDateString('zh-CN') }}</span>
          <span v-if="fallbackToLocal" class="local-version-badge">本地版本</span>
        </div>
      </div>

      <!-- 云盘下载（ZL2 独有） -->
      <div v-if="cloudDrive" class="cloud-drive-section">
        <div class="cloud-drive-card">
          <div class="cloud-drive-icon">☁️</div>
          <div class="cloud-drive-info">
            <h4>网盘下载</h4>
            <p>国内用户推荐，下载更稳定</p>
          </div>
          <a :href="cloudDrive.link" target="_blank" rel="noopener noreferrer" class="cloud-drive-btn">
            访问网盘 ↗
          </a>
        </div>
      </div>

      <!-- 智能下载选择器 -->
      <div class="download-selector">
        <div class="selector-header">
          <h3>智能下载</h3>
          <p>已自动检测您的设备类型，您也可以手动选择</p>
        </div>

        <div class="selector-controls">
          <!-- 设备类型选择器 -->
          <div class="dropdown-container">
            <label class="dropdown-label">设备类型</label>
            <div class="dropdown" :class="{ 'is-open': isDeviceDropdownOpen }">
              <button class="dropdown-trigger" @click="isDeviceDropdownOpen = !isDeviceDropdownOpen" @blur="handleDeviceDropdownBlur">
                <span class="dropdown-content">
                  <span v-if="currentDeviceType.icon" class="device-icon">{{ currentDeviceType.icon }}</span>
                  <span class="device-info">
                    <span class="device-name">{{ currentDeviceType.name }}</span>
                    <span class="device-desc">{{ currentDeviceType.description }}</span>
                  </span>
                </span>
                <span class="dropdown-arrow">▼</span>
              </button>

              <div class="dropdown-menu">
                <button
                  v-for="device in dynamicDeviceTypes.filter(d => d.id !== selectedDeviceType)"
                  :key="device.id"
                  class="dropdown-item"
                  @click="selectedDeviceType = device.id; isDeviceDropdownOpen = false"
                >
                  <span v-if="device.icon" class="device-icon">{{ device.icon }}</span>
                  <span class="device-info">
                    <span class="device-name">{{ device.name }}</span>
                    <span class="device-desc">{{ device.description }}</span>
                  </span>
                </button>
              </div>
            </div>
          </div>

          <!-- 下载源选择器 -->
          <div class="dropdown-container">
            <label class="dropdown-label">下载源</label>
            <div class="dropdown" :class="{ 'is-open': isSourceDropdownOpen }">
              <button class="dropdown-trigger" @click="isSourceDropdownOpen = !isSourceDropdownOpen" @blur="handleSourceDropdownBlur">
                <span class="dropdown-content">
                  <span class="source-info">
                    <span class="source-name">{{ currentDownloadSource.name }}</span>
                    <span class="source-desc">{{ currentDownloadSource.description }} · {{ currentDownloadSource.speed }}</span>
                  </span>
                </span>
                <span class="dropdown-arrow">▼</span>
              </button>

              <div class="dropdown-menu">
                <button
                  v-for="source in downloadSources.filter(s => s.id !== selectedDownloadSource)"
                  :key="source.id"
                  class="dropdown-item"
                  :class="{ 'is-disabled': !sourceAvailability[source.id] }"
                  :disabled="!sourceAvailability[source.id]"
                  @click="if (sourceAvailability[source.id]) { selectedDownloadSource = source.id; isSourceDropdownOpen = false }"
                >
                  <span class="source-info">
                    <span class="source-name">{{ source.name }}</span>
                    <span class="source-desc">{{ source.description }} · {{ source.speed }}</span>
                    <span v-if="source.contributor" class="contributor-info">
                      镜像加速由 <a :href="source.contributor.url" target="_blank" rel="noopener noreferrer" class="contributor-link" @click.stop>{{ source.contributor.name }}</a> 友情提供
                    </span>
                    <span v-if="!sourceAvailability[source.id]" class="disabled-hint">（暂不可用）</span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 下载文件列表 -->
      <div class="download-section">
        <h3>下载文件</h3>

        <div v-if="filteredAssets && filteredAssets.length > 0" class="assets-list">
          <div v-for="asset in filteredAssets" :key="asset.id as PropertyKey" class="asset-item">
            <div class="asset-info">
              <div class="asset-details">
                <span class="asset-name">{{ asset.name }}</span>
                <div class="asset-meta">
                  <span class="asset-size">{{ formatFileSize(asset.size as number) }}</span>
                  <span class="asset-downloads">{{ (asset.download_count as number).toLocaleString() }} 次下载</span>
                </div>
              </div>
            </div>
            <a :href="getDownloadUrl(asset)" class="download-btn" target="_blank" rel="noopener noreferrer">
              下载
            </a>
          </div>
        </div>

        <div v-else class="no-assets">
          <p>没有找到匹配的下载文件</p>
        </div>
      </div>

      <!-- 更新日志 -->
      <div v-if="parsedBody" class="release-notes">
        <h3>更新日志</h3>
        <div class="release-notes-content" v-html="parsedBody"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 容器 */
.download-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}

/* 骨架屏 */
.skeleton-container {
  animation: pulse 2s infinite;
}

.skeleton-header,
.skeleton-selector,
.skeleton-assets,
.skeleton-notes {
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  margin-bottom: 16px;
}

.skeleton-header { height: 80px; }
.skeleton-selector { height: 100px; }
.skeleton-assets { height: 200px; }
.skeleton-notes { height: 150px; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* 错误状态 */
.error {
  text-align: center;
  padding: 60px 20px;
}

.error-icon {
  font-size: 48px;
}

.error h3 {
  margin: 16px 0 8px;
  color: var(--vp-c-text-1);
}

.error p {
  color: var(--vp-c-text-2);
  margin-bottom: 20px;
}

.retry-btn {
  background: var(--vp-c-brand-1);
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.retry-btn:hover {
  background: var(--vp-c-brand-2);
}

/* API 失败通知 */
.api-fallback-notice {
  background: var(--vp-c-warning-soft);
  border: 1px solid var(--vp-c-warning-2);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
}

.notice-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.notice-icon {
  font-size: 24px;
}

.notice-text strong {
  color: var(--vp-c-warning-1);
}

.notice-text p {
  margin: 4px 0 0;
  font-size: 0.875rem;
  color: var(--vp-c-text-2);
}

.notice-retry-btn {
  margin-left: auto;
  background: var(--vp-c-warning-1);
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.75rem;
}

/* 版本信息头部 */
.release-header {
  text-align: center;
  margin-bottom: 24px;
  padding: 20px;
  background: var(--vp-c-brand-2);
  border-radius: 16px;
  color: white;
}

.release-header .selector-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.release-header h3 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
}

.sync-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  font-size: 0.75rem;
}

.sync-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.version-info {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 12px;
}

.version-tag,
.release-date {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.875rem;
}

.version-tag {
  background: rgba(255, 255, 255, 0.2);
  font-weight: 600;
}

.release-date {
  background: rgba(255, 255, 255, 0.1);
}

.local-version-badge {
  background: var(--vp-c-warning-1);
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

/* 云盘下载 */
.cloud-drive-section {
  margin-bottom: 20px;
}

.cloud-drive-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
}

.cloud-drive-icon {
  font-size: 32px;
}

.cloud-drive-info h4 {
  margin: 0;
  font-size: 1rem;
}

.cloud-drive-info p {
  margin: 4px 0 0;
  font-size: 0.875rem;
  opacity: 0.9;
}

.cloud-drive-btn {
  margin-left: auto;
  background: white;
  color: #667eea;
  padding: 8px 16px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.875rem;
}

/* 下载选择器 */
.download-selector {
  background: var(--vp-c-bg-soft);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
}

.selector-header h3 {
  margin: 0 0 4px;
  color: var(--vp-c-text-1);
}

.selector-header p {
  margin: 0 0 16px;
  font-size: 0.875rem;
  color: var(--vp-c-text-2);
}

.selector-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.dropdown-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dropdown-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--vp-c-text-2);
  text-transform: uppercase;
}

.dropdown {
  position: relative;
}

.dropdown-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
}

.dropdown-trigger:hover {
  border-color: var(--vp-c-brand-1);
}

.dropdown-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.device-info,
.source-info {
  display: flex;
  flex-direction: column;
}

.device-name,
.source-name {
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.device-desc,
.source-desc {
  font-size: 0.75rem;
  color: var(--vp-c-text-2);
}

.dropdown-arrow {
  font-size: 0.75rem;
  color: var(--vp-c-text-2);
  transition: transform 0.2s;
}

.dropdown.is-open .dropdown-arrow {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 100;
  display: none;
}

.dropdown.is-open .dropdown-menu {
  display: block;
}

.dropdown-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
}

.dropdown-item:hover {
  background: var(--vp-c-bg-soft);
}

.dropdown-item:first-child {
  border-radius: 12px 12px 0 0;
}

.dropdown-item:last-child {
  border-radius: 0 0 12px 12px;
}

.dropdown-item.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.contributor-info {
  font-size: 0.75rem;
  color: var(--vp-c-text-2);
}

.contributor-link {
  color: var(--vp-c-brand-1);
  text-decoration: none;
}

.disabled-hint {
  font-size: 0.75rem;
  color: var(--vp-c-warning-1);
}

/* 下载文件列表 */
.download-section {
  margin-bottom: 24px;
}

.download-section h3 {
  margin: 0 0 16px;
  color: var(--vp-c-text-1);
}

.assets-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.asset-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  border: 1px solid var(--vp-c-divider);
}

.asset-item:hover {
  border-color: var(--vp-c-brand-1);
}

.asset-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.asset-name {
  font-weight: 600;
  color: var(--vp-c-text-1);
  word-break: break-all;
}

.asset-meta {
  display: flex;
  gap: 12px;
  margin-top: 4px;
}

.asset-size,
.asset-downloads {
  font-size: 0.75rem;
  color: var(--vp-c-text-2);
}

.download-btn {
  background: var(--vp-c-brand-1);
  color: white;
  padding: 8px 20px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.875rem;
  white-space: nowrap;
}

.download-btn:hover {
  background: var(--vp-c-brand-2);
}

.no-assets {
  text-align: center;
  padding: 40px;
  color: var(--vp-c-text-2);
}

/* 更新日志 */
.release-notes {
  background: var(--vp-c-bg-soft);
  border-radius: 16px;
  padding: 20px;
}

.release-notes h3 {
  margin: 0 0 16px;
  color: var(--vp-c-text-1);
}

.release-notes-content {
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--vp-c-text-2);
}

.release-notes-content :deep(h1),
.release-notes-content :deep(h2),
.release-notes-content :deep(h3) {
  color: var(--vp-c-text-1);
  margin-top: 16px;
}

.release-notes-content :deep(ul) {
  padding-left: 20px;
}

.release-notes-content :deep(li) {
  margin-bottom: 8px;
}

/* 响应式 */
@media (max-width: 640px) {
  .selector-controls {
    grid-template-columns: 1fr;
  }

  .asset-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .download-btn {
    width: 100%;
    text-align: center;
  }

  .cloud-drive-card {
    flex-direction: column;
    text-align: center;
  }

  .cloud-drive-btn {
    margin-left: 0;
    width: 100%;
    text-align: center;
  }
}
</style>