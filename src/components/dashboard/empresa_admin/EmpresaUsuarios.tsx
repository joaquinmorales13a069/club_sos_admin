import { useEffect, useMemo, useState } from "react";
import { usePaginacion } from "../../../hooks/usePaginacion";
import { PaginacionControles } from "../shared/PaginacionControles";
import Skeleton from "react-loading-skeleton";
import {
    IoBanOutline,
    IoCheckmarkCircleOutline,
    IoCloseOutline,
    IoPencilOutline,
    IoPeopleOutline,
    IoSearchOutline,
} from "react-icons/io5";
import { toast } from "react-toastify";
import type { Miembro, MiembroRol } from "../../../types/miembro";
import { ROL_LABEL } from "../../../types/miembro";
import {
    getMiembrosPorEmpresa,
    gestionarUsuarioAdmin,
} from "../../../lib/appwrite";

// ── Helpers ──────────────────────────────────────────────────────────────────

const ROL_BADGE: Record<MiembroRol, string> = {
    admin:          "bg-red-100 text-red-700",
    empresa_admin:  "bg-orange-100 text-orange-700",
    miembro:        "bg-gray-100 text-gray-600",
};

const PARENTESCO_LABEL: Record<string, string> = {
    titular:  "Titular",
    conyuge:  "Cónyuge",
    hijo:     "Hijo/a",
    familiar: "Familiar",
};

// ── EditarUsuarioModal ────────────────────────────────────────────────────────

interface EditarUsuarioModalProps {
    miembro: Miembro;
    onClose: () => void;
    onSaved: (updated: Miembro) => void;
}

