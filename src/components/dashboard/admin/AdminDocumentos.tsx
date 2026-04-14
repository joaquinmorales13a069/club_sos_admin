import { useRef, useState } from "react";
import Skeleton from "react-loading-skeleton";
import { toast } from "react-toastify";
import {
    IoCheckmarkCircleOutline,
    IoCloudUploadOutline,
    IoDocumentTextOutline,
    IoPersonOutline,
    IoSearchOutline,
    IoCloseOutline,
} from "react-icons/io5";
import type { CampoBusqueda } from "../../../lib/appwrite";
import { buscarMiembros, subirDocumentoMedico } from "../../../lib/appwrite";
import type { Miembro } from "../../../types/miembro";

// ── Constantes ──────────────────────────────────────────────────────────────

const TIPOS_DOCUMENTO = [
    { value: "laboratorio",    label: "Laboratorio" },
    { value: "radiologia",     label: "Radiología" },
    { value: "consulta_medica", label: "Consulta médica" },
    { value: "especialidades", label: "Especialidades" },
    { value: "otro",           label: "Otro" },
] as const;

const CAMPOS_BUSQUEDA: { value: CampoBusqueda; label: string }[] = [
    { value: "nombre",  label: "Nombre" },
    { value: "cedula",  label: "Cédula" },
    { value: "telefono", label: "Teléfono" },
];

const ACCEPT = ".pdf,image/jpeg,image/png,image/webp";

// ── Helpers ─────────────────────────────────────────────────────────────────

function labelParentesco(p: string) {
    const map: Record<string, string> = {
        titular: "Titular",
        conyuge: "Cónyuge",
        hijo: "Hijo/a",
        padre: "Padre/Madre",
        otro: "Otro",
    };
    return map[p] ?? p;
}

// ── Subcomponentes ───────────────────────────────────────────────────────────

function MiembroCard({
    miembro,
    onDeselect,
}: {
    miembro: Miembro;
    onDeselect: () => void;
}) {
    return (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[#0066CC]/20 bg-[#0066CC]/5 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0066CC]/15 text-[#0066CC]">
                    <IoPersonOutline size={18} />
                </span>
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#333333]">
                        {miembro.nombre_completo}
                    </p>
                    <p className="text-xs text-[#666666]">
                        {labelParentesco(miembro.parentesco)}
                        {miembro.documento_identidad
                            ? ` · ${miembro.documento_identidad}`
                            : ""}
                    </p>
                </div>
            </div>
            <button
                type="button"
                onClick={onDeselect}
                className="shrink-0 rounded-lg p-1.5 text-[#666666] transition-colors hover:bg-[#0066CC]/10 hover:text-[#0066CC]"
                aria-label="Cambiar miembro"
                title="Cambiar miembro"
            >
                <IoCloseOutline size={18} />
            </button>
        </div>
    );
}

function FileDropZone({
    file,
    onChange,
}: {
    file: File | null;
    onChange: (f: File | null) => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);

    function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        setDragging(false);
        const dropped = e.dataTransfer.files[0];
        if (dropped) onChange(dropped);
    }

    return (
        <div
            className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 transition-colors ${
                dragging
                    ? "border-[#0066CC] bg-[#0066CC]/5"
                    : "border-[#E5E5E5] bg-[#F5F3EE]/40 hover:border-[#0066CC]/40"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
        >
            <input
                ref={inputRef}
                type="file"
                accept={ACCEPT}
                className="absolute inset-0 cursor-pointer opacity-0"
                onChange={(e) => onChange(e.target.files?.[0] ?? null)}
            />
            {file ? (
                <>
                    <IoCheckmarkCircleOutline size={28} className="text-emerald-600" />
                    <p className="max-w-xs truncate text-center text-sm font-medium text-[#333333]">
                        {file.name}
                    </p>
                    <p className="text-xs text-[#666666]">
                        {(file.size / 1024).toFixed(0)} KB
                    </p>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onChange(null); if (inputRef.current) inputRef.current.value = ""; }}
                        className="text-xs font-medium text-[#0066CC] underline underline-offset-2"
                    >
                        Cambiar archivo
                    </button>
                </>
            ) : (
                <>
                    <IoCloudUploadOutline size={28} className="text-[#0066CC]/60" />
                    <p className="text-sm text-[#666666]">
                        Arrastra el archivo o{" "}
                        <span className="font-semibold text-[#0066CC]">selecciona</span>
                    </p>
                    <p className="text-xs text-[#666666]/70">PDF, JPG, PNG, WEBP</p>
                </>
            )}
        </div>
    );
}

