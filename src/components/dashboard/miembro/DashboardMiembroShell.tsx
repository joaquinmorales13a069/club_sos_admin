import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import Skeleton from "react-loading-skeleton";
import {
    IoCalendarOutline,
    IoGiftOutline,
    IoHomeOutline,
    IoPeopleOutline,
    IoSettingsOutline,
    IoStatsChartOutline,
} from "react-icons/io5";
import type { Miembro } from "../../../types/miembro";
import type { MiembroDashboardSection } from "../../../types/dashboard";
import { SectionPlaceholder } from "../shared/SectionPlaceholder";
import { DashboardInicio } from "../inicio/DashboardInicio";
import { MisBeneficios } from "./beneficios/MisBeneficios";
import { MisCitas } from "./citas/MisCitas";
import { MiFamilia } from "./familia/MiFamilia";

// ── Nav ──────────────────────────────────────────────────────────────────────

type NavItem = { id: MiembroDashboardSection; label: string; icon: ReactNode };

const NAV_BASE: NavItem[] = [
    { id: "inicio",     label: "Inicio",       icon: <IoHomeOutline size={18} /> },
    { id: "citas",      label: "Citas",         icon: <IoCalendarOutline size={18} /> },
    { id: "beneficios", label: "Beneficios",    icon: <IoGiftOutline size={18} /> },
    { id: "reportes",   label: "Mis Reportes",  icon: <IoStatsChartOutline size={18} /> },
    { id: "ajustes",    label: "Ajustes",       icon: <IoSettingsOutline size={18} /> },
];

const NAV_FAMILIA: NavItem = { id: "mi_familia", label: "Mi Familia", icon: <IoPeopleOutline size={18} /> };

// ── Shell ────────────────────────────────────────────────────────────────────

export function DashboardMiembroShell({ miembro }: { miembro: Miembro }) {
    const esTitular = miembro.parentesco === "titular";
    const NAV = esTitular ? [...NAV_BASE, NAV_FAMILIA] : NAV_BASE;

    const [section, setSection] = useState<MiembroDashboardSection>("inicio");
    const [loading, setLoading] = useState(false);
    const timerRef = useRef<number | null>(null);

    function handleNav(next: MiembroDashboardSection) {
        if (next === section) return;
        setSection(next);
        setLoading(true);
        if (timerRef.current) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => { setLoading(false); timerRef.current = null; }, 400);
    }

    useEffect(() => () => { if (timerRef.current) window.clearTimeout(timerRef.current); }, []);

    return (
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
            <nav className="shrink-0 lg:w-[220px] xl:w-[240px]" aria-label="Navegación">
                {/* Mobile */}
                <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
                    {NAV.map((item) => (
                        <NavBtn key={item.id} item={item} active={section === item.id} onClick={() => handleNav(item.id)} />
                    ))}
                </div>
                {/* Desktop */}
                <ul className="hidden lg:flex lg:flex-col lg:gap-0.5">
                    {NAV.map((item) => (
                        <li key={item.id}>
                            <NavBtn item={item} active={section === item.id} onClick={() => handleNav(item.id)} />
                        </li>
                    ))}
                </ul>
            </nav>

            <div className="min-w-0 flex-1">
                {loading ? <LoadingSkeleton /> : (
                    <>
                        {section === "inicio"     && <DashboardInicio miembro={miembro} onNavigate={handleNav} />}
                        {section === "citas"      && <MisCitas miembro={miembro} />}
                        {section === "beneficios" && <MisBeneficios miembro={miembro} />}
                        {section === "reportes"   && <SectionPlaceholder title="Mis reportes" description="Historial de solicitudes e informes enviados al equipo de ClubSOS." />}
                        {section === "ajustes"    && <SectionPlaceholder title="Ajustes" description="Preferencias de cuenta, notificaciones y datos de contacto." />}
                        {section === "mi_familia" && esTitular && (
                            <div className="rounded-2xl border border-[#E5E5E5] bg-white p-6 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
                                <MiFamilia miembro={miembro} />
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function NavBtn({ item, active, onClick }: { item: NavItem; active: boolean; onClick: () => void }) {
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
            <span className={active ? "text-white" : "text-[#0066CC]"}>{item.icon}</span>
            <span className="truncate">{item.label}</span>
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
