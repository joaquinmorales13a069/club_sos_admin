import { AppwriteException } from "appwrite";
import { useCallback, useEffect, useState } from "react";
import {
  cerrarSesion,
  getCurrentUserId,
  getMiembroPorAuthUserId,
} from "../lib/appwrite";
import type { Miembro } from "../types/miembro";

export type MiembroSessionState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "error"; message: string }
  | { status: "no_miembro" }
  | { status: "pending"; miembro: Miembro }
  | { status: "ready"; miembro: Miembro };

/**
 * Carga el usuario de Auth y la fila `miembros` asociada.
 * Usa esto en el home (dashboard) para saber rol, activo y redirigir si hace falta.
 */
export function useMiembroSession() {
  const [state, setState] = useState<MiembroSessionState>({ status: "loading" });

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const authUserId = await getCurrentUserId();
      const miembro = await getMiembroPorAuthUserId(authUserId);
      if (!miembro) {
        setState({ status: "no_miembro" });
        return;
      }
      if (!miembro.activo) {
        setState({ status: "pending", miembro });
        return;
      }
      setState({ status: "ready", miembro });
    } catch (err: unknown) {
      if (err instanceof AppwriteException && err.code === 401) {
        setState({ status: "unauthenticated" });
        return;
      }
      const message =
        err instanceof Error ? err.message : "Error al cargar tu cuenta.";
      setState({ status: "error", message });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const logout = useCallback(async () => {
    try {
      await cerrarSesion();
    } finally {
      setState({ status: "unauthenticated" });
    }
  }, []);

  return { state, refetch: load, logout };
}
