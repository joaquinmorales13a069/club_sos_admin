import { useCallback, useEffect, useState } from "react";
import Skeleton from "react-loading-skeleton";
import {
    IoCloudDownloadOutline,
    IoDocumentTextOutline,
    IoEyeOutline,
    IoFlaskOutline,
    IoMedkitOutline,
    IoScanOutline,
    IoStatsChartOutline,
} from "react-icons/io5";
import { toast } from "react-toastify";
import type { DocumentoMedico, Miembro } from "../../../../types/miembro";
import {
    descargarDocumento,
    getDocumentosMiembro,
    verDocumento,
} from "../../../../lib/appwrite";
import { PaginacionControles } from "../../shared/PaginacionControles";

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 12;

const TIPOS_FILTRO = [
    { value: "",                label: "Todos" },
    { value: "laboratorio",     label: "Laboratorio" },
    { value: "radiologia",      label: "Radiología" },
    { value: "consulta_medica", label: "Consulta médica" },
    { value: "especialidades",  label: "Especialidades" },
    { value: "otro",            label: "Otro" },
];

const TIPO_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    laboratorio:     { label: "Laboratorio",     icon: <IoFlaskOutline size={20} />,       color: "text-[#0066CC] bg-[#0066CC]/10" },
    radiologia:      { label: "Radiología",      icon: <IoScanOutline size={20} />,         color: "text-[#7C3AED] bg-[#7C3AED]/10" },
    consulta_medica: { label: "Consulta médica", icon: <IoMedkitOutline size={20} />,       color: "text-[#059669] bg-[#059669]/10" },
    especialidades:  { label: "Especialidades",  icon: <IoStatsChartOutline size={20} />,   color: "text-[#D97706] bg-[#D97706]/10" },
    otro:            { label: "Otro",            icon: <IoDocumentTextOutline size={20} />, color: "text-[#666666] bg-[#E5E5E5]"   },
};

function getTipoConfig(tipo: string) {
    return TIPO_CONFIG[tipo] ?? TIPO_CONFIG["otro"];
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MisReportes({ miembro }: { miembro: Miembro }) {
    const [documentos, setDocumentos] = useState<DocumentoMedico[]>([]);
    const [total, setTotal]           = useState(0);
    const [pagina, setPagina]         = useState(1);
    const [filtroTipo, setFiltroTipo] = useState("");
    const [loading, setLoading]       = useState(true);
    const [descargando, setDescargando] = useState<string | null>(null);
    const [viendo, setViendo]           = useState<string | null>(null);

    const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));

    const cargar = useCallback(async (pg: number, tipo: string) => {
        setLoading(true);
        try {
            const result = await getDocumentosMiembro(
                miembro.$id,
                pg,
                PAGE_SIZE,
                tipo || undefined,
            );
            setDocumentos(result.documentos);
            setTotal(result.total);
        } catch {
            toast.error("Error al cargar los documentos.");
        } finally {
            setLoading(false);
        }
    }, [miembro.$id]);

    useEffect(() => {
        cargar(pagina, filtroTipo);
    }, [cargar, pagina, filtroTipo]);

    function handleFiltro(tipo: string) {
        setFiltroTipo(tipo);
        setPagina(1);
    }

    function handlePagina(p: number) {
        setPagina(p);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    async function handleVer(doc: DocumentoMedico) {
        setViendo(doc.$id);
        try {
            await verDocumento(doc.storage_archivo_id, doc.tipo_archivo);
        } catch {
            toast.error("No se pudo abrir el documento.");
        } finally {
            setViendo(null);
        }
    }

    async function handleDescargar(doc: DocumentoMedico) {
        setDescargando(doc.$id);
        try {
            const ext = doc.tipo_archivo === "pdf" ? ".pdf" : ".jpg";
            await descargarDocumento(
                doc.storage_archivo_id,
                `${doc.nombre_documento}${ext}`,
            );
        } catch {
            toast.error("No se pudo descargar el documento.");
        } finally {
            setDescargando(null);
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <header className="rounded-2xl border border-[#0066CC]/15 bg-linear-to-br from-white to-[#0066CC]/6 px-5 py-6 md:px-7">
                <p className="text-sm font-medium text-[#666666]">Tu membresía</p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#0066CC] md:text-3xl">
                    Mis documentos
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[#666666]">
                    Documentos médicos asignados a tu cuenta por el equipo de ClubSOS.
                </p>
            </header>

            {/* Filtros */}
            <div className="flex flex-wrap gap-2">
                {TIPOS_FILTRO.map((t) => (
                    <button
                        key={t.value}
                        type="button"
                        onClick={() => handleFiltro(t.value)}
                        className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                            filtroTipo === t.value
                                ? "bg-[#0066CC] text-white shadow-sm"
                                : "bg-white text-[#666666] ring-1 ring-[#E5E5E5] hover:bg-[#F5F3EE] hover:text-[#0066CC]"
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Contenido */}
            {loading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} height={168} borderRadius={16} />
                    ))}
                </div>
            ) : documentos.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#E5E5E5] py-16 text-center">
                    <IoDocumentTextOutline size={36} className="text-[#CCCCCC]" />
                    <p className="text-sm text-[#666666]">
                        {filtroTipo
                            ? "No hay documentos de este tipo."
                            : "No tienes documentos asignados aún."}
                    </p>
                </div>
            ) : (
                <>
                    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {documentos.map((doc) => (
                            <DocumentoCard
                                key={doc.$id}
                                doc={doc}
                                viendo={viendo === doc.$id}
                                descargando={descargando === doc.$id}
                                onVer={() => handleVer(doc)}
                                onDescargar={() => handleDescargar(doc)}
                            />
                        ))}
                    </ul>

                    <PaginacionControles
                        pagina={pagina}
                        totalPaginas={totalPaginas}
                        total={total}
                        porPagina={PAGE_SIZE}
                        onCambiar={handlePagina}
                    />
                </>
            )}
        </div>
    );
}

