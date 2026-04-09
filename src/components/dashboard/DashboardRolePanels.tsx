import type { ReactNode } from "react";
import {
  IoBusinessOutline,
  IoGridOutline,
  IoPeopleOutline,
  IoPersonOutline,
  IoSettingsOutline,
} from "react-icons/io5";
import type { MiembroRol } from "../../types/miembro";

function PanelCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#E5E5E5] bg-white p-5 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)] transition-shadow hover:shadow-md">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0066CC]/10 text-[#0066CC]">
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-semibold text-[#0066CC]">{title}</h3>
        <p className="mt-1 text-sm leading-snug text-[#666666]">{description}</p>
      </div>
      <p className="mt-auto text-xs font-medium text-[#666666]/80">Proximamente</p>
    </div>
  );
}

const MIEMBRO_PANELS = (
  <>
    <PanelCard
      icon={<IoPersonOutline size={22} />}
      title="Mi perfil"
      description="Datos personales, parentesco y contacto asociados a tu cuenta ClubSOS."
    />
    <PanelCard
      icon={<IoGridOutline size={22} />}
      title="Beneficios"
      description="Accede a beneficios y contenido exclusivo del club cuando esten disponibles."
    />
    <PanelCard
      icon={<IoSettingsOutline size={22} />}
      title="Soporte"
      description="Canal de ayuda y preguntas frecuentes sobre tu membresia."
    />
  </>
);

const EMPRESA_ADMIN_EXTRA = (
  <>
    <PanelCard
      icon={<IoPeopleOutline size={22} />}
      title="Miembros de la empresa"
      description="Consulta y gestiona afiliados vinculados a tu empresa."
    />
    <PanelCard
      icon={<IoBusinessOutline size={22} />}
      title="Datos de la empresa"
      description="Informacion corporativa y parametros visibles para tu organizacion."
    />
  </>
);

const ADMIN_EXTRA = (
  <>
    <PanelCard
      icon={<IoGridOutline size={22} />}
      title="Panel global"
      description="Vista transversal de empresas, miembros y operaciones del club."
    />
    <PanelCard
      icon={<IoSettingsOutline size={22} />}
      title="Configuracion del sistema"
      description="Herramientas reservadas para administracion central ClubSOS."
    />
  </>
);

export function DashboardRolePanels({ rol }: { rol: MiembroRol }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {rol === "admin" && (
        <>
          {ADMIN_EXTRA}
          {EMPRESA_ADMIN_EXTRA}
          {MIEMBRO_PANELS}
        </>
      )}
      {rol === "empresa_admin" && (
        <>
          {EMPRESA_ADMIN_EXTRA}
          {MIEMBRO_PANELS}
        </>
      )}
      {rol === "miembro" && MIEMBRO_PANELS}
    </div>
  );
}
