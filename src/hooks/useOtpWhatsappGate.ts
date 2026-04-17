import { useSyncExternalStore } from "react";
import {
  getOtpWaGateStatus,
  type OtpWaGateResult,
} from "../lib/otpWhatsappRateLimit";

function subscribeToOtpWaGateClock(onStoreChange: () => void) {
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

export function useOtpWhatsappGate(e164Phone: string): OtpWaGateResult {
  return useSyncExternalStore(
    subscribeToOtpWaGateClock,
    () => getOtpWaGateStatus(e164Phone),
    () => getOtpWaGateStatus(e164Phone),
  );
}
