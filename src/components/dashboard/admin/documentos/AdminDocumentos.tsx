import { useEffect, useRef, useState } from "react";
import Skeleton from "react-loading-skeleton";
import { toast } from "react-toastify";
import {
    IoAddOutline,
    IoCheckmarkCircleOutline,
    IoCloudUploadOutline,
    IoCloseOutline,
    IoCreateOutline,
    IoDocumentTextOutline,
    IoDownloadOutline,
    IoFilterOutline,
    IoPersonOutline,
    IoSearchOutline,
    IoTrashOutline,
} from "react-icons/io5";
import type { CampoBusqueda } from "../../../../lib/appwrite";
import {
    buscarMiembros,
    descargarDocumento,
    editarDocumentoMetadatos,
    eliminarDocumento,
    getDocumentosAdmin,
    getMiembrosPorIds,
    subirDocumentoMedico,
} from "../../../../lib/appwrite";
import type { DocumentoMedico, Miembro } from "../../../../types/miembro";

// ── Constants ────────────────────────────────────────────────────────────────

const TIPOS_DOCUMENTO = [
    { value: "laboratorio",     label: "Laboratorio" },
    { value: "radiologia",      label: "Radiología" },
    { value: "consulta_medica", label: "Consulta médica" },
    { value: "especialidades",  label: "Especialidades" },
    { value: "otro",            label: "Otro" },
] as const;

const TIPO_LABEL: Record<string, string> = Object.fromEntries(
    TIPOS_DOCUMENTO.map((t) => [t.value, t.label]),
);

const CAMPOS_BUSQUEDA: { value: CampoBusqueda; label: string }[] = [
    { value: "nombre",   label: "Nombre" },
    { value: "cedula",   label: "Cédula" },
    { value: "telefono", label: "Teléfono" },
];

const ACCEPT = ".pdf,image/jpeg,image/png,image/webp";

// ── Shared sub-components ────────────────────────────────────────────────────

function labelParentesco(p: string) {
    const map: Record<string, string> = {
        titular: "Titular", conyuge: "Cónyuge", hijo: "Hijo/a",
        padre: "Padre/Madre", otro: "Otro",
    };
    return map[p] ?? p;
}

function MiembroCard({ miembro, onDeselect }: { miembro: Miembro; onDeselect: () => void }) {
    return (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[#0066CC]/20 bg-[#0066CC]/5 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0066CC]/15 text-[#0066CC]">
                    <IoPersonOutline size={18} />
                </span>
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#333333]">{miembro.nombre_completo}</p>
                    <p className="text-xs text-[#666666]">
                        {labelParentesco(miembro.parentesco)}
                        {miembro.documento_identidad ? ` · ${miembro.documento_identidad}` : ""}
                    </p>
                </div>
            </div>
            <button
                type="button"
                onClick={onDeselect}
                className="shrink-0 rounded-lg p-1.5 text-[#666666] transition-colors hover:bg-[#0066CC]/10 hover:text-[#0066CC]"
                aria-label="Cambiar miembro"
            >
                <IoCloseOutline size={18} />
            </button>
        </div>
    );
}

function FileDropZone({ file, onChange }: { file: File | null; onChange: (f: File | null) => void }) {
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
                dragging ? "border-[#0066CC] bg-[#0066CC]/5" : "border-[#E5E5E5] bg-[#F5F3EE]/40 hover:border-[#0066CC]/40"
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
                    <p className="max-w-xs truncate text-center text-sm font-medium text-[#333333]">{file.name}</p>
                    <p className="text-xs text-[#666666]">{(file.size / 1024).toFixed(0)} KB</p>
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
                        Arrastra el archivo o <span className="font-semibold text-[#0066CC]">selecciona</span>
                    </p>
                    <p className="text-xs text-[#666666]/70">PDF, JPG, PNG, WEBP</p>
                </>
            )}
        </div>
    );
}

// ── Modal: Subir documento ───────────────────────────────────────────────────

interface SubirModalProps {
    onClose: () => void;
    onSaved: () => void;
}

