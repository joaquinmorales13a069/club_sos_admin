import { useSyncExternalStore } from "react";
import {
  getOtpSmsGateStatus,
  type OtpSmsGateResult,
} from "../lib/otpRateLimit";

/**
 * Suscripcion estable (misma referencia en todos los renders).
 * Si se crea una funcion nueva en cada render, React desuscribe y vuelve a
 * suscribirse cada vez, reinicia el intervalo y puede provocar bucles o
 * pantalla en blanco al volver de otra pestaña o minimizar.
 */
function subscribeToOtpSmsGateClock(onStoreChange: () => void) {
  const id = window.setInterval(onStoreChange, 1000);
  const onVisibility = () => {
    if (document.visibilityState === "visible") onStoreChange();
  };
  document.addEventListener("visibilitychange", onVisibility);
  return () => {
    window.clearInterval(id);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}

/**
 * Estado del rate limit para SMS OTP; se actualiza cada segundo si hay bloqueo
 * para reflejar la cuenta atras hasta el proximo envio permitido.
 *
 * useSyncExternalStore evita setState sincrono en un effect (suscripcion al
 * "reloj" + lectura de localStorage como fuente externa).
 */
export function useOtpSmsGate(e164Phone: string): OtpSmsGateResult {
  return useSyncExternalStore(
    subscribeToOtpSmsGateClock,
    () => getOtpSmsGateStatus(e164Phone),
    () => getOtpSmsGateStatus(e164Phone),
  );
}
