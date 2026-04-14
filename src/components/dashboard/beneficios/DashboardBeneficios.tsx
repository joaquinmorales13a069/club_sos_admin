import { useEffect, useState } from "react";
import Skeleton from "react-loading-skeleton";
import { IoGiftOutline } from "react-icons/io5";
import type { Beneficio, Miembro } from "../../../types/miembro";
import { getBeneficiosDisponibles } from "../../../lib/appwrite";

export function DashboardBeneficios({ miembro }: { miembro: Miembro }) {
    const [beneficios, setBeneficios] = useState<Beneficio[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getBeneficiosDisponibles(miembro.empresa_id, 0)
            .then(setBeneficios)
            .finally(() => setLoading(false));
    }, [miembro.empresa_id]);

    return (
        <div className="space-y-6">
            <header className="rounded-2xl border border-[#0066CC]/15 bg-linear-to-br from-white to-[#0066CC]/6 px-5 py-6 md:px-7">
                <p className="text-sm font-medium text-[#666666]">Tu membresía</p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#0066CC] md:text-3xl">
                    Beneficios disponibles
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[#666666]">
                    Descuentos, programas y ventajas activas para tu membresía.
                </p>
            </header>

            {loading ? (
                <div className="grid gap-4 sm:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} height={120} borderRadius={16} />
                    ))}
                </div>
            ) : beneficios.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#E5E5E5] py-16 text-center">
                    <IoGiftOutline size={36} className="text-[#CCCCCC]" />
                    <p className="text-sm text-[#666666]">No hay beneficios activos actualmente.</p>
                </div>
            ) : (
                <ul className="grid gap-4 sm:grid-cols-2">
                    {beneficios.map((b) => (
                        <li
                            key={b.$id}
                            className="rounded-2xl border border-[#E5E5E5] bg-white p-5 shadow-sm"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0066CC]/10 text-[#0066CC]">
                                    <IoGiftOutline size={20} />
                                </div>
                                {b.tipo_beneficio && (
                                    <span className="rounded-full bg-[#F5F3EE] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#666666]">
                                        {b.tipo_beneficio}
                                    </span>
                                )}
                            </div>
                            <p className="mt-3 font-semibold text-[#333333]">{b.titulo}</p>
                            <p className="mt-1 text-sm leading-relaxed text-[#666666]">
                                {b.descripcion}
                            </p>
                            {b.fecha_fin && (
                                <p className="mt-3 text-xs text-[#666666]/80">
                                    Hasta{" "}
                                    {new Date(b.fecha_fin).toLocaleDateString("es-NI", {
                                        day: "numeric",
                                        month: "long",
                                        year: "numeric",
                                    })}
                                </p>
                            )}
                            {b.empresa_id.length === 0 && (
                                <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#0066CC]/8 px-2.5 py-0.5 text-[10px] font-semibold text-[#0066CC]">
                                    Beneficio general
                                </span>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
