import type { Miembro } from "../../types/miembro";
import { DashboardAdminShell } from "./admin/DashboardAdminShell";
import { DashboardEmpresaAdminShell } from "./empresa_admin/DashboardEmpresaAdminShell";
import { DashboardMiembroShell } from "./miembro/DashboardMiembroShell";

/**
 * Punto de entrada del dashboard. Selecciona el shell correcto según el rol
 * del miembro autenticado. Cada shell tiene su propia navegación y secciones.
 */
export function DashboardRolePanels({ miembro }: { miembro: Miembro }) {
    if (miembro.rol === "admin") {
        return <DashboardAdminShell miembro={miembro} />;
    }

    if (miembro.rol === "empresa_admin") {
        return <DashboardEmpresaAdminShell miembro={miembro} />;
    }

    return <DashboardMiembroShell miembro={miembro} />;
}
