import { useEffect, useMemo, useState } from "react";
import { usePaginacion } from "../../../../hooks/usePaginacion";
import { PaginacionControles } from "../../shared/PaginacionControles";
import Skeleton from "react-loading-skeleton";
import {
    IoBanOutline,
    IoBusinessOutline,
    IoCheckmarkCircleOutline,
    IoCloseOutline,
    IoKeyOutline,
    IoPencilOutline,
    IoAddOutline,
    IoRefreshOutline,
    IoSearchOutline,
} from "react-icons/io5";
import { toast } from "react-toastify";
import type { Empresa } from "../../../../types/signup";
import {
    crearEmpresaAdmin,
    actualizarEmpresaAdmin,
    getTodasLasEmpresas,
    toggleEstadoEmpresa,
} from "../../../../lib/appwrite";

// ── Helpers ───────────────────────────────────────────────────────────────────

function generarCodigoAleatorio(len = 8): string {
    const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let out = "";
    for (let i = 0; i < len; i++) {
        out += alfabeto.charAt(Math.floor(Math.random() * alfabeto.length));
    }
    return out;
}

// ── EmpresaFormModal ──────────────────────────────────────────────────────────

interface EmpresaFormModalProps {
    empresa: Empresa | null; // null = crear
    onClose: () => void;
    onSaved: (empresa: Empresa) => void;
}