// ── Componente principal ─────────────────────────────────────────────────────

export function AdminDocumentos({ adminNombre }: { adminNombre: string }) {
    // Búsqueda
    const [campo, setCampo] = useState<CampoBusqueda>("nombre");
    const [termino, setTermino] = useState("");
    const [buscando, setBuscando] = useState(false);
    const [resultados, setResultados] = useState<Miembro[] | null>(null);

    // Miembro seleccionado
    const [miembro, setMiembro] = useState<Miembro | null>(null);

    // Formulario
    const [nombreDocumento, setNombreDocumento] = useState("");
    const [tipoDocumento, setTipoDocumento] = useState<string>(TIPOS_DOCUMENTO[0].value);
    const [fechaDocumento, setFechaDocumento] = useState(
        new Date().toISOString().slice(0, 10),
    );
    const [archivo, setArchivo] = useState<File | null>(null);
    const [subiendo, setSubiendo] = useState(false);

    async function handleBuscar(e: React.FormEvent) {
        e.preventDefault();
        if (!termino.trim()) return;
        setBuscando(true);
        setResultados(null);
        try {
            const res = await buscarMiembros(termino, campo);
            setResultados(res);
        } catch {
            toast.error("Error al buscar miembros.");
        } finally {
            setBuscando(false);
        }
    }

    function handleSeleccionar(m: Miembro) {
        setMiembro(m);
        setResultados(null);
        setTermino("");
    }

    function handleDeseleccionar() {
        setMiembro(null);
        setResultados(null);
    }

    async function handleSubir(e: React.FormEvent) {
        e.preventDefault();
        if (!miembro || !archivo || !nombreDocumento.trim()) return;

        setSubiendo(true);
        try {
            await subirDocumentoMedico({
                file: archivo,
                miembro_id: miembro.$id,
                nombre_documento: nombreDocumento.trim(),
                tipo_documento: tipoDocumento,
                fecha_documento: new Date(fechaDocumento).toISOString(),
            });
            toast.success("Documento subido exitosamente.");
            // Resetear formulario
            setNombreDocumento("");
            setTipoDocumento(TIPOS_DOCUMENTO[0].value);
            setFechaDocumento(new Date().toISOString().slice(0, 10));
            setArchivo(null);
            setMiembro(null);
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : "Error al subir el documento.",
            );
        } finally {
            setSubiendo(false);
        }
    }

    const formularioCompleto =
        miembro !== null &&
        archivo !== null &&
        nombreDocumento.trim().length > 0;

    return (
        <section className="space-y-6">
            <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0066CC]/10 text-[#0066CC]">
                    <IoDocumentTextOutline size={22} />
                </span>
                <div>
                    <h2 className="text-lg font-semibold text-[#0066CC]">
                        Gestionar Documentos Médicos
                    </h2>
                    <p className="text-xs text-[#666666]">
                        Sube documentos y asígnalos al miembro correspondiente.
                    </p>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* ── Columna izquierda: selección de miembro ── */}
                <div className="flex flex-col gap-4 rounded-2xl border border-[#E5E5E5] bg-white p-5 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-[#666666]">
                        1. Seleccionar miembro
                    </h3>

                    {miembro ? (
                        <MiembroCard miembro={miembro} onDeselect={handleDeseleccionar} />
                    ) : (
                        <>
                            <form onSubmit={handleBuscar} className="flex flex-col gap-3">
                                {/* Selector de campo */}
                                <div className="flex rounded-xl border border-[#E5E5E5] bg-[#F5F3EE]/50 p-1">
                                    {CAMPOS_BUSQUEDA.map((c) => (
                                        <button
                                            key={c.value}
                                            type="button"
                                            onClick={() => setCampo(c.value)}
                                            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                                                campo === c.value
                                                    ? "bg-white text-[#0066CC] shadow-sm"
                                                    : "text-[#666666] hover:text-[#333333]"
                                            }`}
                                        >
                                            {c.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Input de búsqueda */}
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={termino}
                                        onChange={(e) => setTermino(e.target.value)}
                                        placeholder={
                                            campo === "nombre"
                                                ? "Ej: Juan Pérez"
                                                : campo === "cedula"
                                                ? "Ej: 001-123456-7890"
                                                : "Ej: +505 8888 7777"
                                        }
                                        className="min-w-0 flex-1 rounded-xl border border-[#E5E5E5] bg-white px-3 py-2.5 text-sm text-[#333333] placeholder-[#999] outline-none ring-[#0066CC]/30 focus:border-[#0066CC]/50 focus:ring-2"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!termino.trim() || buscando}
                                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0066CC] text-white transition-colors hover:bg-[#0055aa] disabled:opacity-50"
                                        aria-label="Buscar"
                                    >
                                        <IoSearchOutline size={18} />
                                    </button>
                                </div>
                            </form>

                            {/* Resultados */}
                            {buscando && (
                                <div className="space-y-2">
                                    <Skeleton height={52} borderRadius={12} />
                                    <Skeleton height={52} borderRadius={12} />
                                </div>
                            )}

                            {!buscando && resultados !== null && (
                                resultados.length === 0 ? (
                                    <p className="py-3 text-center text-sm text-[#666666]">
                                        No se encontraron miembros.
                                    </p>
                                ) : (
                                    <ul className="space-y-2">
                                        {resultados.map((m) => (
                                            <li key={m.$id}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleSeleccionar(m)}
                                                    className="flex w-full items-center gap-3 rounded-xl border border-[#E5E5E5] bg-white px-4 py-3 text-left transition-colors hover:border-[#0066CC]/30 hover:bg-[#0066CC]/5"
                                                >
                                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F5F3EE] text-[#0066CC]">
                                                        <IoPersonOutline size={16} />
                                                    </span>
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-semibold text-[#333333]">
                                                            {m.nombre_completo}
                                                        </p>
                                                        <p className="text-xs text-[#666666]">
                                                            {labelParentesco(m.parentesco)}
                                                            {m.documento_identidad
                                                                ? ` · ${m.documento_identidad}`
                                                                : ""}
                                                            {m.telefono
                                                                ? ` · ${m.telefono}`
                                                                : ""}
                                                        </p>
                                                    </div>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )
                            )}
                        </>
                    )}
                </div>

                {/* ── Columna derecha: formulario de documento ── */}
                <form
                    onSubmit={handleSubir}
                    className="flex flex-col gap-4 rounded-2xl border border-[#E5E5E5] bg-white p-5 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]"
                >
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-[#666666]">
                        2. Datos del documento
                    </h3>

                    {/* Nombre del documento */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-[#333333]">
                            Nombre del documento <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={nombreDocumento}
                            onChange={(e) => setNombreDocumento(e.target.value)}
                            placeholder="Ej: Resultados de laboratorio — abril 2026"
                            required
                            className="rounded-xl border border-[#E5E5E5] bg-white px-3 py-2.5 text-sm text-[#333333] placeholder-[#999] outline-none ring-[#0066CC]/30 focus:border-[#0066CC]/50 focus:ring-2"
                        />
                    </div>

                    {/* Tipo de documento */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-[#333333]">
                            Tipo de documento <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={tipoDocumento}
                            onChange={(e) => setTipoDocumento(e.target.value)}
                            required
                            className="rounded-xl border border-[#E5E5E5] bg-white px-3 py-2.5 text-sm text-[#333333] outline-none ring-[#0066CC]/30 focus:border-[#0066CC]/50 focus:ring-2"
                        >
                            {TIPOS_DOCUMENTO.map((t) => (
                                <option key={t.value} value={t.value}>
                                    {t.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Fecha del documento */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-[#333333]">
                            Fecha del documento <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            value={fechaDocumento}
                            onChange={(e) => setFechaDocumento(e.target.value)}
                            required
                            className="rounded-xl border border-[#E5E5E5] bg-white px-3 py-2.5 text-sm text-[#333333] outline-none ring-[#0066CC]/30 focus:border-[#0066CC]/50 focus:ring-2"
                        />
                    </div>

                    {/* Archivo */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-[#333333]">
                            Archivo <span className="text-red-500">*</span>
                        </label>
                        <FileDropZone file={archivo} onChange={setArchivo} />
                    </div>

                    {/* Botón de envío */}
                    <button
                        type="submit"
                        disabled={!formularioCompleto || subiendo}
                        className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl bg-[#0066CC] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0055aa] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {subiendo ? (
                            <>
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                Subiendo…
                            </>
                        ) : (
                            <>
                                <IoCloudUploadOutline size={18} />
                                Subir documento
                            </>
                        )}
                    </button>
                </form>
            </div>
        </section>
    );
}
