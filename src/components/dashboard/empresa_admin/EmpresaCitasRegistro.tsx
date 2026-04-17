import { useCallback, useEffect, useMemo, useState } from "react";
import Skeleton from "react-loading-skeleton";
import { toast } from "react-toastify";
import {
    IoCalendarOutline,
    IoCheckmarkOutline,
    IoCloseOutline,
    IoEyeOutline,
    IoInformationCircleOutline,
    IoSearchOutline,
} from "react-icons/io5";
import type { Miembro } from "../../../types/miembro";
import {
    aprobarCita,
    getCitasPorEmpresa,
    rechazarCita,
    type CitaEmpresaRow,
} from "../../../lib/appwrite";

type EstadoFiltro = "todas" | "pendiente" | "sincronizado" | "cancelado" | "fallido";

const ESTADO_STYLES: Record<string, { label: string; className: string }> = {
    pendiente: { label: "Pendiente", className: "bg-amber-50 text-amber-800" },
    sincronizado: { label: "Aprobada", className: "bg-emerald-50 text-emerald-700" },
    cancelado: { label: "Cancelada", className: "bg-[#F5F3EE] text-[#666666]" },
    fallido: { label: "Rechazada", className: "bg-red-50 text-red-700" },
};

function formatFechaHora(iso: string): string {
    const date = new Date(iso);
    const fecha = new Intl.DateTimeFormat("es-NI", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
    }).format(date);
    const hora = new Intl.DateTimeFormat("es-NI", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "UTC",
    }).format(date);
    return `${fecha} · ${hora}`;
}

