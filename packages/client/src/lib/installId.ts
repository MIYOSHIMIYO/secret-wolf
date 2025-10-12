function uid(n = 8): string {
	const arr = new Uint8Array(n);
	(globalThis.crypto || window.crypto).getRandomValues(arr);
	return Array.from(arr).reduce<string>((s, b) => s + (b % 16).toString(16), "");
}

// 端末固定（全タブ共有）ID：localStorage
function getBaseInstallId(): string {
	const k = "__install_id__";
	let v = localStorage.getItem(k);
	if (!v) {
		v = `${Date.now().toString(36)}-${uid(8)}`;
		localStorage.setItem(k, v);
	}
	return v;
}

// タブ固定ID：sessionStorage（タブ複製時は同じ値になりがち）
function getTabId(): string {
	const k = "__tab_id__";
	let v = sessionStorage.getItem(k);
	if (!v) {
		const q = new URLSearchParams(location.search).get("tab");
		v = (q && q.trim()) || uid(4);
		sessionStorage.setItem(k, v);
	}
	return v;
}

// ページ実行ごとの一時ID（タブ複製対策）
function getRunId(): string {
	const g = globalThis as any;
	if (!g.__tab_run_id__) g.__tab_run_id__ = uid(3);
	return g.__tab_run_id__ as string;
}

// dev または フラグ/クエリ指定で「端末ID.tabID-runID」にする
export function getInstallId(): string {
	const base = getBaseInstallId();
	const multitab =
		import.meta.env.DEV ||
		(((import.meta as any).env?.VITE_DEV_MULTITAB as string) === "1") ||
		new URLSearchParams(location.search).has("multitab");
	return multitab ? `${base}.${getTabId()}-${getRunId()}` : base;
} 