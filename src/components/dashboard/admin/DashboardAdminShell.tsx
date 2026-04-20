import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import Skeleton from "react-loading-skeleton";
import {
  IoCalendarOutline,
  IoDocumentTextOutline,
  IoGiftOutline,
  IoHomeOutline,
  IoPersonOutline,
  IoSettingsOutline,
  IoShieldOutline,
  IoStatsChartOutline,
} from "react-icons/io5";
import type { Miembro } from "../../../types/miembro";
import type { MiembroDashboardSection } from "../../../types/dashboard";
import { SectionPlaceholder } from "../shared/SectionPlaceholder";
import { DashboardInicio } from "../inicio/DashboardInicio";
import { MisBeneficios } from "../miembro/beneficios/MisBeneficios";
import { AdminBeneficios } from "./beneficios/AdminBeneficios";
import { AdminCitasRegistro } from "./citas/AdminCitasRegistro";
import { AdminDocumentos } from "./documentos/AdminDocumentos";
import { AdminUsuarios } from "./usuarios/AdminUsuarios";
import { MisAjustes } from "../shared/MisAjustes";

// ── Nav ──────────────────────────────────────────────────────────────────────

type NavItem = { id: MiembroDashboardSection; label: string; icon: ReactNode };
type NavGroup = {
  groupLabel?: string;
  groupIcon?: ReactNode;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { id: "inicio", label: "Inicio", icon: <IoHomeOutline size={18} /> },
    ],
  },
  {
    groupLabel: "Mi perfil",
    groupIcon: <IoPersonOutline size={13} />,
    items: [
      { id: "citas", label: "Citas", icon: <IoCalendarOutline size={18} /> },
      {
        id: "beneficios",
        label: "Beneficios",
        icon: <IoGiftOutline size={18} />,
      },
      {
        id: "reportes",
        label: "Mis Reportes",
        icon: <IoStatsChartOutline size={18} />,
      },
      {
        id: "ajustes",
        label: "Ajustes",
        icon: <IoSettingsOutline size={18} />,
      },
    ],
  },
  {
    groupLabel: "Administrar",
    groupIcon: <IoShieldOutline size={13} />,
    items: [
      {
        id: "admin_citas",
        label: "Gestionar Citas",
        icon: <IoCalendarOutline size={18} />,
      },
      {
        id: "admin_beneficios",
        label: "Gestionar Beneficios",
        icon: <IoGiftOutline size={18} />,
      },
      {
        id: "admin_documentos",
        label: "Gestionar Documentos",
        icon: <IoDocumentTextOutline size={18} />,
      },
      {
        id: "admin_usuarios",
        label: "Gestionar Usuarios",
        icon: <IoPersonOutline size={18} />,
      },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

// ── Shell ────────────────────────────────────────────────────────────────────

export function DashboardAdminShell({ miembro }: { miembro: Miembro }) {
  const [section, setSection] = useState<MiembroDashboardSection>("inicio");
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<number | null>(null);

  function handleNav(next: MiembroDashboardSection) {
    if (next === section) return;
    setSection(next);
    setLoading(true);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setLoading(false);
      timerRef.current = null;
    }, 400);
  }

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    [],
  );

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
      <nav
        className="shrink-0 lg:w-[220px] xl:w-[240px]"
        aria-label="Navegación admin"
      >
        {/* Mobile: scroll horizontal plano */}
        <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
          {ALL_ITEMS.map((item) => (
            <MobileNavBtn
              key={item.id}
              item={item}
              active={section === item.id}
              onClick={() => handleNav(item.id)}
            />
          ))}
        </div>

        {/* Desktop: grupos con etiquetas */}
        <div className="hidden lg:flex lg:flex-col lg:gap-5">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi}>
              {group.groupLabel && (
                <div className="mb-1.5 flex items-center gap-1.5 px-1">
                  <span className="text-[#0066CC]/50">{group.groupIcon}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#AAAAAA]">
                    {group.groupLabel}
                  </span>
                </div>
              )}
              <ul className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <li key={item.id}>
                    <DesktopNavBtn
                      item={item}
                      active={section === item.id}
                      onClick={() => handleNav(item.id)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      <div className="min-w-0 flex-1">
        {loading ? (
          <LoadingSkeleton />
        ) : (
          <>
            {/* Mi perfil */}
            {section === "inicio" && (
              <DashboardInicio miembro={miembro} onNavigate={handleNav} />
            )}
            {section === "citas" && (
              <SectionPlaceholder
                title="Citas"
                description="Aquí podrás ver, agendar y gestionar tus citas médicas y de bienestar."
              />
            )}
            {section === "beneficios" && <MisBeneficios miembro={miembro} />}
            {section === "reportes" && (
              <SectionPlaceholder
                title="Mis reportes"
                description="Historial de solicitudes e informes enviados al equipo de ClubSOS."
              />
            )}
            {section === "ajustes" && <MisAjustes miembro={miembro} />}

            {/* Administrar */}
            {section === "admin_citas" && <AdminCitasRegistro />}
            {section === "admin_beneficios" && <AdminBeneficios />}
            {section === "admin_documentos" && (
              <div className="rounded-2xl border border-[#E5E5E5] bg-white p-6 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
                <AdminDocumentos />
              </div>
            )}
            {section === "admin_usuarios" && (
              <div className="rounded-2xl border border-[#E5E5E5] bg-white p-6 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
                <AdminUsuarios />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function DesktopNavBtn({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
        active
          ? "bg-[#0066CC] text-white shadow-sm"
          : "text-[#555555] hover:bg-[#F5F3EE] hover:text-[#0066CC]"
      }`}
    >
      <span className={active ? "text-white" : "text-[#0066CC]"}>
        {item.icon}
      </span>
      <span className="truncate">{item.label}</span>
    </button>
  );
}

function MobileNavBtn({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
        active
          ? "bg-[#0066CC] text-white shadow-sm"
          : "bg-white text-[#666666] ring-1 ring-[#E5E5E5] hover:bg-[#F5F3EE]"
      }`}
    >
      <span className={active ? "text-white" : "text-[#0066CC]"}>
        {item.icon}
      </span>
      {item.label}
    </button>
  );
}

function LoadingSkeleton() {
  return (
    <section className="rounded-2xl border border-[#E5E5E5] bg-white p-6 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
      <Skeleton height={28} width="40%" />
      <Skeleton className="mt-4" count={3} />
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Skeleton height={130} />
        <Skeleton height={130} />
      </div>
    </section>
  );
}
