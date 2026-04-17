import { useEffect, useState } from "react";
import { usePaginacion } from "../../../../hooks/usePaginacion";
import { PaginacionControles } from "../../shared/PaginacionControles";
import Skeleton from "react-loading-skeleton";
import {
    IoBanOutline,
    IoCheckmarkCircleOutline,
    IoPeopleOutline,
} from "react-icons/io5";
import { toast } from "react-toastify";
import type { Miembro } from "../../../../types/miembro";
import { getFamiliaresPorTitular, gestionarUsuarioAdmin } from "../../../../lib/appwrite";

// ── Helpers ──────────────────────────────────────────────────────────────────

const PARENTESCO_LABEL: Record<string, string> = {
    conyuge:  "Cónyuge",
    hijo:     "Hijo/a",
    familiar: "Familiar",
};

// ── MiFamilia ─────────────────────────────────────────────────────────────────

export function MiFamilia({ miembro }: { miembro: Miembro }) {
    const [familiares, setFamiliares] = useState<Miembro[]>([]);
    const [loading, setLoading]       = useState(true);
    const [toggling, setToggling]     = useState<string | null>(null); // $id del miembro en proceso

    useEffect(() => {
        getFamiliaresPorTitular(miembro.$id)
            .then(setFamiliares)
            .catch(() => toast.error("Error al cargar tu grupo familiar."))
            .finally(() => setLoading(false));
    }, [miembro.$id]);

    async function handleToggleActivo(familiar: Miembro) {
        setToggling(familiar.$id);
        const nuevoEstado = !familiar.activo;
        try {
            await gestionarUsuarioAdmin("toggle_activo", familiar.$id, { activo: nuevoEstado });
            setFamiliares((prev) =>
                prev.map((f) => (f.$id === familiar.$id ? { ...f, activo: nuevoEstado } : f)),
            );
            toast.success(
                nuevoEstado
                    ? `Cuenta de ${familiar.nombre_completo} activada.`
                    : `Cuenta de ${familiar.nombre_completo} desactivada.`,
            );
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Error al cambiar el estado.");
        } finally {
            setToggling(null);
        }
    }

    const { paginaActual, pagina, totalPaginas, total, setPagina } = usePaginacion(familiares, 10);

    if (loading) return <LoadingSkeleton />;

    return (
        <section className="flex flex-col gap-6">
            {/* Header */}
            <header className="flex flex-col gap-4 rounded-2xl border border-[#0066CC]/15 bg-linear-to-br from-white to-[#0066CC]/6 px-5 py-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm font-medium text-[#666666]">Mi perfil</p>
                    <h2 className="mt-1 text-2xl font-bold text-[#0066CC] md:text-3xl">Mi Familia</h2>
                    <p className="mt-1 text-sm text-[#666666]">
                        {familiares.length === 0
                            ? "No tienes familiares vinculados."
                            : `${familiares.length} miembro${familiares.length !== 1 ? "s" : ""} en tu grupo familiar`}
                    </p>
                </div>
                <div className="flex items-center gap-2 self-start rounded-2xl border border-[#0066CC]/15 bg-white px-4 py-2.5">
                    <IoPeopleOutline size={20} className="text-[#0066CC]" />
                    <span className="text-sm font-semibold text-[#0066CC]">{familiares.length} familiar{familiares.length !== 1 ? "es" : ""}</span>
                </div>
            </header>

            {familiares.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#E5E5E5] py-14 text-center">
                    <IoPeopleOutline size={36} className="text-[#CCCCCC]" />
                    <p className="text-sm text-[#999999]">No tienes familiares vinculados a tu cuenta.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {paginaActual.map((f) => (
                        <div
                            key={f.$id}
                            className="flex items-center justify-between rounded-2xl border border-[#E5E5E5] bg-white px-5 py-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]"
                        >
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-semibold text-[#333333]">{f.nombre_completo}</p>
                                <p className="mt-0.5 text-xs text-[#999999]">
                                    {PARENTESCO_LABEL[f.parentesco] ?? f.parentesco}
                                    {f.telefono && <> · {f.telefono}</>}
                                </p>
                            </div>

                            <div className="ml-4 flex shrink-0 items-center gap-3">
                                {/* Badge estado */}
                                <span className={`hidden items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold sm:inline-flex ${
                                    f.activo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                }`}>
                                    {f.activo
                                        ? <><IoCheckmarkCircleOutline size={12} /> Activo</>
                                        : <><IoBanOutline size={12} /> Inactivo</>}
                                </span>

                                {/* Botón toggle */}
                                <button
                                    type="button"
                                    onClick={() => handleToggleActivo(f)}
                                    disabled={toggling === f.$id}
                                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60 ${
                                        f.activo
                                            ? "bg-red-100 text-red-700 hover:bg-red-200"
                                            : "bg-green-100 text-green-700 hover:bg-green-200"
                                    }`}
                                >
                                    {toggling === f.$id
                                        ? "..."
                                        : f.activo ? "Desactivar" : "Activar"}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <PaginacionControles pagina={pagina} totalPaginas={totalPaginas} total={total} porPagina={10} onCambiar={setPagina} />
        </section>
    );
}

// ── LoadingSkeleton ───────────────────────────────────────────────────────────

function LoadingSkeleton() {
    return (
        <section className="flex flex-col gap-6">
            <div className="rounded-2xl border border-[#E5E5E5] bg-white p-6">
                <Skeleton height={28} width="30%" />
                <Skeleton className="mt-2" width="40%" />
            </div>
            <Skeleton height={72} count={3} className="mb-2" />
        </section>
    );
}