function EmpresaFormModal({ empresa, onClose, onSaved }: EmpresaFormModalProps) {
    const modoEdicion = empresa !== null;

    const [nombre, setNombre] = useState(empresa?.nombre_empresa ?? "");
    const [codigo, setCodigo] = useState(empresa?.codigo_empresa ?? generarCodigoAleatorio());
    const [notas, setNotas]   = useState(empresa?.notas ?? "");
    const [estado, setEstado] = useState<"activo" | "inactivo">(empresa?.estado ?? "activo");
    const [saving, setSaving] = useState(false);

    function handleRegenerar() {
        if (modoEdicion && !window.confirm("Generarás un código nuevo. Los miembros deberán usar el código actualizado para registrarse.")) {
            return;
        }
        setCodigo(generarCodigoAleatorio());
    }

    async function handleGuardar() {
        const nombreTrim = nombre.trim();
        const codigoTrim = codigo.trim().toUpperCase();

        if (!nombreTrim) {
            toast.error("El nombre de la empresa es obligatorio.");
            return;
        }
        if (!codigoTrim || codigoTrim.length < 4) {
            toast.error("El código debe tener al menos 4 caracteres.");
            return;
        }

        setSaving(true);
        try {
            let result: Empresa;
            if (modoEdicion) {
                const cambios: Partial<Pick<Empresa, "nombre_empresa" | "codigo_empresa" | "notas" | "estado">> = {};
                if (nombreTrim !== empresa.nombre_empresa)          cambios.nombre_empresa = nombreTrim;
                if (codigoTrim !== empresa.codigo_empresa)          cambios.codigo_empresa = codigoTrim;
                if ((notas.trim() || undefined) !== empresa.notas)  cambios.notas          = notas.trim() || undefined;
                if (estado !== empresa.estado)                       cambios.estado         = estado;

                if (Object.keys(cambios).length === 0) {
                    toast.info("Sin cambios para guardar.");
                    onClose();
                    return;
                }
                result = await actualizarEmpresaAdmin(empresa.$id, cambios);
                toast.success("Empresa actualizada.");
            } else {
                result = await crearEmpresaAdmin({
                    nombre_empresa: nombreTrim,
                    codigo_empresa: codigoTrim,
                    notas: notas.trim() || undefined,
                });
                toast.success("Empresa creada.");
            }
            onSaved(result);
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
                    <div>
                        <h3 className="text-base font-bold text-[#333333]">
                            {modoEdicion ? "Editar empresa" : "Nueva empresa"}
                        </h3>
                        {modoEdicion && (
                            <p className="text-xs text-[#999999]">ID: {empresa.$id.slice(0, 12)}…</p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-[#999999] transition-colors hover:bg-[#F5F3EE] hover:text-[#333333]"
                    >
                        <IoCloseOutline size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="space-y-5 px-6 py-5">
                    {/* Nombre */}
                    <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#666666]">
                            Nombre de la empresa
                        </label>
                        <input
                            type="text"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            maxLength={120}
                            autoComplete="organization"
                            placeholder="Ej. Corporación ABC S.A."
                            className="w-full rounded-xl border border-[#E5E5E5] px-4 py-2.5 text-sm text-[#333333] outline-none focus:border-[#0066CC] focus:ring-2 focus:ring-[#0066CC]/20"
                        />
                    </div>

                    {/* Código */}
                    <div>
                        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#666666]">
                            <IoKeyOutline size={13} className="text-[#0066CC]" />
                            Código de vinculación
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={codigo}
                                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                                maxLength={32}
                                autoComplete="off"
                                className="min-w-0 flex-1 rounded-xl border border-[#E5E5E5] px-4 py-2.5 font-mono text-sm font-semibold tracking-wider text-[#0066CC] outline-none focus:border-[#0066CC] focus:ring-2 focus:ring-[#0066CC]/20"
                            />
                            <button
                                type="button"
                                onClick={handleRegenerar}
                                title="Generar código aleatorio"
                                className="inline-flex items-center gap-2 rounded-xl border border-[#E5E5E5] px-3 py-2.5 text-sm font-semibold text-[#0066CC] transition-colors hover:bg-[#F5F3EE]"
                            >
                                <IoRefreshOutline size={16} />
                                Generar
                            </button>
                        </div>
                        <p className="mt-1.5 text-[11px] text-amber-700">
                            Los miembros ingresan este código al registrarse para asociarse a la empresa.
                        </p>
                    </div>

                    {/* Estado (solo edición) */}
                    {modoEdicion && (
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#666666]">
                                Estado
                            </label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setEstado("activo")}
                                    className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                                        estado === "activo"
                                            ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300"
                                            : "border border-[#E5E5E5] text-[#999999] hover:bg-[#F5F3EE]"
                                    }`}
                                >
                                    <IoCheckmarkCircleOutline size={16} />
                                    Activo
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEstado("inactivo")}
                                    className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                                        estado === "inactivo"
                                            ? "bg-red-100 text-red-700 ring-1 ring-red-300"
                                            : "border border-[#E5E5E5] text-[#999999] hover:bg-[#F5F3EE]"
                                    }`}
                                >
                                    <IoBanOutline size={16} />
                                    Inactivo
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Notas */}
                    <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#666666]">
                            Notas internas (opcional)
                        </label>
                        <textarea
                            value={notas}
                            onChange={(e) => setNotas(e.target.value)}
                            rows={3}
                            maxLength={1000}
                            placeholder="Información adicional sobre la empresa o el contrato."
                            className="w-full resize-y rounded-xl border border-[#E5E5E5] px-4 py-2.5 text-sm text-[#333333] placeholder:text-[#AAAAAA] outline-none focus:border-[#0066CC] focus:ring-2 focus:ring-[#0066CC]/20"
                        />
                        <p className="mt-1 text-right text-[10px] text-[#AAAAAA]">{notas.length}/1000</p>
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
                        {saving ? "Guardando..." : modoEdicion ? "Guardar cambios" : "Crear empresa"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── AdminEmpresas ─────────────────────────────────────────────────────────────

export function AdminEmpresas() {
    const [empresas, setEmpresas]         = useState<Empresa[]>([]);
    const [loading, setLoading]           = useState(true);
    const [filterBusqueda, setFilterBusqueda] = useState("");
    const [filterEstado, setFilterEstado] = useState<"" | "activo" | "inactivo">("");
    const [modalTarget, setModalTarget]   = useState<Empresa | null | undefined>(undefined);
    // undefined = cerrado, null = crear, Empresa = editar

    async function cargar() {
        try {
            const data = await getTodasLasEmpresas();
            setEmpresas(data);
        } catch {
            toast.error("Error al cargar empresas.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { void cargar(); }, []);

    const filtered = useMemo(() => {
        const q = filterBusqueda.toLowerCase().trim();
        return empresas.filter((e) => {
            if (filterEstado && e.estado !== filterEstado) return false;
            if (q && !e.nombre_empresa.toLowerCase().includes(q) && !e.codigo_empresa.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [empresas, filterBusqueda, filterEstado]);

    const { paginaActual, pagina, totalPaginas, total, setPagina } = usePaginacion(filtered, 20);

    async function handleToggleEstado(empresa: Empresa) {
        const accion = empresa.estado === "activo" ? "desactivar" : "activar";
        if (!window.confirm(`¿Seguro que deseas ${accion} la empresa "${empresa.nombre_empresa}"?`)) return;
        try {
            const actualizada = await toggleEstadoEmpresa(empresa.$id);
            setEmpresas((prev) => prev.map((e) => (e.$id === actualizada.$id ? actualizada : e)));
            toast.success(`Empresa ${accion === "activar" ? "activada" : "desactivada"}.`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Error al cambiar el estado.");
        }
    }

    function handleSaved(empresa: Empresa) {
        setEmpresas((prev) => {
            const exists = prev.some((e) => e.$id === empresa.$id);
            if (exists) return prev.map((e) => (e.$id === empresa.$id ? empresa : e));
            return [empresa, ...prev];
        });
    }

    if (loading) return <LoadingSkeleton />;

    return (
        <section className="flex flex-col gap-6">
            {/* Header */}
            <header className="flex flex-col gap-4 rounded-2xl border border-[#0066CC]/15 bg-linear-to-br from-white to-[#0066CC]/6 px-5 py-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm font-medium text-[#666666]">Administración</p>
                    <h2 className="mt-1 text-2xl font-bold text-[#0066CC] md:text-3xl">Gestionar Empresas</h2>
                    <p className="mt-1 text-sm text-[#666666]">
                        {filtered.length} de {empresas.length} empresa{empresas.length !== 1 ? "s" : ""}
                    </p>
                </div>
                <div className="flex items-center gap-3 self-start">
                    <div className="flex items-center gap-2 rounded-2xl border border-[#0066CC]/15 bg-white px-4 py-2.5">
                        <IoBusinessOutline size={20} className="text-[#0066CC]" />
                        <span className="text-sm font-semibold text-[#0066CC]">{empresas.length} total</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setModalTarget(null)}
                        className="inline-flex items-center gap-2 rounded-2xl bg-[#0066CC] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0055aa]"
                    >
                        <IoAddOutline size={18} />
                        Nueva empresa
                    </button>
                </div>
            </header>

            {/* Filtros */}
            <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                    <IoSearchOutline size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#AAAAAA]" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o código..."
                        value={filterBusqueda}
                        onChange={(e) => setFilterBusqueda(e.target.value)}
                        className="w-full rounded-xl border border-[#E5E5E5] py-2.5 pl-9 pr-3 text-sm text-[#333333] outline-none focus:border-[#0066CC] focus:ring-2 focus:ring-[#0066CC]/20"
                    />
                </div>
                <select
                    value={filterEstado}
                    onChange={(e) => setFilterEstado(e.target.value as "" | "activo" | "inactivo")}
                    className="rounded-xl border border-[#E5E5E5] px-3 py-2.5 text-sm text-[#333333] outline-none focus:border-[#0066CC] focus:ring-2 focus:ring-[#0066CC]/20 sm:w-44"
                >
                    <option value="">Todos los estados</option>
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                </select>
            </div>

            {/* Tabla */}
            <div className="overflow-x-auto rounded-2xl border border-[#E5E5E5]">
                <table className="min-w-full text-sm">
                    <thead>
                        <tr className="border-b border-[#E5E5E5] bg-[#F5F3EE]/60">
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#999999]">Empresa</th>
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#999999]">Código</th>
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#999999]">Estado</th>
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#999999]">Notas</th>
                            <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-[#999999]">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E5E5] bg-white">
                        {paginaActual.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-10 text-center text-sm text-[#999999]">
                                    No se encontraron empresas con los filtros aplicados.
                                </td>
                            </tr>
                        ) : (
                            paginaActual.map((empresa) => (
                                <tr key={empresa.$id} className="transition-colors hover:bg-[#F5F3EE]/40">
                                    <td className="px-4 py-3 font-medium text-[#333333]">
                                        {empresa.nombre_empresa}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="rounded-lg bg-[#F5F3EE] px-2.5 py-1 font-mono text-xs font-semibold tracking-wider text-[#0066CC]">
                                            {empresa.codigo_empresa}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                            empresa.estado === "activo"
                                                ? "bg-emerald-100 text-emerald-700"
                                                : "bg-red-100 text-red-700"
                                        }`}>
                                            {empresa.estado === "activo" ? (
                                                <><IoCheckmarkCircleOutline size={12} /> Activo</>
                                            ) : (
                                                <><IoBanOutline size={12} /> Inactivo</>
                                            )}
                                        </span>
                                    </td>
                                    <td className="max-w-[200px] truncate px-4 py-3 text-xs text-[#999999]">
                                        {empresa.notas ?? <span className="italic">—</span>}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex justify-end gap-1">
                                            <button
                                                type="button"
                                                onClick={() => setModalTarget(empresa)}
                                                title="Editar empresa"
                                                className="rounded-lg p-1.5 text-[#0066CC] transition-colors hover:bg-[#0066CC]/10"
                                            >
                                                <IoPencilOutline size={16} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleToggleEstado(empresa)}
                                                title={empresa.estado === "activo" ? "Desactivar empresa" : "Activar empresa"}
                                                className={`rounded-lg p-1.5 transition-colors ${
                                                    empresa.estado === "activo"
                                                        ? "text-red-500 hover:bg-red-50"
                                                        : "text-emerald-600 hover:bg-emerald-50"
                                                }`}
                                            >
                                                {empresa.estado === "activo" ? (
                                                    <IoBanOutline size={16} />
                                                ) : (
                                                    <IoCheckmarkCircleOutline size={16} />
                                                )}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <PaginacionControles
                pagina={pagina}
                totalPaginas={totalPaginas}
                total={total}
                porPagina={20}
                onCambiar={setPagina}
            />

            {/* Modal */}
            {modalTarget !== undefined && (
                <EmpresaFormModal
                    empresa={modalTarget}
                    onClose={() => setModalTarget(undefined)}
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
                <Skeleton count={6} height={44} className="mb-1" />
            </div>
        </section>
    );
}
