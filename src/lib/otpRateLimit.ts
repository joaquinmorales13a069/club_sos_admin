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

function stableBlockedGate(
  phone: string,
  kind: "quota" | "interval",
  retryAfterMs: number,
): OtpSmsGateBlocked {
  const key = `${phone}\0${kind}\0${Math.round(retryAfterMs)}`;
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

function prune(timestamps: number[], windowMs: number): number[] {
  const cutoff = Date.now() - windowMs;
  return timestamps.filter((t) => t > cutoff).sort((a, b) => a - b);
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
 */
export function getOtpSmsGateStatus(phone: string): OtpSmsGateResult {
  if (!phone.trim()) return OTP_SMS_GATE_OK;

  const raw = loadTimestamps(phone);
  const timestamps = prune(raw, OTP_SMS_WINDOW_MS);
  if (timestamps.length !== raw.length) {
    safeSetItem(STORAGE_PREFIX + phone, JSON.stringify(timestamps));
  }

  const now = Date.now();

  if (timestamps.length >= OTP_SMS_MAX_PER_WINDOW) {
    const retryAfterMs = Math.max(0, timestamps[0]! + OTP_SMS_WINDOW_MS - now);
    return stableBlockedGate(phone, "quota", retryAfterMs);
  }

  if (timestamps.length > 0) {
    const last = timestamps[timestamps.length - 1]!;
    const elapsed = now - last;
    if (elapsed < OTP_SMS_MIN_INTERVAL_MS) {
      const retryAfterMs = OTP_SMS_MIN_INTERVAL_MS - elapsed;
      return stableBlockedGate(phone, "interval", retryAfterMs);
    }
  }

  return OTP_SMS_GATE_OK;
}

/**
 * Registra un envio exitoso (llamar solo despues de que Appwrite envio el SMS).
 */
export function recordOtpSmsSent(phone: string): void {
  if (!phone.trim()) return;
  const timestamps = prune(loadTimestamps(phone), OTP_SMS_WINDOW_MS);
  timestamps.push(Date.now());
  timestamps.sort((a, b) => a - b);
  safeSetItem(STORAGE_PREFIX + phone, JSON.stringify(timestamps));
}
