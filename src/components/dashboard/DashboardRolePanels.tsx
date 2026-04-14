import type { Miembro, MiembroRol } from "../../types/miembro";
import { DashboardMiembro } from "./DashboardMiembro";

export function DashboardRolePanels({
  miembro,
}: {
  rol: MiembroRol;
  miembro: Miembro;
}) {
  return <DashboardMiembro miembro={miembro} />;
}