export function EmpresaCitasRegistro({ miembro }: { miembro: Miembro }) {
    const [citas, setCitas] = useState<CitaEmpresaRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtro, setFiltro] = useState<EstadoFiltro>("todas");
    const [query, setQuery] = useState("");
    const [actuandoId, setActuandoId] = useState<string | null>(null);
    const [detalle, setDetalle] = useState<CitaEmpresaRow | null>(null);

    const cargar = useCallback(async () => {
        try {
            const rows = await getCitasPorEmpresa(miembro.empresa_id);
            setCitas(rows);
        } catch {
            toast.error("No se pudieron cargar las citas de la empresa.");
        } finally {
            setLoading(false);
        }
    }, [miembro.empresa_id]);

    useEffect(() => {
        void cargar();
    }, [cargar]);

    const filtradas = useMemo(() => {
        const q = query.trim().toLowerCase();
        return citas.filter((c) => {
            if (filtro !== "todas" && c.estado_sync !== filtro) return false;
            if (!q) return true;
            return (
                c.miembro_nombre.toLowerCase().includes(q) ||
                c.paciente_nombre.toLowerCase().includes(q) ||
                c.servicio_nombre.toLowerCase().includes(q) ||
                c.doctor_nombre.toLowerCase().includes(q)
            );
        });
    }, [citas, filtro, query]);

    const counts = useMemo(() => {
        const base: Record<EstadoFiltro, number> = {
            todas: citas.length,
            pendiente: 0,
            sincronizado: 0,
            cancelado: 0,
            fallido: 0,
        };
        for (const c of citas) {
            if (c.estado_sync in base) {
                base[c.estado_sync as EstadoFiltro] += 1;
            }
        }
        return base;
    }, [citas]);

    async function handleAprobar(cita: CitaEmpresaRow) {
        if (!window.confirm(`¿Aprobar la cita de ${cita.paciente_nombre}?`)) return;
        setActuandoId(cita.$id);
        try {
            await aprobarCita(cita.$id);
            setCitas((prev) =>
                prev.map((c) =>
                    c.$id === cita.$id ? { ...c, estado_sync: "sincronizado" } : c,
                ),
            );
            toast.success("Cita aprobada.");
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : "No se pudo aprobar la cita.",
            );
        } finally {
            setActuandoId(null);
        }
    }

    async function handleRechazar(cita: CitaEmpresaRow) {
        if (!window.confirm(`¿Rechazar la cita de ${cita.paciente_nombre}?`)) return;
        setActuandoId(cita.$id);
        try {
            await rechazarCita(cita.$id);
            setCitas((prev) =>
                prev.map((c) =>
                    c.$id === cita.$id ? { ...c, estado_sync: "fallido" } : c,
                ),
            );
            toast.success("Cita rechazada.");
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : "No se pudo rechazar la cita.",
            );
        } finally {
            setActuandoId(null);
        }
    }

    return (
        <div className="space-y-6">
            <header className="rounded-2xl border border-[#0066CC]/15 bg-linear-to-br from-white to-[#0066CC]/6 px-5 py-6 md:px-7">
                <p className="text-sm font-medium text-[#666666]">Administrar empresa</p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#0066CC] md:text-3xl">
                    Registro de citas
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#666666]">
                    Revisa todas las citas agendadas por los miembros de tu empresa.
                    Aprueba las que tengan autorización o recházalas si no proceden.
                </p>
            </header>

            {/* Filtros */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                    {(
                        [
                            { id: "todas", label: "Todas" },
                            { id: "pendiente", label: "Pendientes" },
                            { id: "sincronizado", label: "Aprobadas" },
                            { id: "cancelado", label: "Canceladas" },
                            { id: "fallido", label: "Rechazadas" },
                        ] as Array<{ id: EstadoFiltro; label: string }>
                    ).map((f) => (
                        <button
                            key={f.id}
                            type="button"
                            onClick={() => setFiltro(f.id)}
                            className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                                filtro === f.id
                                    ? "bg-[#0066CC] text-white"
                                    : "bg-white text-[#555555] ring-1 ring-[#E5E5E5] hover:bg-[#F5F3EE]"
                            }`}
                        >
                            {f.label}
                            <span
                                className={`rounded-full px-1.5 text-[10px] ${
                                    filtro === f.id ? "bg-white/20" : "bg-[#F5F3EE] text-[#666666]"
                                }`}
                            >
                                {counts[f.id]}
                            </span>
                        </button>
                    ))}
                </div>
                <label className="relative block w-full sm:w-64">
                    <span className="sr-only">Buscar</span>
                    <IoSearchOutline
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[#AAAAAA]"
                        size={16}
                    />
                    <input
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Buscar por miembro, servicio..."
                        className="w-full rounded-xl border border-[#E5E5E5] bg-white py-2 pl-9 pr-3 text-sm text-[#333333] placeholder:text-[#AAAAAA] focus:border-[#0066CC] focus:outline-none"
                    />
                </label>
            </div>

            {/* Tabla */}
            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} height={58} borderRadius={12} />
                    ))}
                </div>
            ) : filtradas.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#E5E5E5] py-16 text-center">
                    <IoCalendarOutline size={36} className="text-[#CCCCCC]" />
                    <p className="text-sm text-[#666666]">
                        {citas.length === 0
                            ? "Aún no hay citas registradas para esta empresa."
                            : "No hay citas que coincidan con los filtros."}
                    </p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[840px] text-sm">
                            <thead>
                                <tr className="border-b border-[#E5E5E5] bg-[#F5F3EE]/60">
                                    <Th>Miembro</Th>
                                    <Th>Paciente</Th>
                                    <Th>Fecha y hora</Th>
                                    <Th>Servicio</Th>
                                    <Th>Doctor</Th>
                                    <Th>Estado</Th>
                                    <Th align="right">Acciones</Th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E5E5E5]/80">
                                {filtradas.map((c) => {
                                    const estado = ESTADO_STYLES[c.estado_sync] ?? {
                                        label: c.estado_sync,
                                        className: "bg-[#F5F3EE] text-[#666666]",
                                    };
                                    const isPendiente = c.estado_sync === "pendiente";
                                    const actuando = actuandoId === c.$id;

                                    return (
                                        <tr
                                            key={c.$id}
                                            className="transition-colors hover:bg-[#F5F3EE]/40"
                                        >
                                            <td className="px-4 py-3">
                                                <p className="font-semibold text-[#333333]">
                                                    {c.miembro_nombre}
                                                </p>
                                                {!c.para_titular && (
                                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#0066CC]">
                                                        Para tercero
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-[#333333]">
                                                {c.paciente_nombre}
                                            </td>
                                            <td className="px-4 py-3 text-[#333333]">
                                                {formatFechaHora(c.fecha_hora_cita)}
                                            </td>
                                            <td className="px-4 py-3 text-[#666666]">
                                                {c.servicio_nombre}
                                            </td>
                                            <td className="px-4 py-3 text-[#666666]">
                                                {c.doctor_nombre}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${estado.className}`}
                                                >
                                                    {estado.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => setDetalle(c)}
                                                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[#0066CC] transition-colors hover:bg-[#0066CC]/10"
                                                        title="Ver detalle"
                                                        aria-label={`Ver detalle de cita de ${c.paciente_nombre}`}
                                                    >
                                                        <IoEyeOutline size={18} />
                                                    </button>
                                                    {isPendiente && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                disabled={actuando}
                                                                onClick={() => void handleAprobar(c)}
                                                                className="flex h-8 w-8 items-center justify-center rounded-lg text-emerald-600 transition-colors hover:bg-emerald-50 disabled:opacity-40"
                                                                title="Aprobar cita"
                                                                aria-label="Aprobar cita"
                                                            >
                                                                <IoCheckmarkOutline size={18} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={actuando}
                                                                onClick={() => void handleRechazar(c)}
                                                                className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-50 disabled:opacity-40"
                                                                title="Rechazar cita"
                                                                aria-label="Rechazar cita"
                                                            >
                                                                <IoCloseOutline size={18} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {detalle && (
                <DetalleModal
                    cita={detalle}
                    onClose={() => setDetalle(null)}
                    onAprobar={() => {
                        setDetalle(null);
                        void handleAprobar(detalle);
                    }}
                    onRechazar={() => {
                        setDetalle(null);
                        void handleRechazar(detalle);
                    }}
                />
            )}
        </div>
    );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function Th({
    children,
    align = "left",
}: {
    children: React.ReactNode;
    align?: "left" | "right";
}) {
    return (
        <th
            className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#666666] ${
                align === "right" ? "text-right" : "text-left"
            }`}
        >
            {children}
        </th>
    );
}

function DetalleModal({
    cita,
    onClose,
    onAprobar,
    onRechazar,
}: {
    cita: CitaEmpresaRow;
    onClose: () => void;
    onAprobar: () => void;
    onRechazar: () => void;
}) {
    const estado = ESTADO_STYLES[cita.estado_sync] ?? {
        label: cita.estado_sync,
        className: "bg-[#F5F3EE] text-[#666666]",
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            onClick={onClose}
            role="presentation"
        >
            <div
                className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-[#666666]">
                            <IoInformationCircleOutline size={18} />
                            <p className="text-xs font-semibold uppercase tracking-wide">
                                Detalle de la cita
                            </p>
                        </div>
                        <h3 className="mt-1 text-xl font-bold text-[#0066CC]">
                            {cita.paciente_nombre}
                        </h3>
                        <span
                            className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${estado.className}`}
                        >
                            {estado.label}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E5E5E5] text-[#666666] hover:bg-[#F5F3EE]"
                        aria-label="Cerrar detalle"
                    >
                        <IoCloseOutline size={18} />
                    </button>
                </div>

                <dl className="mt-5 space-y-3 text-sm">
                    <DetalleFila label="Miembro registrado" value={cita.miembro_nombre} />
                    <DetalleFila
                        label="Tipo de paciente"
                        value={cita.para_titular ? "Titular" : "Tercero"}
                    />
                    <DetalleFila
                        label="Fecha y hora"
                        value={formatFechaHora(cita.fecha_hora_cita)}
                    />
                    <DetalleFila label="Servicio" value={cita.servicio_nombre} />
                    <DetalleFila label="Doctor" value={cita.doctor_nombre} />
                    <DetalleFila
                        label="Teléfono"
                        value={cita.paciente_telefono ?? "—"}
                    />
                    <DetalleFila
                        label="Correo"
                        value={cita.paciente_correo ?? "—"}
                    />
                    <DetalleFila
                        label="Cédula"
                        value={cita.paciente_cedula ?? "—"}
                    />
                    <DetalleFila
                        label="Motivo"
                        value={cita.motivo_cita ?? "Sin motivo registrado"}
                    />
                </dl>

                {cita.estado_sync === "pendiente" && (
                    <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={onRechazar}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                        >
                            <IoCloseOutline size={18} />
                            Rechazar
                        </button>
                        <button
                            type="button"
                            onClick={onAprobar}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                        >
                            <IoCheckmarkOutline size={18} />
                            Aprobar
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

function DetalleFila({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-start justify-between gap-4 border-b border-[#E5E5E5]/80 pb-2 last:border-0">
            <dt className="text-xs font-semibold uppercase tracking-wide text-[#999999]">
                {label}
            </dt>
            <dd className="max-w-[60%] text-right text-sm text-[#333333]">{value}</dd>
        </div>
    );
}
