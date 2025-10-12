function buf2hex(buf) {
    const view = new Uint8Array(buf);
    return Array.from(view).map((b) => b.toString(16).padStart(2, "0")).join("");
}
export async function sha256Hex(s) {
    const enc = new TextEncoder();
    const digest = await crypto.subtle.digest("SHA-256", enc.encode(s));
    return buf2hex(digest);
}
export async function makeAccountFingerprint(pepper, uidOrDevice, installId) {
    return sha256Hex(`${pepper}:${uidOrDevice}:${installId}`);
}
export async function readRandomProfile(_kv, _targetFingerprint) {
    // reserved for future use
    return null;
}
export async function writeRandomProfile(_kv, _targetFingerprint, _value, _ttlSeconds) {
    // reserved for future use
}
const REPORT_PREFIX = "mod:fp:";
const REPORT_COUNT = (fp) => `${REPORT_PREFIX}${fp}:rc`;
const REPORT_BANNED = (fp) => `${REPORT_PREFIX}${fp}:ban`;
export async function incrementReportCount(kv, fp, ttlSeconds = 30 * 24 * 3600, threshold = 3) {
    const key = REPORT_COUNT(fp);
    const raw = await kv.get(key);
    const next = (raw ? parseInt(raw, 10) : 0) + 1;
    await kv.put(key, String(next), { expirationTtl: ttlSeconds });
    if (next >= threshold) {
        await kv.put(REPORT_BANNED(fp), "1", { expirationTtl: ttlSeconds });
    }
    return next;
}
export async function isShadow(kv, fp) {
    return Boolean(await kv.get(REPORT_BANNED(fp)));
}
