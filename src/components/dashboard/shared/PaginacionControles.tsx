import { IoChevronBackOutline, IoChevronForwardOutline } from "react-icons/io5";

interface Props {
    pagina: number;
    totalPaginas: number;
    total: number;
    porPagina: number;
    onCambiar: (p: number) => void;
}

/**
 * Barra de paginación reutilizable para todas las tablas del dashboard.
 * Muestra: "X – Y de Z" + botones prev / números / next.
 */
export function PaginacionControles({ pagina, totalPaginas, total, porPagina, onCambiar }: Props) {
    if (totalPaginas <= 1) return null;

    const inicio = (pagina - 1) * porPagina + 1;
    const fin    = Math.min(pagina * porPagina, total);

    // Rango de páginas a mostrar (max 5 botones)
    const paginas = getPaginasVisibles(pagina, totalPaginas);

    return (
        <div className="flex flex-col items-center gap-3 pt-2 sm:flex-row sm:justify-between">
            <p className="text-xs text-[#999999]">
                Mostrando <span className="font-semibold text-[#555555]">{inicio}–{fin}</span> de{" "}
                <span className="font-semibold text-[#555555]">{total}</span>
            </p>

            <div className="flex items-center gap-1">
                {/* Prev */}
                <PagBtn
                    onClick={() => onCambiar(pagina - 1)}
                    disabled={pagina === 1}
                    aria-label="Página anterior"
                >
                    <IoChevronBackOutline size={14} />
                </PagBtn>

                {/* Números */}
                {paginas.map((p, i) =>
                    p === "…" ? (
                        <span key={`ellipsis-${i}`} className="px-1 text-xs text-[#AAAAAA]">…</span>
                    ) : (
                        <PagBtn
                            key={p}
                            onClick={() => onCambiar(p as number)}
                            active={p === pagina}
                        >
                            {p}
                        </PagBtn>
                    ),
                )}

                {/* Next */}
                <PagBtn
                    onClick={() => onCambiar(pagina + 1)}
                    disabled={pagina === totalPaginas}
                    aria-label="Página siguiente"
                >
                    <IoChevronForwardOutline size={14} />
                </PagBtn>
            </div>
        </div>
    );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function PagBtn({
    children,
    onClick,
    disabled = false,
    active = false,
    "aria-label": ariaLabel,
}: {
    children: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
    active?: boolean;
    "aria-label"?: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={ariaLabel}
            aria-current={active ? "page" : undefined}
            className={`flex h-7 min-w-[28px] items-center justify-center rounded-lg px-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                active
                    ? "bg-[#0066CC] text-white shadow-sm"
                    : "text-[#555555] hover:bg-[#F5F3EE] hover:text-[#0066CC]"
            }`}
        >
            {children}
        </button>
    );
}

function getPaginasVisibles(actual: number, total: number): (number | "…")[] {
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);

    const paginas: (number | "…")[] = [];

    if (actual <= 3) {
        paginas.push(1, 2, 3, 4, "…", total);
    } else if (actual >= total - 2) {
        paginas.push(1, "…", total - 3, total - 2, total - 1, total);
    } else {
        paginas.push(1, "…", actual - 1, actual, actual + 1, "…", total);
    }

    return paginas;
}
