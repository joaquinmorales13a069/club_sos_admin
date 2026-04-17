/**
 * Limita envios de OTP por WhatsApp por numero (E.164) para reducir costos y abuso.
 * Persistencia en localStorage (misma clave para login y registro).
 * Canal independiente del rate limit de SMS.
 */

const STORAGE_PREFIX = "club_sos_otp_wa:";

export const OTP_WA_MAX_PER_WINDOW = 3;
export const OTP_WA_WINDOW_MS = 60 * 60 * 1000;
export const OTP_WA_MIN_INTERVAL_MS = 45 * 1000;

export type OtpWaGateOk = { ok: true };

export type OtpWaGateBlocked = {
  ok: false;
  retryAfterMs: number;
  message: string;
};

export type OtpWaGateResult = OtpWaGateOk | OtpWaGateBlocked;

export const OTP_WA_GATE_OK: OtpWaGateResult = { ok: true };

let blockedGateCache: { key: string; gate: OtpWaGateBlocked } | null = null;

function stableBlockedGate(
  phone: string,
  kind: "quota" | "interval",
  retryAfterMs: number,
): OtpWaGateBlocked {
  const key = `${phone}\0${kind}\0${Math.max(0, Math.ceil(retryAfterMs / 1000))}`;
  if (blockedGateCache?.key === key) {
    return blockedGateCache.gate;
  }
  const gate: OtpWaGateBlocked = {
    ok: false,
    retryAfterMs,
    message: blockedMessage(retryAfterMs, kind),
  };
  blockedGateCache = { key, gate };
  return gate;
}

function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignorar quota / modo privado */
  }
}

function loadTimestamps(phone: string): number[] {
  const raw = safeGetItem(STORAGE_PREFIX + phone);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((t): t is number => typeof t === "number")
      : [];
  } catch {
    return [];
  }
}

function prune(timestamps: number[], windowMs: number, now: number): number[] {
  const cutoff = now - windowMs;
  return timestamps.filter((t) => t > cutoff).sort((a, b) => a - b);
}

const SNAPSHOT_MS_BUCKET = 64;

const snapshotMemo = new Map<
  string,
  { bucket: number; result: OtpWaGateResult }
>();

function bumpSnapshotBucket(phone: string): void {
  snapshotMemo.delete(phone.trim());
}

function getSnapshotMemo(phone: string, bucket: number): OtpWaGateResult | undefined {
  const hit = snapshotMemo.get(phone);
  if (hit && hit.bucket === bucket) return hit.result;
  return undefined;
}

function setSnapshotMemo(phone: string, bucket: number, result: OtpWaGateResult): void {
  snapshotMemo.set(phone, { bucket, result });
}

function formatCooldownHuman(retryAfterMs: number): string {
  const totalSec = Math.max(0, Math.ceil(retryAfterMs / 1000));
  if (totalSec < 60) {
    return `${totalSec} segundo${totalSec === 1 ? "" : "s"}`;
  }
  const mins = Math.ceil(totalSec / 60);
  if (mins < 60) {
    return `${mins} minuto${mins === 1 ? "" : "s"}`;
  }
  const hours = Math.floor(mins / 60);
  const restMin = mins % 60;
  if (restMin === 0) {
    return `${hours} hora${hours === 1 ? "" : "s"}`;
  }
  return `${hours} h ${restMin} min`;
}

function blockedMessage(retryAfterMs: number, kind: "quota" | "interval"): string {
  const human = formatCooldownHuman(retryAfterMs);
  if (kind === "quota") {
    return `Ha alcanzado el limite de ${OTP_WA_MAX_PER_WINDOW} envios por WhatsApp. Podra solicitar nuevos codigos en ${human}.`;
  }
  return `Espere ${human} antes de solicitar otro codigo OTP por WhatsApp.`;
}

export function getOtpWaGateStatus(phone: string): OtpWaGateResult {
  const trimmed = phone.trim();
  if (!trimmed) return OTP_WA_GATE_OK;

  const now = Date.now();
  const bucket = Math.floor(now / SNAPSHOT_MS_BUCKET);
  const memo = getSnapshotMemo(trimmed, bucket);
  if (memo !== undefined) return memo;

  const raw = loadTimestamps(trimmed);
  const timestamps = prune(raw, OTP_WA_WINDOW_MS, now);
  if (timestamps.length !== raw.length) {
    safeSetItem(STORAGE_PREFIX + trimmed, JSON.stringify(timestamps));
  }

  let result: OtpWaGateResult;

  if (timestamps.length >= OTP_WA_MAX_PER_WINDOW) {
    const retryAfterMs = Math.max(0, timestamps[0]! + OTP_WA_WINDOW_MS - now);
    result = stableBlockedGate(trimmed, "quota", retryAfterMs);
  } else if (timestamps.length > 0) {
    const last = timestamps[timestamps.length - 1]!;
    const elapsed = now - last;
    if (elapsed < OTP_WA_MIN_INTERVAL_MS) {
      const retryAfterMs = OTP_WA_MIN_INTERVAL_MS - elapsed;
      result = stableBlockedGate(trimmed, "interval", retryAfterMs);
    } else {
      result = OTP_WA_GATE_OK;
    }
  } else {
    result = OTP_WA_GATE_OK;
  }

  setSnapshotMemo(trimmed, bucket, result);
  return result;
}

export function recordOtpWaSent(phone: string): void {
  const trimmed = phone.trim();
  if (!trimmed) return;
  bumpSnapshotBucket(trimmed);
  const now = Date.now();
  const timestamps = prune(loadTimestamps(trimmed), OTP_WA_WINDOW_MS, now);
  timestamps.push(now);
  timestamps.sort((a, b) => a - b);
  safeSetItem(STORAGE_PREFIX + trimmed, JSON.stringify(timestamps));
}
