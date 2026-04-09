import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import Skeleton from "react-loading-skeleton";
import {
    IoCalendarOutline,
    IoChevronForward,
    IoDocumentTextOutline,
    IoGiftOutline,
    IoHomeOutline,
    IoNotificationsOutline,
    IoPersonOutline,
    IoSettingsOutline,
    IoStatsChartOutline,
} from "react-icons/io5";
import type { Beneficio, Miembro } from "../../types/miembro";
import { getBeneficiosDisponibles } from "../../lib/appwrite";
import { DashboardBeneficios } from "./beneficios/DashboardBeneficios";
import { AdminBeneficios } from "./beneficios/AdminBeneficios";


export type MiembroDashboardSection =
    | "inicio"
    | "citas"
    | "beneficios"
    | "reportes"
    | "ajustes";

const NAV: {
    id: MiembroDashboardSection;
    label: string;
    icon: ReactNode;
}[] = [
    { id: "inicio", label: "Inicio", icon: <IoHomeOutline size={20} /> },
    { id: "citas", label: "Citas", icon: <IoCalendarOutline size={20} /> },
    {
        id: "beneficios",
        label: "Beneficios",
        icon: <IoGiftOutline size={20} />,
    },
    {
        id: "reportes",
        label: "Mis Reportes",
        icon: <IoStatsChartOutline size={20} />,
    },
    { id: "ajustes", label: "Ajustes", icon: <IoSettingsOutline size={20} /> },
];

/** Datos de ejemplo hasta conectar citas, documentos y beneficios con Appwrite */
const MOCK_PROXIMA_CITA = {
    fecha: "15 abr. 2026",
    hora: "10:30",
    especialidad: "Medicina general",
    lugar: "Clínica SOS Medical — Managua",
    estado: "confirmada" as const,
};

const MOCK_DOCUMENTOS = [
    {
        id: "1",
        titulo: "Resultados de laboratorio",
        fecha: "2 abr. 2026",
        tipo: "PDF",
    },
    { id: "2", titulo: "Receta médica", fecha: "28 mar. 2026", tipo: "PDF" },
    {
        id: "3",
        titulo: "Informe de consulta",
        fecha: "15 mar. 2026",
        tipo: "PDF",
    },
];


const MOCK_AVISOS = [
    "Renueva tu carnet antes del 30 de abril.",
    "Tienes un mensaje del equipo de bienestar.",
];