function SubirDocumentoModal({ onClose, onSaved }: SubirModalProps) {
    const [campo, setCampo] = useState<CampoBusqueda>("nombre");
    const [termino, setTermino] = useState("");
    const [buscando, setBuscando] = useState(false);
    const [resultados, setResultados] = useState<Miembro[] | null>(null);
    const [miembro, setMiembro] = useState<Miembro | null>(null);

    const [nombreDocumento, setNombreDocumento] = useState("");
    const [tipoDocumento, setTipoDocumento] = useState<string>(TIPOS_DOCUMENTO[0].value);
    const [fechaDocumento, setFechaDocumento] = useState(new Date().toISOString().slice(0, 10));
    const [archivo, setArchivo] = useState<File | null>(null);
    const [subiendo, setSubiendo] = useState(false);

    async function handleBuscar(e: React.FormEvent) {
        e.preventDefault();
        if (!termino.trim()) return;
        setBuscando(true);
        setResultados(null);
        try {
            setResultados(await buscarMiembros(termino, campo));
        } catch {
            toast.error("Error al buscar miembros.");
        } finally {
            setBuscando(false);
        }
    }

    function handleSeleccionar(m: Miembro) { setMiembro(m); setResultados(null); setTermino(""); }
    function handleDeseleccionar() { setMiembro(null); setResultados(null); }

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
            onSaved();
            onClose();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Error al subir el documento.");
        } finally {
            setSubiendo(false);
        }
    }

    const formularioCompleto = miembro !== null && archivo !== null && nombreDocumento.trim().length > 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
            <div
                className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-[#E5E5E5] px-6 py-4">
                    <h3 className="text-base font-semibold text-[#0066CC]">Agregar nuevo documento</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-[#666666] transition-colors hover:bg-[#F5F3EE] hover:text-[#333333]"
                    >
                        <IoCloseOutline size={20} />
                    </button>
                </div>

                <div className="grid gap-6 p-6 lg:grid-cols-2">
                    {/* Selección de miembro */}
                    <div className="flex flex-col gap-4 rounded-2xl border border-[#E5E5E5] bg-white p-5 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
                        <h4 className="text-sm font-semibold uppercase tracking-wide text-[#666666]">
                            1. Seleccionar miembro
                        </h4>

                        {miembro ? (
                            <MiembroCard miembro={miembro} onDeselect={handleDeseleccionar} />
                        ) : (
                            <>
                                <form onSubmit={handleBuscar} className="flex flex-col gap-3">
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

                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={termino}
                                            onChange={(e) => setTermino(e.target.value)}
                                            placeholder={
                                                campo === "nombre" ? "Ej: Juan Pérez"
                                                : campo === "cedula" ? "Ej: 001-123456-7890"
                                                : "Ej: +505 8888 7777"
                                            }
                                            className="min-w-0 flex-1 rounded-xl border border-[#E5E5E5] bg-white px-3 py-2.5 text-sm text-[#333333] placeholder-[#999] outline-none ring-[#0066CC]/30 focus:border-[#0066CC]/50 focus:ring-2"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!termino.trim() || buscando}
                                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0066CC] text-white transition-colors hover:bg-[#0055aa] disabled:opacity-50"
                                        >
                                            <IoSearchOutline size={18} />
                                        </button>
                                    </div>
                                </form>

                                {buscando && (
                                    <div className="space-y-2">
                                        <Skeleton height={52} borderRadius={12} />
                                        <Skeleton height={52} borderRadius={12} />
                                    </div>
                                )}

                                {!buscando && resultados !== null && (
                                    resultados.length === 0 ? (
                                        <p className="py-3 text-center text-sm text-[#666666]">No se encontraron miembros.</p>
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
                                                            <p className="truncate text-sm font-semibold text-[#333333]">{m.nombre_completo}</p>
                                                            <p className="text-xs text-[#666666]">
                                                                {labelParentesco(m.parentesco)}
                                                                {m.documento_identidad ? ` · ${m.documento_identidad}` : ""}
                                                                {m.telefono ? ` · ${m.telefono}` : ""}
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

                    {/* Formulario de documento */}
                    <form onSubmit={handleSubir} className="flex flex-col gap-4 rounded-2xl border border-[#E5E5E5] bg-white p-5 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
                        <h4 className="text-sm font-semibold uppercase tracking-wide text-[#666666]">
                            2. Datos del documento
                        </h4>

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
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>

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

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-[#333333]">
                                Archivo <span className="text-red-500">*</span>
                            </label>
                            <FileDropZone file={archivo} onChange={setArchivo} />
                        </div>

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
            </div>
        </div>
    );
}

// ── Modal: Editar metadatos ──────────────────────────────────────────────────

interface EditarModalProps {
    doc: DocumentoMedico;
    onClose: () => void;
    onSaved: (updated: Pick<DocumentoMedico, "$id" | "nombre_documento" | "tipo_documento" | "fecha_documento">) => void;
}

function EditarMetadatosModal({ doc, onClose, onSaved }: EditarModalProps) {
    const [nombre, setNombre] = useState(doc.nombre_documento);
    const [tipo, setTipo] = useState(doc.tipo_documento);
    const [fecha, setFecha] = useState(doc.fecha_documento.slice(0, 10));
    const [guardando, setGuardando] = useState(false);

    async function handleGuardar(e: React.FormEvent) {
        e.preventDefault();
        if (!nombre.trim()) return;
        setGuardando(true);
        try {
            const fecha_documento = new Date(fecha).toISOString();
            await editarDocumentoMetadatos(doc.$id, {
                nombre_documento: nombre.trim(),
                tipo_documento: tipo,
                fecha_documento,
            });
            toast.success("Metadatos actualizados.");
            onSaved({ $id: doc.$id, nombre_documento: nombre.trim(), tipo_documento: tipo, fecha_documento });
            onClose();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Error al guardar.");
        } finally {
            setGuardando(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
            <div
                className="w-full max-w-md rounded-2xl bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-[#E5E5E5] px-6 py-4">
                    <h3 className="text-base font-semibold text-[#0066CC]">Editar metadatos</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-[#666666] transition-colors hover:bg-[#F5F3EE]"
                    >
                        <IoCloseOutline size={20} />
                    </button>
                </div>

                <form onSubmit={handleGuardar} className="flex flex-col gap-4 p-6">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-[#333333]">
                            Nombre del documento <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            required
                            className="rounded-xl border border-[#E5E5E5] bg-white px-3 py-2.5 text-sm text-[#333333] outline-none ring-[#0066CC]/30 focus:border-[#0066CC]/50 focus:ring-2"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-[#333333]">
                            Tipo de documento <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={tipo}
                            onChange={(e) => setTipo(e.target.value)}
                            required
                            className="rounded-xl border border-[#E5E5E5] bg-white px-3 py-2.5 text-sm text-[#333333] outline-none ring-[#0066CC]/30 focus:border-[#0066CC]/50 focus:ring-2"
                        >
                            {TIPOS_DOCUMENTO.map((t) => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-[#333333]">
                            Fecha del documento <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            value={fecha}
                            onChange={(e) => setFecha(e.target.value)}
                            required
                            className="rounded-xl border border-[#E5E5E5] bg-white px-3 py-2.5 text-sm text-[#333333] outline-none ring-[#0066CC]/30 focus:border-[#0066CC]/50 focus:ring-2"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-[#E5E5E5] px-4 py-2 text-sm font-semibold text-[#666666] transition-colors hover:bg-[#F5F3EE]"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={!nombre.trim() || guardando}
                            className="flex items-center gap-2 rounded-xl bg-[#0066CC] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0055aa] disabled:opacity-50"
                        >
                            {guardando ? (
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            ) : null}
                            Guardar cambios
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Main component ───────────────────────────────────────────────────────────

export function AdminDocumentos({ adminNombre: _adminNombre }: { adminNombre: string }) {
    const [docs, setDocs] = useState<DocumentoMedico[]>([]);
    const [memberNames, setMemberNames] = useState<Map<string, string>>(new Map());
    const [loading, setLoading] = useState(true);

    // Filters
    const [filterTipo, setFilterTipo] = useState<string>("");
    const [filterNombre, setFilterNombre] = useState("");
    const [filterMiembro, setFilterMiembro] = useState("");

    // Modals
    const [modalSubir, setModalSubir] = useState(false);
    const [editTarget, setEditTarget] = useState<DocumentoMedico | null>(null);

    // Row actions
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    async function cargar() {
        setLoading(true);
        try {
            const fetchedDocs = await getDocumentosAdmin();
            setDocs(fetchedDocs);

            // Batch-fetch member names
            const uniqueIds = [...new Set(fetchedDocs.map((d) => d.miembro_id))];
            const names = await getMiembrosPorIds(uniqueIds);
            setMemberNames(names);
        } catch {
            toast.error("Error al cargar los documentos.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { void cargar(); }, []);

    // Client-side filtering
    const filtered = docs.filter((doc) => {
        if (filterTipo && doc.tipo_documento !== filterTipo) return false;
        if (filterNombre && !doc.nombre_documento.toLowerCase().includes(filterNombre.toLowerCase())) return false;
        if (filterMiembro) {
            const nombre = memberNames.get(doc.miembro_id) ?? "";
            if (!nombre.toLowerCase().includes(filterMiembro.toLowerCase())) return false;
        }
        return true;
    });

    async function handleDescargar(doc: DocumentoMedico) {
        setDownloadingId(doc.$id);
        try {
            const ext = doc.tipo_archivo === "imagen" ? "jpg" : "pdf";
            await descargarDocumento(doc.storage_archivo_id, `${doc.nombre_documento}.${ext}`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Error al descargar.");
        } finally {
            setDownloadingId(null);
        }
    }

    async function confirmarEliminar(id: string) {
        setDeleting(true);
        try {
            await eliminarDocumento(id);
            setDocs((prev) => prev.filter((d) => d.$id !== id));
            toast.success("Documento eliminado.");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Error al eliminar.");
        } finally {
            setDeleting(false);
            setConfirmDeleteId(null);
        }
    }

    function handleMetadatosGuardados(
        updated: Pick<DocumentoMedico, "$id" | "nombre_documento" | "tipo_documento" | "fecha_documento">,
    ) {
        setDocs((prev) =>
            prev.map((d) =>
                d.$id === updated.$id ? { ...d, ...updated } : d,
            ),
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <header className="flex flex-col gap-4 rounded-2xl border border-[#0066CC]/15 bg-linear-to-br from-white to-[#0066CC]/6 px-5 py-6 sm:flex-row sm:items-center sm:justify-between md:px-7">
                <div>
                    <p className="text-sm font-medium text-[#666666]">Administración</p>
                    <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#0066CC] md:text-3xl">
                        Gestión de documentos
                    </h2>
                    <p className="mt-1 text-sm text-[#666666]">
                        {loading ? "Cargando…" : `${docs.length} documento${docs.length !== 1 ? "s" : ""} en total`}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setModalSubir(true)}
                    className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl bg-[#0066CC] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0055aa] sm:self-auto"
                >
                    <IoAddOutline size={20} />
                    Agregar nuevo documento
                </button>
            </header>

            {/* Filtros */}
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#E5E5E5] bg-white px-4 py-3 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
                <IoFilterOutline size={16} className="shrink-0 text-[#AAAAAA]" />

                <select
                    value={filterTipo}
                    onChange={(e) => setFilterTipo(e.target.value)}
                    className="rounded-lg border border-[#E5E5E5] bg-[#F5F3EE]/60 px-3 py-1.5 text-xs font-semibold text-[#333333] outline-none focus:border-[#0066CC]/50 focus:ring-1 focus:ring-[#0066CC]/30"
                >
                    <option value="">Todos los tipos</option>
                    {TIPOS_DOCUMENTO.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                </select>

                <div className="flex min-w-[160px] flex-1 items-center gap-1.5 rounded-lg border border-[#E5E5E5] bg-[#F5F3EE]/60 px-2.5 py-1.5">
                    <IoSearchOutline size={14} className="shrink-0 text-[#AAAAAA]" />
                    <input
                        type="text"
                        value={filterNombre}
                        onChange={(e) => setFilterNombre(e.target.value)}
                        placeholder="Buscar por nombre…"
                        className="min-w-0 flex-1 bg-transparent text-xs text-[#333333] placeholder-[#AAAAAA] outline-none"
                    />
                    {filterNombre && (
                        <button type="button" onClick={() => setFilterNombre("")} className="shrink-0 text-[#AAAAAA] hover:text-[#666666]">
                            <IoCloseOutline size={14} />
                        </button>
                    )}
                </div>

                <div className="flex min-w-[160px] flex-1 items-center gap-1.5 rounded-lg border border-[#E5E5E5] bg-[#F5F3EE]/60 px-2.5 py-1.5">
                    <IoPersonOutline size={14} className="shrink-0 text-[#AAAAAA]" />
                    <input
                        type="text"
                        value={filterMiembro}
                        onChange={(e) => setFilterMiembro(e.target.value)}
                        placeholder="Buscar por miembro…"
                        className="min-w-0 flex-1 bg-transparent text-xs text-[#333333] placeholder-[#AAAAAA] outline-none"
                    />
                    {filterMiembro && (
                        <button type="button" onClick={() => setFilterMiembro("")} className="shrink-0 text-[#AAAAAA] hover:text-[#666666]">
                            <IoCloseOutline size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Tabla */}
            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} height={64} borderRadius={12} />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#E5E5E5] py-16 text-center">
                    <IoDocumentTextOutline size={36} className="text-[#CCCCCC]" />
                    <p className="text-sm text-[#666666]">
                        {docs.length === 0 ? "No hay documentos cargados aún." : "No hay resultados para los filtros aplicados."}
                    </p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] text-sm">
                            <thead>
                                <tr className="border-b border-[#E5E5E5] bg-[#F5F3EE]/60">
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#666666]">Nombre</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#666666]">Tipo</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#666666]">Miembro</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#666666]">Fecha</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#666666]">Estado</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#666666]">Subido por</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[#666666]">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E5E5E5]/80">
                                {filtered.map((doc) => (
                                    <tr key={doc.$id} className="transition-colors hover:bg-[#F5F3EE]/40">
                                        <td className="px-4 py-3">
                                            <p className="font-semibold text-[#333333]">{doc.nombre_documento}</p>
                                            <p className="text-xs text-[#999999] capitalize">{doc.tipo_archivo}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="rounded-full bg-[#F5F3EE] px-2.5 py-0.5 text-xs font-semibold text-[#666666]">
                                                {TIPO_LABEL[doc.tipo_documento] ?? doc.tipo_documento}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-[#333333]">
                                            {memberNames.get(doc.miembro_id) ?? (
                                                <span className="text-[#AAAAAA]">{doc.miembro_id.slice(0, 8)}…</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-[#666666]">
                                            {new Date(doc.fecha_documento).toLocaleDateString("es-NI", {
                                                day: "numeric", month: "short", year: "numeric",
                                            })}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                                                doc.estado_archivo === "activo"
                                                    ? "bg-emerald-50 text-emerald-700"
                                                    : "bg-[#F5F3EE] text-[#666666]"
                                            }`}>
                                                {doc.estado_archivo}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-[#666666]">
                                            {doc.subido_por ?? <span className="text-[#CCCCCC]">—</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                            {confirmDeleteId === doc.$id ? (
                                                <div className="flex items-center justify-end gap-2">
                                                    <span className="text-xs text-[#666666]">¿Eliminar?</span>
                                                    <button
                                                        type="button"
                                                        disabled={deleting}
                                                        onClick={() => void confirmarEliminar(doc.$id)}
                                                        className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                                                    >
                                                        {deleting ? "..." : "Sí"}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setConfirmDeleteId(null)}
                                                        className="rounded-lg border border-[#E5E5E5] px-2.5 py-1 text-xs font-semibold text-[#666666] hover:bg-[#F5F3EE]"
                                                    >
                                                        No
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => void handleDescargar(doc)}
                                                        disabled={downloadingId === doc.$id}
                                                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[#0066CC] transition-colors hover:bg-[#0066CC]/10 disabled:opacity-50"
                                                        title="Descargar"
                                                    >
                                                        {downloadingId === doc.$id ? (
                                                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#0066CC] border-t-transparent" />
                                                        ) : (
                                                            <IoDownloadOutline size={18} />
                                                        )}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditTarget(doc)}
                                                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[#0066CC] transition-colors hover:bg-[#0066CC]/10"
                                                        title="Editar metadatos"
                                                    >
                                                        <IoCreateOutline size={18} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setConfirmDeleteId(doc.$id)}
                                                        className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-50"
                                                        title="Eliminar"
                                                    >
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

            {/* Modals */}
            {modalSubir && (
                <SubirDocumentoModal
                    onClose={() => setModalSubir(false)}
                    onSaved={() => void cargar()}
                />
            )}
            {editTarget && (
                <EditarMetadatosModal
                    doc={editTarget}
                    onClose={() => setEditTarget(null)}
                    onSaved={(updated) => {
                        handleMetadatosGuardados(updated);
                        setEditTarget(null);
                    }}
                />
            )}
        </div>
    );
}
