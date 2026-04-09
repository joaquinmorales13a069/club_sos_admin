/**
 * Limita envios de SMS OTP por numero (E.164) para reducir costos y abuso.
 * Persistencia en localStorage (misma clave para login y registro).
 *
 * Nota: un atacante puede limpiar el almacenamiento local; para limite
 * estricto hace falta una Cloud Function o reglas en servidor.
 */

const STORAGE_PREFIX = "club_sos_otp_sms:";

/** Maximo de SMS OTP por numero en la ventana de tiempo */
export const OTP_SMS_MAX_PER_WINDOW = 3;

/** Ventana deslizante (ms), p. ej. 1 hora */
export const OTP_SMS_WINDOW_MS = 60 * 60 * 1000;

/** Tiempo minimo entre dos envios al mismo numero (anti-spam inmediato) */
export const OTP_SMS_MIN_INTERVAL_MS = 45 * 1000;

export type OtpSmsGateOk = { ok: true };

export type OtpSmsGateBlocked = {
  ok: false;
  retryAfterMs: number;
  message: string;
};

export type OtpSmsGateResult = OtpSmsGateOk | OtpSmsGateBlocked;

/**
 * Misma referencia siempre cuando el envio esta permitido.
 * useSyncExternalStore exige que getSnapshot no devuelva un objeto nuevo
 * en cada llamada si el valor logico no cambio (evita renders infinitos).
 */
export const OTP_SMS_GATE_OK: OtpSmsGateResult = { ok: true };

let blockedGateCache: { key: string; gate: OtpSmsGateBlocked } | null = null;

/**
 * Buckets retry time to whole seconds so two getSnapshot calls in the same
 * render (React Strict Mode) resolve to the same cache key.
 */
function stableBlockedGate(
  phone: string,
  kind: "quota" | "interval",
  retryAfterMs: number,
): OtpSmsGateBlocked {
  const key = `${phone}\0${kind}\0${Math.max(0, Math.ceil(retryAfterMs / 1000))}`;
  if (blockedGateCache?.key === key) {
    return blockedGateCache.gate;
  }
  const gate: OtpSmsGateBlocked = {
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

/** Ventana corta para que dos lecturas de getSnapshot en el mismo render devuelvan la misma referencia (Strict Mode). */
const SNAPSHOT_MS_BUCKET = 64;

const snapshotMemo = new Map<
  string,
  { bucket: number; result: OtpSmsGateResult }
>();

function bumpSnapshotBucket(phone: string): void {
  snapshotMemo.delete(phone.trim());
}

function getSnapshotMemo(phone: string, bucket: number): OtpSmsGateResult | undefined {
  const hit = snapshotMemo.get(phone);
  if (hit && hit.bucket === bucket) return hit.result;
  return undefined;
}

function setSnapshotMemo(phone: string, bucket: number, result: OtpSmsGateResult): void {
  snapshotMemo.set(phone, { bucket, result });
}

/**
 * Formato legible en espanol para el tiempo de espera restante.
 */
export function formatOtpCooldownHuman(retryAfterMs: number): string {
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
  const human = formatOtpCooldownHuman(retryAfterMs);
  if (kind === "quota") {
    return `Ha alcanzado el limite de ${OTP_SMS_MAX_PER_WINDOW} envios de codigo por telefono. Podra solicitar nuevos mensajes OTP en ${human}.`;
  }
  return `Espere ${human} antes de solicitar otro codigo OTP.`;
}

/**
 * Evalua si puede enviarse otro SMS OTP sin registrar un nuevo intento.
 *
 * Debe ser determinista dentro de la misma "ventana" corta de tiempo: React 18+
 * puede llamar getSnapshot dos veces en el mismo render (Strict Mode); si las
 * dos lecturas difieren, useSyncExternalStore lanza y la app queda en blanco.
 */
export function getOtpSmsGateStatus(phone: string): OtpSmsGateResult {
  const trimmed = phone.trim();
  if (!trimmed) return OTP_SMS_GATE_OK;

  const now = Date.now();
  const bucket = Math.floor(now / SNAPSHOT_MS_BUCKET);
  const memo = getSnapshotMemo(trimmed, bucket);
  if (memo !== undefined) return memo;

  const raw = loadTimestamps(trimmed);
  const timestamps = prune(raw, OTP_SMS_WINDOW_MS, now);
  if (timestamps.length !== raw.length) {
    safeSetItem(STORAGE_PREFIX + trimmed, JSON.stringify(timestamps));
  }

  let result: OtpSmsGateResult;

  if (timestamps.length >= OTP_SMS_MAX_PER_WINDOW) {
    const retryAfterMs = Math.max(0, timestamps[0]! + OTP_SMS_WINDOW_MS - now);
    result = stableBlockedGate(trimmed, "quota", retryAfterMs);
  } else if (timestamps.length > 0) {
    const last = timestamps[timestamps.length - 1]!;
    const elapsed = now - last;
    if (elapsed < OTP_SMS_MIN_INTERVAL_MS) {
      const retryAfterMs = OTP_SMS_MIN_INTERVAL_MS - elapsed;
      result = stableBlockedGate(trimmed, "interval", retryAfterMs);
    } else {
      result = OTP_SMS_GATE_OK;
    }
  } else {
    result = OTP_SMS_GATE_OK;
  }

  setSnapshotMemo(trimmed, bucket, result);
  return result;
}

/**
 * Registra un envio exitoso (llamar solo despues de que Appwrite envio el SMS).
 */
export function recordOtpSmsSent(phone: string): void {
  const trimmed = phone.trim();
  if (!trimmed) return;
  bumpSnapshotBucket(trimmed);
  const now = Date.now();
  const timestamps = prune(loadTimestamps(trimmed), OTP_SMS_WINDOW_MS, now);
  timestamps.push(now);
  timestamps.sort((a, b) => a - b);
  safeSetItem(STORAGE_PREFIX + trimmed, JSON.stringify(timestamps));
}
