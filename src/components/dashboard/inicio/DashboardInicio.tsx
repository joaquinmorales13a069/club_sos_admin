import { useEffect, useState } from "react";
import Skeleton from "react-loading-skeleton";
import {
    IoCalendarOutline,
    IoChevronForward,
    IoCloudDownloadOutline,
    IoDocumentTextOutline,
    IoGiftOutline,
    IoNotificationsOutline,
    IoPersonOutline,
    IoStatsChartOutline,
} from "react-icons/io5";
import type { Beneficio, DocumentoMedico, Miembro } from "../../../types/miembro";
import type { MiembroDashboardSection } from "../../../types/dashboard";
import {
    descargarDocumento,
    getBeneficiosDisponibles,
    getDocumentosRecientes,
} from "../../../lib/appwrite";
import { HomeCard } from "../shared/HomeCard";

// ── Mocks temporales ─────────────────────────────────────────────────────────

const MOCK_PROXIMA_CITA = {
    fecha: "15 abr. 2026",
    hora: "10:30",
    especialidad: "Medicina general",
    lugar: "Clínica SOS Medical — Managua",
    estado: "confirmada" as const,
};

const MOCK_AVISOS = [
    "Renueva tu carnet antes del 30 de abril.",
    "Tienes un mensaje del equipo de bienestar.",
];

// ── Componente ───────────────────────────────────────────────────────────────

export function DashboardInicio({
    miembro,
    onNavigate,
}: {
    miembro: Miembro;
    onNavigate: (section: MiembroDashboardSection) => void;
}) {
    const primerNombre = miembro.nombre_completo.split(" ")[0];
    const [beneficios, setBeneficios] = useState<Beneficio[]>([]);
    const [loadingBeneficios, setLoadingBeneficios] = useState(true);
    const [documentos, setDocumentos] = useState<DocumentoMedico[]>([]);
    const [loadingDocumentos, setLoadingDocumentos] = useState(true);
    const [descargando, setDescargando] = useState<string | null>(null);

    useEffect(() => {
        getBeneficiosDisponibles(miembro.empresa_id, 3)
            .then(setBeneficios)
            .finally(() => setLoadingBeneficios(false));
    }, [miembro.empresa_id]);

    useEffect(() => {
        getDocumentosRecientes(miembro.$id, 3)
            .then(setDocumentos)
            .finally(() => setLoadingDocumentos(false));
    }, [miembro.$id]);

    async function handleDescargar(doc: DocumentoMedico) {
        setDescargando(doc.$id);
        try {
            await descargarDocumento(
                doc.storage_archivo_id,
                `${doc.nombre_documento}.${doc.tipo_archivo}`,
            );
        } finally {
            setDescargando(null);
        }
    }

    return (
        <div className="space-y-6">
            <header className="rounded-2xl border border-[#0066CC]/15 bg-linear-to-br from-white to-[#0066CC]/6 px-5 py-6 md:px-7">
                <p className="text-sm font-medium text-[#666666]">Resumen personal</p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#0066CC] md:text-3xl">
                    Bienvenido, {primerNombre}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#666666]">
                    Aquí ves un vistazo de tu próxima cita, documentos recientes y beneficios activos.
                </p>
            </header>

            <div className="grid gap-4 lg:grid-cols-2">
                {/* Documentos recientes */}
                <HomeCard title="Documentos recientes" icon={<IoDocumentTextOutline size={22} />}>
                    {loadingDocumentos ? (
                        <div className="space-y-3">
                            <Skeleton height={56} borderRadius={12} />
                            <Skeleton height={56} borderRadius={12} />
                            <Skeleton height={56} borderRadius={12} />
                        </div>
                    ) : documentos.length === 0 ? (
                        <p className="py-4 text-center text-sm text-[#666666]">
                            No hay documentos disponibles.
                        </p>
                    ) : (
                        <ul className="space-y-3">
                            {documentos.map((doc) => (
                                <li
                                    key={doc.$id}
                                    className="flex items-center justify-between gap-2 border-b border-[#E5E5E5]/80 pb-3 last:border-0 last:pb-0"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-[#333333]">
                                            {doc.nombre_documento}
                                        </p>
                                        <p className="text-xs text-[#666666]">
                                            {new Date(doc.fecha_documento).toLocaleDateString("es-NI", {
                                                day: "numeric",
                                                month: "short",
                                                year: "numeric",
                                            })}
                                            {" · "}
                                            {doc.tipo_documento}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2">
                                        <span className="rounded-md bg-[#F5F3EE] px-2 py-0.5 text-[10px] font-semibold uppercase text-[#666666]">
                                            {doc.tipo_archivo}
                                        </span>
                                        <button
                                            type="button"
                                            disabled={descargando === doc.$id}
                                            onClick={() => handleDescargar(doc)}
                                            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#0066CC] transition-colors hover:bg-[#0066CC]/10 disabled:opacity-50"
                                            title="Descargar documento"
                                            aria-label={`Descargar ${doc.nombre_documento}`}
                                        >
                                            {descargando === doc.$id ? (
                                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0066CC] border-t-transparent" />
                                            ) : (
                                                <IoCloudDownloadOutline size={18} />
                                            )}
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </HomeCard>

                {/* Beneficios activos */}
                <HomeCard title="Beneficios activos" icon={<IoGiftOutline size={22} />}>
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
                                <li key={b.$id} className="rounded-xl bg-[#F5F3EE]/80 px-3 py-3">
                                    <p className="font-semibold text-[#333333]">{b.titulo}</p>
                                    <p className="mt-0.5 text-sm text-[#666666]">{b.descripcion}</p>
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

                {/* Próxima cita */}
                <HomeCard title="Próxima cita" icon={<IoCalendarOutline size={22} />}>
                    <div className="flex flex-col gap-4">
                        <div className="space-y-1">
                            <p className="text-base font-semibold text-[#333333]">
                                {MOCK_PROXIMA_CITA.especialidad}
                            </p>
                            <p className="text-sm text-[#666666]">
                                {MOCK_PROXIMA_CITA.fecha} · {MOCK_PROXIMA_CITA.hora}
                            </p>
                            <p className="text-sm text-[#666666]">{MOCK_PROXIMA_CITA.lugar}</p>
                            <span className="inline-flex w-fit rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                                {MOCK_PROXIMA_CITA.estado === "confirmada" ? "Confirmada" : "Pendiente"}
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

                {/* Avisos */}
                <HomeCard title="Avisos" icon={<IoNotificationsOutline size={22} />}>
                    <ul className="space-y-3">
                        {MOCK_AVISOS.map((texto, i) => (
                            <li
                                key={i}
                                className="flex gap-3 rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2.5 text-sm text-[#5c4a00]"
                            >
                                <span className="mt-0.5 shrink-0 text-amber-600" aria-hidden>•</span>
                                <span>{texto}</span>
                            </li>
                        ))}
                    </ul>
                </HomeCard>

                {/* Accesos rápidos */}
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
