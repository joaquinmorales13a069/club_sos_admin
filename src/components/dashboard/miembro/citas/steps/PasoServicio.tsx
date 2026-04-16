import { useEffect, useState } from "react";
import Skeleton from "react-loading-skeleton";
import { IoMedkitOutline } from "react-icons/io5";
import { Query } from "appwrite";
import { databases } from "../../../../../lib/appwrite";
import type { Servicio, WizardState } from "../../../../../types/citas";

const DB_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const TABLE_SERVICIOS = import.meta.env.VITE_APPWRITE_TABLE_SERVICIOS_ID;

function formatDuracion(min: number): string {
  if (min >= 60) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h ${m} min` : `${h}h`;
  }
  return `${min} min`;
}

interface PasoServicioProps {
  categoriaId: number;
  onSelect: (patch: Partial<WizardState>) => void;
  onBack: () => void;
}

export function PasoServicio({
  categoriaId,
  onSelect,
  onBack,
}: PasoServicioProps) {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    databases
      .listDocuments(DB_ID, TABLE_SERVICIOS, [
        Query.equal("ea_category_id", categoriaId),
      ])
      .then((res) =>
        setServicios(res.documents as unknown as Servicio[]),
      )
      .finally(() => setLoading(false));
  }, [categoriaId]);

  return (
    <div>
      <h3 className="text-lg font-bold text-[#333333]">
        Selecciona un servicio
      </h3>
      <p className="mt-1 text-sm text-[#666666]">
        Elige la especialidad o servicio que necesitas
      </p>

      {loading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={120} borderRadius={16} />
          ))}
        </div>
      ) : servicios.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#E5E5E5] py-16 text-center">
          <IoMedkitOutline size={36} className="text-[#CCCCCC]" />
          <p className="text-sm text-[#666666]">
            No hay servicios disponibles en esta ubicación.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {servicios.map((s) => (
            <button
              key={s.$id}
              type="button"
              onClick={() =>
                onSelect({
                  eaServiceId: s.ea_id,
                  servicioNombre: s.nombre,
                  servicioDuracion: s.duracion,
                })
              }
              className="group flex flex-col rounded-2xl border border-[#E5E5E5] bg-white p-5 text-left shadow-[0_1px_2px_0_rgba(0,0,0,0.04)] transition-all hover:border-[#0066CC]/40 hover:shadow-md cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0066CC]/10 text-[#0066CC] transition-colors group-hover:bg-[#0066CC] group-hover:text-white">
                  <IoMedkitOutline size={20} />
                </div>
                <span className="rounded-full bg-[#F5F3EE] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#666666]">
                  {formatDuracion(s.duracion)}
                </span>
              </div>
              <p className="mt-3 font-semibold text-[#333333]">{s.nombre}</p>
              {s.descripcion && (
                <p className="mt-1 text-sm leading-relaxed text-[#666666]">
                  {s.descripcion}
                </p>
              )}
              <p className="mt-3 text-sm font-bold text-[#0066CC]">
                {s.moneda} {s.precio.toLocaleString()}
              </p>
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onBack}
        className="mt-6 text-sm font-semibold text-[#0066CC] hover:underline cursor-pointer"
      >
        ← Cambiar ubicación
      </button>
    </div>
  );
}
