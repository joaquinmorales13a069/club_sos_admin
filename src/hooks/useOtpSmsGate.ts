import { useSyncExternalStore } from "react";
import {
  getOtpSmsGateStatus,
  type OtpSmsGateResult,
} from "../lib/otpRateLimit";

/**
 * Estado del rate limit para SMS OTP; se actualiza cada segundo si hay bloqueo
 * para reflejar la cuenta atras hasta el proximo envio permitido.
 *
 * useSyncExternalStore evita setState sincrono en un effect (suscripcion al
 * "reloj" + lectura de localStorage como fuente externa).
 */
export function useOtpSmsGate(e164Phone: string): OtpSmsGateResult {
  return useSyncExternalStore(
    (onStoreChange) => {
      const id = window.setInterval(onStoreChange, 1000);
      return () => window.clearInterval(id);
    },
    () => getOtpSmsGateStatus(e164Phone),
    () => getOtpSmsGateStatus(e164Phone),
  );
}