function EditarUsuarioModal({ miembro, onClose, onSaved }: EditarUsuarioModalProps) {
    const [nombre, setNombre]     = useState(miembro.nombre_completo);
    const [telefono, setTelefono] = useState(miembro.telefono);
    const [correo, setCorreo]     = useState(miembro.correo ?? "");
    const [cedula, setCedula]     = useState(miembro.documento_identidad ?? "");
    const [activo, setActivo]     = useState(miembro.activo);
    const [saving, setSaving]     = useState(false);

    async function handleGuardar() {
        setSaving(true);
        try {
            const datosEditados: Partial<Pick<Miembro, "nombre_completo" | "telefono" | "correo" | "documento_identidad">> = {};
            if (nombre.trim()   !== miembro.nombre_completo)              datosEditados.nombre_completo     = nombre.trim();
            if (telefono.trim() !== miembro.telefono)                     datosEditados.telefono            = telefono.trim();
            if ((correo.trim() || null)  !== miembro.correo)              datosEditados.correo              = correo.trim() || null as unknown as string;
            if ((cedula.trim() || null)  !== miembro.documento_identidad) datosEditados.documento_identidad = cedula.trim() || null as unknown as string;

            if (Object.keys(datosEditados).length > 0) {
                await gestionarUsuarioAdmin("editar_datos", miembro.$id, { datos: datosEditados });
            }
            if (activo !== miembro.activo) {
                await gestionarUsuarioAdmin("toggle_activo", miembro.$id, { activo });
            }

            const updated: Miembro = {
                ...miembro,
                nombre_completo:     nombre.trim(),
                telefono:            telefono.trim(),
                correo:              correo.trim() || null,
                documento_identidad: cedula.trim() || null,
                activo,
            };
            onSaved(updated);
            toast.success("Usuario actualizado.");
            onClose();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Error al guardar.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-lg rounded-2xl bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#E5E5E5] px-6 py-4">
                    <h3 className="text-base font-bold text-[#333333]">Editar miembro</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-[#999999] transition-colors hover:bg-[#F5F3EE] hover:text-[#333333]"
                    >
                        <IoCloseOutline size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="space-y-4 px-6 py-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-[#555555]">
                                Nombre completo
                            </label>
                            <input
                                type="text"
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                                className="w-full rounded-xl border border-[#E5E5E5] px-3 py-2 text-sm text-[#333333] outline-none focus:border-[#0066CC] focus:ring-2 focus:ring-[#0066CC]/20"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-[#555555]">
                                Teléfono
                            </label>
                            <input
                                type="text"
                                value={telefono}
                                onChange={(e) => setTelefono(e.target.value)}
                                className="w-full rounded-xl border border-[#E5E5E5] px-3 py-2 text-sm text-[#333333] outline-none focus:border-[#0066CC] focus:ring-2 focus:ring-[#0066CC]/20"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-[#555555]">
                                Correo (opcional)
                            </label>
                            <input
                                type="email"
                                value={correo}
                                onChange={(e) => setCorreo(e.target.value)}
                                className="w-full rounded-xl border border-[#E5E5E5] px-3 py-2 text-sm text-[#333333] outline-none focus:border-[#0066CC] focus:ring-2 focus:ring-[#0066CC]/20"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-[#555555]">
                                Documento de identidad (opcional)
                            </label>
                            <input
                                type="text"
                                value={cedula}
                                onChange={(e) => setCedula(e.target.value)}
                                className="w-full rounded-xl border border-[#E5E5E5] px-3 py-2 text-sm text-[#333333] outline-none focus:border-[#0066CC] focus:ring-2 focus:ring-[#0066CC]/20"
                            />
                        </div>
                    </div>

                    {/* Estado activo */}
                    <div className="flex items-center justify-between rounded-xl border border-[#E5E5E5] px-4 py-3">
                        <div>
                            <p className="text-sm font-semibold text-[#333333]">Estado de cuenta</p>
                            <p className="text-xs text-[#999999]">
                                {activo ? "La cuenta está activa." : "La cuenta está desactivada."}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setActivo((v) => !v)}
                            className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                                activo
                                    ? "bg-green-100 text-green-700 hover:bg-green-200"
                                    : "bg-red-100 text-red-700 hover:bg-red-200"
                            }`}
                        >
                            {activo ? (
                                <><IoCheckmarkCircleOutline size={15} /> Activo</>
                            ) : (
                                <><IoBanOutline size={15} /> Inactivo</>
                            )}
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 border-t border-[#E5E5E5] px-6 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-[#E5E5E5] px-4 py-2 text-sm font-semibold text-[#666666] transition-colors hover:bg-[#F5F3EE]"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleGuardar}
                        disabled={saving}
                        className="rounded-xl bg-[#0066CC] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0055aa] disabled:opacity-60"
                    >
                        {saving ? "Guardando..." : "Guardar cambios"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── EmpresaUsuarios ───────────────────────────────────────────────────────────

export function EmpresaUsuarios({ miembro }: { miembro: Miembro }) {
    const [miembros, setMiembros]               = useState<Miembro[]>([]);
    const [loading, setLoading]                 = useState(true);
    const [filterBusqueda, setFilterBusqueda]   = useState("");
    const [editTarget, setEditTarget]           = useState<Miembro | null>(null);

    async function cargar() {
        try {
            const m = await getMiembrosPorEmpresa(miembro.empresa_id);
            setMiembros(m);
        } catch {
            toast.error("Error al cargar usuarios.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { void cargar(); }, []);

    const filtered = useMemo(() => {
        const q = filterBusqueda.toLowerCase().trim();
        if (!q) return miembros;
        return miembros.filter(
            (m) => m.nombre_completo.toLowerCase().includes(q) || m.telefono.includes(q),
        );
    }, [miembros, filterBusqueda]);

    const { paginaActual, pagina, totalPaginas, total, setPagina } = usePaginacion(filtered, 20);

    function handleSaved(updated: Miembro) {
        setMiembros((prev) => prev.map((m) => (m.$id === updated.$id ? updated : m)));
    }

    if (loading) return <LoadingSkeleton />;

    return (
        <section className="flex flex-col gap-6">
            {/* Header */}
            <header className="flex flex-col gap-4 rounded-2xl border border-[#0066CC]/15 bg-linear-to-br from-white to-[#0066CC]/6 px-5 py-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm font-medium text-[#666666]">Administrar Empresa</p>
                    <h2 className="mt-1 text-2xl font-bold text-[#0066CC] md:text-3xl">Gestionar Usuarios</h2>
                    <p className="mt-1 text-sm text-[#666666]">
                        {filtered.length} de {miembros.length} miembro{miembros.length !== 1 ? "s" : ""}
                    </p>
                </div>
                <div className="flex items-center gap-2 self-start rounded-2xl border border-[#0066CC]/15 bg-white px-4 py-2.5">
                    <IoPeopleOutline size={20} className="text-[#0066CC]" />
                    <span className="text-sm font-semibold text-[#0066CC]">{miembros.length} total</span>
                </div>
            </header>

            {/* Filtro */}
            <div className="relative">
                <IoSearchOutline size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#AAAAAA]" />
                <input
                    type="text"
                    placeholder="Buscar por nombre o teléfono..."
                    value={filterBusqueda}
                    onChange={(e) => setFilterBusqueda(e.target.value)}
                    className="w-full rounded-xl border border-[#E5E5E5] py-2.5 pl-9 pr-3 text-sm text-[#333333] outline-none focus:border-[#0066CC] focus:ring-2 focus:ring-[#0066CC]/20"
                />
            </div>

            {/* Tabla */}
            <div className="overflow-x-auto rounded-2xl border border-[#E5E5E5]">
                <table className="min-w-full text-sm">
                    <thead>
                        <tr className="border-b border-[#E5E5E5] bg-[#F5F3EE]/60">
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#999999]">Nombre</th>
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#999999]">Rol</th>
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#999999]">Parentesco</th>
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#999999]">Estado</th>
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#999999]">Teléfono</th>
                            <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-[#999999]">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E5E5] bg-white">
                        {paginaActual.length === 0 && filtered.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-10 text-center text-sm text-[#999999]">
                                    No se encontraron miembros con los filtros aplicados.
                                </td>
                            </tr>
                        ) : (
                            paginaActual.map((m) => (
                                <tr key={m.$id} className="transition-colors hover:bg-[#F5F3EE]/40">
                                    <td className="px-4 py-3 font-medium text-[#333333]">{m.nombre_completo}</td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROL_BADGE[m.rol]}`}>
                                            {ROL_LABEL[m.rol]}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-[#666666]">
                                        {PARENTESCO_LABEL[m.parentesco] ?? m.parentesco}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                            m.activo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                        }`}>
                                            {m.activo ? (
                                                <><IoCheckmarkCircleOutline size={12} /> Activo</>
                                            ) : (
                                                <><IoBanOutline size={12} /> Inactivo</>
                                            )}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-[#666666]">{m.telefono}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => setEditTarget(m)}
                                                title="Editar miembro"
                                                className="rounded-lg p-1.5 text-[#0066CC] transition-colors hover:bg-[#0066CC]/10"
                                            >
                                                <IoPencilOutline size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <PaginacionControles pagina={pagina} totalPaginas={totalPaginas} total={total} porPagina={20} onCambiar={setPagina} />

            {/* Modal */}
            {editTarget && (
                <EditarUsuarioModal
                    miembro={editTarget}
                    onClose={() => setEditTarget(null)}
                    onSaved={handleSaved}
                />
            )}
        </section>
    );
}

// ── LoadingSkeleton ───────────────────────────────────────────────────────────

function LoadingSkeleton() {
    return (
        <section className="flex flex-col gap-6">
            <div className="rounded-2xl border border-[#E5E5E5] bg-white p-6">
                <Skeleton height={28} width="35%" />
                <Skeleton className="mt-2" width="20%" />
            </div>
            <Skeleton height={44} />
            <div className="rounded-2xl border border-[#E5E5E5] bg-white p-4">
                <Skeleton count={5} height={44} className="mb-1" />
            </div>
        </section>
    );
}