// ── Card ──────────────────────────────────────────────────────────────────────

interface CardProps {
    doc: DocumentoMedico;
    viendo: boolean;
    descargando: boolean;
    onVer: () => void;
    onDescargar: () => void;
}

function DocumentoCard({ doc, viendo, descargando, onVer, onDescargar }: CardProps) {
    const cfg = getTipoConfig(doc.tipo_documento);
    const fecha = new Date(doc.fecha_documento).toLocaleDateString("es-NI", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });

    return (
        <li className="flex flex-col rounded-2xl border border-[#E5E5E5] bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            {/* Icono + badge tipo archivo */}
            <div className="flex items-start justify-between gap-2">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${cfg.color}`}>
                    {cfg.icon}
                </div>
                <span className="rounded-md bg-[#F5F3EE] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#666666]">
                    {doc.tipo_archivo}
                </span>
            </div>

            {/* Info */}
            <div className="mt-3 flex-1">
                <p className="line-clamp-2 font-semibold leading-snug text-[#333333]">
                    {doc.nombre_documento}
                </p>
                <p className="mt-1 text-xs text-[#666666]">{cfg.label}</p>
                <p className="mt-0.5 text-xs text-[#999999]">{fecha}</p>
                {doc.subido_por && (
                    <p className="mt-1 text-[11px] text-[#AAAAAA]">
                        Subido por {doc.subido_por}
                    </p>
                )}
            </div>

            {/* Acciones */}
            <div className="mt-4 flex gap-2 border-t border-[#F0F0F0] pt-4">
                <ActionBtn
                    onClick={onVer}
                    loading={viendo}
                    disabled={descargando}
                    icon={<IoEyeOutline size={15} />}
                    label="Ver"
                    title={`Ver ${doc.nombre_documento}`}
                    variant="primary"
                />
                <ActionBtn
                    onClick={onDescargar}
                    loading={descargando}
                    disabled={viendo}
                    icon={<IoCloudDownloadOutline size={15} />}
                    label="Descargar"
                    title={`Descargar ${doc.nombre_documento}`}
                    variant="secondary"
                />
            </div>
        </li>
    );
}

// ── ActionBtn ─────────────────────────────────────────────────────────────────

interface ActionBtnProps {
    onClick: () => void;
    loading: boolean;
    disabled: boolean;
    icon: React.ReactNode;
    label: string;
    title: string;
    variant: "primary" | "secondary";
}

function ActionBtn({ onClick, loading, disabled, icon, label, title, variant }: ActionBtnProps) {
    const base = "flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50";
    const styles =
        variant === "primary"
            ? `${base} bg-[#0066CC] text-white hover:bg-[#0055AA]`
            : `${base} bg-[#F5F3EE] text-[#555555] hover:bg-[#E5E5E5]`;

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={loading || disabled}
            title={title}
            aria-label={title}
            className={styles}
        >
            {loading ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
                icon
            )}
            {label}
        </button>
    );
}
