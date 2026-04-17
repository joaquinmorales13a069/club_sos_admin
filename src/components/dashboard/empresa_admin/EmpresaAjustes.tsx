import { useEffect, useMemo, useState } from "react";
import Skeleton from "react-loading-skeleton";
import { toast } from "react-toastify";
import {
    IoBusinessOutline,
    IoCheckmarkCircleOutline,
    IoCopyOutline,
    IoKeyOutline,
    IoRefreshOutline,
    IoSaveOutline,
    IoWarningOutline,
} from "react-icons/io5";
import type { Miembro } from "../../../types/miembro";
import type { Empresa } from "../../../types/signup";
import {
    actualizarEmpresa,
    getEmpresaPorId,
} from "../../../lib/appwrite";

type FormState = {
    nombre_empresa: string;
    codigo_empresa: string;
    notas: string;
};

function generarCodigoAleatorio(len = 8): string {
    const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let out = "";
    for (let i = 0; i < len; i++) {
        out += alfabeto.charAt(Math.floor(Math.random() * alfabeto.length));
    }
    return out;
}

export function EmpresaAjustes({ miembro }: { miembro: Miembro }) {
    const [empresa, setEmpresa] = useState<Empresa | null>(null);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState<FormState>({
        nombre_empresa: "",
        codigo_empresa: "",
        notas: "",
    });
    const [saving, setSaving] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        let cancelled = false;
        getEmpresaPorId(miembro.empresa_id)
            .then((emp) => {
                if (cancelled) return;
                if (!emp) {
                    toast.error("No se pudo cargar la información de la empresa.");
                    return;
                }
                setEmpresa(emp);
                setForm({
                    nombre_empresa: emp.nombre_empresa,
                    codigo_empresa: emp.codigo_empresa,
                    notas: emp.notas ?? "",
                });
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [miembro.empresa_id]);

    const dirty = useMemo(() => {
        if (!empresa) return false;
        return (
            form.nombre_empresa.trim() !== empresa.nombre_empresa ||
            form.codigo_empresa.trim() !== empresa.codigo_empresa ||
            (form.notas.trim() || "") !== (empresa.notas ?? "")
        );
    }, [empresa, form]);

    async function handleCopyCodigo() {
        if (!empresa) return;
        try {
            await navigator.clipboard.writeText(empresa.codigo_empresa);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1800);
        } catch {
            toast.error("No se pudo copiar el código.");
        }
    }

    function handleRegenerar() {
        if (!window.confirm("Generarás un código nuevo. Recuerda guardar los cambios para aplicarlo.")) {
            return;
        }
        setForm((f) => ({ ...f, codigo_empresa: generarCodigoAleatorio() }));
    }

    async function handleGuardar(e: React.FormEvent) {
        e.preventDefault();
        if (!empresa) return;

        const nombre = form.nombre_empresa.trim();
        const codigo = form.codigo_empresa.trim();
        const notas = form.notas.trim();

        if (!nombre) {
            toast.error("El nombre de la empresa es obligatorio.");
            return;
        }
        if (!codigo) {
            toast.error("El código de vinculación es obligatorio.");
            return;
        }
        if (codigo.length < 4) {
            toast.error("El código debe tener al menos 4 caracteres.");
            return;
        }

        setSaving(true);
        try {
            const actualizada = await actualizarEmpresa(empresa.$id, {
                nombre_empresa: nombre,
                codigo_empresa: codigo,
                notas,
            });
            setEmpresa(actualizada);
            setForm({
                nombre_empresa: actualizada.nombre_empresa,
                codigo_empresa: actualizada.codigo_empresa,
                notas: actualizada.notas ?? "",
            });
            toast.success("Datos de la empresa actualizados.");
        } catch (err) {
            const msg = err instanceof Error ? err.message : "No se pudo guardar.";
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    }

    function handleDescartar() {
        if (!empresa) return;
        setForm({
            nombre_empresa: empresa.nombre_empresa,
            codigo_empresa: empresa.codigo_empresa,
            notas: empresa.notas ?? "",
        });
    }

    if (loading) {
        return (
            <div className="space-y-4">
                <Skeleton height={120} borderRadius={16} />
                <Skeleton height={280} borderRadius={16} />
            </div>
        );
    }

    if (!empresa) {
        return (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#E5E5E5] py-16 text-center">
                <IoWarningOutline size={36} className="text-[#CCCCCC]" />
                <p className="text-sm text-[#666666]">
                    No se encontró la empresa asociada a tu cuenta.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <header className="rounded-2xl border border-[#0066CC]/15 bg-linear-to-br from-white to-[#0066CC]/6 px-5 py-6 md:px-7">
                <p className="text-sm font-medium text-[#666666]">Administrar empresa</p>
                <h2 className="mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight text-[#0066CC] md:text-3xl">
                    <IoBusinessOutline size={26} />
                    Ajustes de la empresa
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#666666]">
                    Actualiza la información general y el código de vinculación que usan los
                    miembros para unirse a tu empresa.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                    <span
                        className={`rounded-full px-2.5 py-0.5 font-semibold ${
                            empresa.estado === "activo"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-[#F5F3EE] text-[#666666]"
                        }`}
                    >
                        Estado: {empresa.estado}
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-0.5 font-mono text-[#666666] ring-1 ring-[#E5E5E5]">
                        ID {empresa.$id.slice(0, 10)}…
                    </span>
                </div>
            </header>

            <form
                onSubmit={handleGuardar}
                className="space-y-6 rounded-2xl border border-[#E5E5E5] bg-white p-6 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)] md:p-7"
            >
                {/* Código de vinculación */}
                <section>
                    <h3 className="flex items-center gap-2 text-base font-semibold text-[#333333]">
                        <IoKeyOutline size={18} className="text-[#0066CC]" />
                        Código de vinculación
                    </h3>
                    <p className="mt-1 text-xs text-[#666666]">
                        Los nuevos miembros ingresan este código durante el registro para
                        asociarse a tu empresa.
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
                        <input
                            type="text"
                            value={form.codigo_empresa}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    codigo_empresa: e.target.value.toUpperCase(),
                                }))
                            }
                            maxLength={32}
                            autoComplete="off"
                            className="w-full rounded-xl border border-[#E5E5E5] bg-white px-4 py-2.5 text-base font-mono font-semibold tracking-wider text-[#0066CC] focus:border-[#0066CC] focus:outline-none"
                        />
                        <button
                            type="button"
                            onClick={handleCopyCodigo}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E5E5E5] bg-white px-4 py-2.5 text-sm font-semibold text-[#0066CC] transition-colors hover:bg-[#F5F3EE]"
                        >
                            {copied ? (
                                <>
                                    <IoCheckmarkCircleOutline size={18} />
                                    Copiado
                                </>
                            ) : (
                                <>
                                    <IoCopyOutline size={18} />
                                    Copiar
                                </>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={handleRegenerar}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E5E5E5] bg-white px-4 py-2.5 text-sm font-semibold text-[#0066CC] transition-colors hover:bg-[#F5F3EE]"
                        >
                            <IoRefreshOutline size={18} />
                            Regenerar
                        </button>
                    </div>
                    <p className="mt-2 text-xs text-amber-700">
                        Al cambiar el código, los enlaces antiguos dejarán de funcionar.
                    </p>
                </section>

                <div className="h-px bg-[#E5E5E5]" />

                {/* Información general */}
                <section className="space-y-4">
                    <h3 className="flex items-center gap-2 text-base font-semibold text-[#333333]">
                        <IoBusinessOutline size={18} className="text-[#0066CC]" />
                        Información general
                    </h3>

                    <label className="block">
                        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#666666]">
                            Nombre de la empresa
                        </span>
                        <input
                            type="text"
                            value={form.nombre_empresa}
                            onChange={(e) =>
                                setForm((f) => ({ ...f, nombre_empresa: e.target.value }))
                            }
                            maxLength={120}
                            autoComplete="organization"
                            className="w-full rounded-xl border border-[#E5E5E5] bg-white px-4 py-2.5 text-sm text-[#333333] focus:border-[#0066CC] focus:outline-none"
                        />
                    </label>

                    <label className="block">
                        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#666666]">
                            Notas internas
                        </span>
                        <textarea
                            value={form.notas}
                            onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
                            rows={4}
                            maxLength={1000}
                            placeholder="Información adicional sobre la empresa o el contrato."
                            className="w-full resize-y rounded-xl border border-[#E5E5E5] bg-white px-4 py-2.5 text-sm text-[#333333] placeholder:text-[#AAAAAA] focus:border-[#0066CC] focus:outline-none"
                        />
                        <span className="mt-1 block text-right text-[10px] text-[#AAAAAA]">
                            {form.notas.length}/1000
                        </span>
                    </label>
                </section>

                {/* Acciones */}
                <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={handleDescartar}
                        disabled={!dirty || saving}
                        className="rounded-xl border border-[#E5E5E5] px-4 py-2.5 text-sm font-semibold text-[#666666] transition-colors hover:bg-[#F5F3EE] disabled:opacity-40"
                    >
                        Descartar cambios
                    </button>
                    <button
                        type="submit"
                        disabled={!dirty || saving}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0066CC] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0055aa] disabled:opacity-50"
                    >
                        {saving ? (
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : (
                            <IoSaveOutline size={18} />
                        )}
                        Guardar cambios
                    </button>
                </div>
            </form>
        </div>
    );
}