function SectionPlaceholder({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <section className="rounded-2xl border border-[#E5E5E5] bg-white p-8 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
            <h2 className="text-xl font-semibold text-[#0066CC]">{title}</h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#666666]">
                {description}
            </p>
            <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-[#666666]/70">
                Próximamente
            </p>
        </section>
    );
}

function HomeCard({
    title,
    icon,
    children,
    className = "",
}: {
    title: string;
    icon: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    return (
        <article
            className={`flex flex-col rounded-2xl border border-[#E5E5E5] bg-white p-5 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)] ${className}`}
        >
            <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0066CC]/10 text-[#0066CC]">
                    {icon}
                </span>
                <h3 className="text-base font-semibold text-[#0066CC]">
                    {title}
                </h3>
            </div>
            {children}
        </article>
    );
}

function DashboardInicio({
    miembro,
    onNavigate,
}: {
    miembro: Miembro;
    onNavigate: (section: MiembroDashboardSection) => void;
}) {
    const primerNombre = miembro.nombre_completo.split(" ")[0];
    const [beneficios, setBeneficios] = useState<Beneficio[]>([]);
    const [loadingBeneficios, setLoadingBeneficios] = useState(true);

    useEffect(() => {
        getBeneficiosDisponibles(miembro.empresa_id, 3)
            .then(setBeneficios)
            .finally(() => setLoadingBeneficios(false));
    }, [miembro.empresa_id]);

    return (
        <div className="space-y-6">
            <header className="rounded-2xl border border-[#0066CC]/15 bg-linear-to-br from-white to-[#0066CC]/6 px-5 py-6 md:px-7">
                <p className="text-sm font-medium text-[#666666]">
                    Resumen personal
                </p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#0066CC] md:text-3xl">
                    Bienvenido, {primerNombre}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#666666]">
                    Aquí ves un vistazo de tu próxima cita, documentos recientes
                    y beneficios activos. Los datos de ejemplo se reemplazarán
                    cuando estén conectados al sistema.
                </p>
            </header>

            <div className="grid gap-4 lg:grid-cols-2">
                <HomeCard
                    title="Documentos recientes"
                    icon={<IoDocumentTextOutline size={22} />}
                >
                    <ul className="space-y-3">
                        {MOCK_DOCUMENTOS.map((doc) => (
                            <li
                                key={doc.id}
                                className="flex items-center justify-between gap-2 border-b border-[#E5E5E5]/80 pb-3 last:border-0 last:pb-0"
                            >
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-[#333333]">
                                        {doc.titulo}
                                    </p>
                                    <p className="text-xs text-[#666666]">
                                        {doc.fecha}
                                    </p>
                                </div>
                                <span className="shrink-0 rounded-md bg-[#F5F3EE] px-2 py-0.5 text-[10px] font-semibold uppercase text-[#666666]">
                                    {doc.tipo}
                                </span>
                            </li>
                        ))}
                    </ul>
                    <button
                        type="button"
                        className="mt-4 w-full rounded-xl border border-[#E5E5E5] py-2.5 text-sm font-semibold text-[#0066CC] transition-colors hover:bg-[#0066CC]/5"
                    >
                        Ver todos los documentos
                    </button>
                </HomeCard>

                <HomeCard
                    title="Beneficios activos"
                    icon={<IoGiftOutline size={22} />}
                >
                    {loadingBeneficios ? (
                        <div className="space-y-3">
                            <Skeleton height={72} borderRadius={12} />
                            <Skeleton height={72} borderRadius={12} />
                            <Skeleton height={72} borderRadius={12} />
                        </div>
                    ) : beneficios.length === 0 ? (
                        <p className="py-4 text-center text-sm text-[#666666]">
                            No hay beneficios activos actualmente.
                        </p>
                    ) : (
                        <ul className="space-y-3">
                            {beneficios.map((b) => (
                                <li
                                    key={b.$id}
                                    className="rounded-xl bg-[#F5F3EE]/80 px-3 py-3"
                                >
                                    <p className="font-semibold text-[#333333]">
                                        {b.titulo}
                                    </p>
                                    <p className="mt-0.5 text-sm text-[#666666]">
                                        {b.descripcion}
                                    </p>
                                    {b.fecha_fin && (
                                        <p className="mt-1 text-xs text-[#666666]/90">
                                            Hasta{" "}
                                            {new Date(b.fecha_fin).toLocaleDateString("es-NI", {
                                                day: "numeric",
                                                month: "short",
                                                year: "numeric",
                                            })}
                                        </p>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                    <button
                        type="button"
                        onClick={() => onNavigate("beneficios")}
                        className="mt-4 w-full rounded-xl border border-[#E5E5E5] py-2.5 text-sm font-semibold text-[#0066CC] transition-colors hover:bg-[#0066CC]/5"
                    >
                        Explorar beneficios
                    </button>
                </HomeCard>

                <HomeCard
                    title="Próxima cita"
                    icon={<IoCalendarOutline size={22} />}
                >
                    <div className="flex flex-col gap-4">
                        <div className="space-y-1">
                            <p className="text-base font-semibold text-[#333333]">
                                {MOCK_PROXIMA_CITA.especialidad}
                            </p>
                            <p className="text-sm text-[#666666]">
                                {MOCK_PROXIMA_CITA.fecha} ·{" "}
                                {MOCK_PROXIMA_CITA.hora}
                            </p>
                            <p className="text-sm text-[#666666]">
                                {MOCK_PROXIMA_CITA.lugar}
                            </p>
                            <span className="inline-flex w-fit rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                                {MOCK_PROXIMA_CITA.estado === "confirmada"
                                    ? "Confirmada"
                                    : "Pendiente"}
                            </span>
                        </div>
                        <button
                            type="button"
                            className="inline-flex w-full items-center justify-center gap-1 rounded-xl bg-[#0066CC] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0055aa]"
                        >
                            Ver detalle
                            <IoChevronForward size={18} aria-hidden />
                        </button>
                    </div>
                </HomeCard>

                <HomeCard
                    title="Avisos"
                    icon={<IoNotificationsOutline size={22} />}
                >
                    <ul className="space-y-3">
                        {MOCK_AVISOS.map((texto, i) => (
                            <li
                                key={i}
                                className="flex gap-3 rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2.5 text-sm text-[#5c4a00]"
                            >
                                <span
                                    className="mt-0.5 shrink-0 text-amber-600"
                                    aria-hidden
                                >
                                    •
                                </span>
                                <span>{texto}</span>
                            </li>
                        ))}
                    </ul>
                </HomeCard>

                <HomeCard
                    title="Accesos rápidos"
                    icon={<IoPersonOutline size={22} />}
                    className="lg:col-span-2"
                >
                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-xl border border-[#E5E5E5] bg-[#F5F3EE]/50 px-4 py-3 text-sm font-semibold text-[#0066CC] transition-colors hover:bg-[#0066CC]/10"
                        >
                            <IoCalendarOutline size={18} />
                            Agendar cita
                        </button>
                        <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-xl border border-[#E5E5E5] bg-[#F5F3EE]/50 px-4 py-3 text-sm font-semibold text-[#0066CC] transition-colors hover:bg-[#0066CC]/10"
                        >
                            <IoDocumentTextOutline size={18} />
                            Subir documento
                        </button>
                        <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-xl border border-[#E5E5E5] bg-[#F5F3EE]/50 px-4 py-3 text-sm font-semibold text-[#0066CC] transition-colors hover:bg-[#0066CC]/10"
                        >
                            <IoStatsChartOutline size={18} />
                            Nuevo reporte
                        </button>
                    </div>
                </HomeCard>
            </div>
        </div>
    );
}

export function DashboardMiembro({ miembro }: { miembro: Miembro }) {
    const [section, setSection] = useState<MiembroDashboardSection>("inicio");
    const [isSectionLoading, setIsSectionLoading] = useState(false);
    const timeoutRef = useRef<number | null>(null);

    const handleChangeSection = (nextSection: MiembroDashboardSection) => {
        if (nextSection === section) {
            return;
        }
        setSection(nextSection);
        setIsSectionLoading(true);
        if (timeoutRef.current) {
            window.clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = window.setTimeout(() => {
            setIsSectionLoading(false);
            timeoutRef.current = null;
        }, 450);
    };

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                window.clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return (
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
            <nav
                className="shrink-0 lg:w-[220px] xl:w-[240px]"
                aria-label="Secciones del panel de miembro"
            >
                <ul className="flex flex-row flex-wrap gap-2 lg:flex-col lg:flex-nowrap lg:gap-1">
                    {NAV.map((item) => {
                        const active = section === item.id;
                        return (
                            <li
                                key={item.id}
                                className="min-w-0 flex-1 lg:flex-none"
                            >
                                <button
                                    type="button"
                                    onClick={() => handleChangeSection(item.id)}
                                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                                        active
                                            ? "bg-[#0066CC] text-white shadow-sm"
                                            : "bg-white text-[#666666] shadow-[0_1px_2px_0_rgba(0,0,0,0.04)] ring-1 ring-[#E5E5E5] hover:bg-[#F5F3EE]"
                                    }`}
                                    aria-current={active ? "page" : undefined}
                                >
                                    <span
                                        className={
                                            active
                                                ? "text-white"
                                                : "text-[#0066CC]"
                                        }
                                    >
                                        {item.icon}
                                    </span>
                                    <span className="truncate">
                                        {item.label}
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            <div className="min-w-0 flex-1">
                {isSectionLoading ? (
                    <section className="rounded-2xl border border-[#E5E5E5] bg-white p-6 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
                        <Skeleton height={28} width="40%" />
                        <Skeleton className="mt-4" count={3} />
                        <div className="mt-6 grid gap-4 md:grid-cols-2">
                            <Skeleton height={130} />
                            <Skeleton height={130} />
                        </div>
                    </section>
                ) : null}
                {!isSectionLoading && section === "inicio" && (
                    <DashboardInicio miembro={miembro} onNavigate={handleChangeSection} />
                )}
                {!isSectionLoading && section === "citas" && (
                    <SectionPlaceholder
                        title="Citas"
                        description="Aquí podrás ver, agendar y gestionar tus citas médicas y de bienestar con el club."
                    />
                )}
                {!isSectionLoading && section === "beneficios" && (
                    miembro.rol === "admin"
                        ? <AdminBeneficios miembro={miembro} />
                        : <DashboardBeneficios miembro={miembro} />
                )}
                {!isSectionLoading && section === "reportes" && (
                    <SectionPlaceholder
                        title="Mis reportes"
                        description="Historial de solicitudes e informes que hayas enviado al equipo de ClubSOS."
                    />
                )}
                {!isSectionLoading && section === "ajustes" && (
                    <SectionPlaceholder
                        title="Ajustes"
                        description="Preferencias de cuenta, notificaciones y datos de contacto."
                    />
                )}
            </div>
        </div>
    );
}
