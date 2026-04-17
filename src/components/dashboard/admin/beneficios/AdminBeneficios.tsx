import { useEffect, useState } from "react";
import Skeleton from "react-loading-skeleton";
import {
    IoAddOutline,
    IoCreateOutline,
    IoGiftOutline,
    IoImageOutline,
    IoTrashOutline,
} from "react-icons/io5";
import type { Beneficio } from "../../../../types/miembro";
import type { Empresa } from "../../../../types/signup";
import { eliminarBeneficio, getBeneficiosAdmin, getTodasLasEmpresas } from "../../../../lib/appwrite";
import { BeneficioFormModal } from "./BeneficioFormModal";

const TIPO_LABEL: Record<string, string> = {
    descuento: "Descuento",
    promocion: "Promoción",
    anuncio: "Anuncio",
};

const ESTADO_STYLES: Record<string, string> = {
    activa: "bg-emerald-50 text-emerald-700",
    expirada: "bg-[#F5F3EE] text-[#666666]",
};

export function AdminBeneficios() {
    const [beneficios, setBeneficios] = useState<Beneficio[]>([]);
    const [empresas, setEmpresas] = useState<Empresa[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Beneficio | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    async function cargar() {
        const [bs, es] = await Promise.all([getBeneficiosAdmin(), getTodasLasEmpresas()]);
        setBeneficios(bs);
        setEmpresas(es);
        setLoading(false);
    }

    useEffect(() => { cargar(); }, []);

    function empresaNombre(id: string) {
        return empresas.find((e) => e.$id === id)?.nombre_empresa ?? id;
    }

    function abrirCrear() { setEditTarget(null); setModalOpen(true); }
    function abrirEditar(b: Beneficio) { setEditTarget(b); setModalOpen(true); }

    async function confirmarEliminar(id: string) {
        setDeleting(true);
        try {
            await eliminarBeneficio(id);
            setBeneficios((prev) => prev.filter((b) => b.$id !== id));
        } finally {
            setDeleting(false);
            setConfirmDeleteId(null);
        }
    }

    return (
        <div className="space-y-6">
            <header className="flex flex-col gap-4 rounded-2xl border border-[#0066CC]/15 bg-linear-to-br from-white to-[#0066CC]/6 px-5 py-6 sm:flex-row sm:items-center sm:justify-between md:px-7">
                <div>
                    <p className="text-sm font-medium text-[#666666]">Administración</p>
                    <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#0066CC] md:text-3xl">
                        Gestión de beneficios
                    </h2>
                    <p className="mt-1 text-sm text-[#666666]">
                        {beneficios.length} beneficio{beneficios.length !== 1 ? "s" : ""} en total
                    </p>
                </div>
                <button
                    type="button"
                    onClick={abrirCrear}
                    className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl bg-[#0066CC] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0055aa] sm:self-auto"
                >
                    <IoAddOutline size={20} />
                    Agregar beneficio
                </button>
            </header>

            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} height={64} borderRadius={12} />
                    ))}
                </div>
            ) : beneficios.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#E5E5E5] py-16 text-center">
                    <IoGiftOutline size={36} className="text-[#CCCCCC]" />
                    <p className="text-sm text-[#666666]">No hay beneficios creados aún.</p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px] text-sm">
                            <thead>
                                <tr className="border-b border-[#E5E5E5] bg-[#F5F3EE]/60">
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#666666]">Imagen</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#666666]">Título</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#666666]">Tipo</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#666666]">Estado</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#666666]">Empresas</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#666666]">Fecha fin</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[#666666]">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E5E5E5]/80">
                                {beneficios.map((b) => (
                                    <tr key={b.$id} className="transition-colors hover:bg-[#F5F3EE]/40">
                                        <td className="px-4 py-3">
                                            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-[#E5E5E5] bg-[#F5F3EE]">
                                                {b.beneficio_image_url ? (
                                                    <img src={b.beneficio_image_url} alt={b.titulo} className="h-full w-full object-cover" />
                                                ) : (
                                                    <IoImageOutline size={18} className="text-[#CCCCCC]" />
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="font-semibold text-[#333333]">{b.titulo}</p>
                                            <p className="line-clamp-1 text-xs text-[#666666]">{b.descripcion}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            {b.tipo_beneficio ? (
                                                <span className="rounded-full bg-[#F5F3EE] px-2.5 py-0.5 text-xs font-semibold text-[#666666]">
                                                    {TIPO_LABEL[b.tipo_beneficio] ?? b.tipo_beneficio}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-[#CCCCCC]">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${ESTADO_STYLES[b.estado_beneficio] ?? "bg-[#F5F3EE] text-[#666666]"}`}>
                                                {b.estado_beneficio}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {b.empresa_id.length === 0 ? (
                                                <span className="rounded-full bg-[#0066CC]/10 px-2.5 py-0.5 text-xs font-semibold text-[#0066CC]">Global</span>
                                            ) : (
                                                <div className="flex flex-wrap gap-1">
                                                    {b.empresa_id.map((id) => (
                                                        <span key={id} className="rounded-full bg-[#F5F3EE] px-2 py-0.5 text-xs text-[#333333]">
                                                            {empresaNombre(id)}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-[#666666]">
                                            {b.fecha_fin
                                                ? new Date(b.fecha_fin).toLocaleDateString("es-NI", { day: "numeric", month: "short", year: "numeric" })
                                                : <span className="text-[#CCCCCC]">Sin fecha</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                            {confirmDeleteId === b.$id ? (
                                                <div className="flex items-center justify-end gap-2">
                                                    <span className="text-xs text-[#666666]">¿Eliminar?</span>
                                                    <button type="button" disabled={deleting} onClick={() => confirmarEliminar(b.$id)} className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                                                        {deleting ? "..." : "Sí"}
                                                    </button>
                                                    <button type="button" onClick={() => setConfirmDeleteId(null)} className="rounded-lg border border-[#E5E5E5] px-2.5 py-1 text-xs font-semibold text-[#666666] hover:bg-[#F5F3EE]">
                                                        No
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-end gap-1">
                                                    <button type="button" onClick={() => abrirEditar(b)} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#0066CC] transition-colors hover:bg-[#0066CC]/10" title="Editar">
                                                        <IoCreateOutline size={18} />
                                                    </button>
                                                    <button type="button" onClick={() => setConfirmDeleteId(b.$id)} className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-50" title="Eliminar">
                                                        <IoTrashOutline size={18} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {modalOpen && (
                <BeneficioFormModal
                    beneficio={editTarget}
                    empresas={empresas}
                    onClose={() => setModalOpen(false)}
                    onSaved={() => { setLoading(true); cargar(); }}
                />
            )}
        </div>
    );
}
