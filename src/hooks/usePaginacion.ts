import { useEffect, useState } from "react";

export interface UsePaginacionResult<T> {
    paginaActual: T[];
    pagina: number;
    totalPaginas: number;
    total: number;
    setPagina: (p: number) => void;
}

/**
 * Pagina client-side un array de items.
 * Resetea a la página 1 automáticamente cuando cambia el array (ej. al filtrar).
 *
 * @param items     - Array filtrado a paginar
 * @param porPagina - Items por página (default 20)
 */
export function usePaginacion<T>(items: T[], porPagina = 20): UsePaginacionResult<T> {
    const [pagina, setPaginaRaw] = useState(1);

    // Resetear a página 1 cuando los items cambian (filtro aplicado)
    useEffect(() => {
        setPaginaRaw(1);
    }, [items]);

    const totalPaginas = Math.max(1, Math.ceil(items.length / porPagina));

    function setPagina(p: number) {
        setPaginaRaw(Math.min(Math.max(1, p), totalPaginas));
    }

    const inicio = (pagina - 1) * porPagina;
    const paginaActual = items.slice(inicio, inicio + porPagina);

    return { paginaActual, pagina, totalPaginas, total: items.length, setPagina };
}
