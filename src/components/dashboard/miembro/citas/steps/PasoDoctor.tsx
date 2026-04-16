import { useEffect, useState } from "react";
import Skeleton from "react-loading-skeleton";
import { IoPersonOutline } from "react-icons/io5";
import { Query } from "appwrite";
import { databases } from "../../../../../lib/appwrite";
import type { Doctor, WizardState } from "../../../../../types/citas";

const DB_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const TABLE_DOCTORES = import.meta.env.VITE_APPWRITE_TABLE_DOCTORES_ID;

interface PasoDoctorProps {
  eaServiceId: number;
  onSelect: (patch: Partial<WizardState>) => void;
  onBack: () => void;
}

export function PasoDoctor({ eaServiceId, onSelect, onBack }: PasoDoctorProps) {
  const [doctores, setDoctores] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    databases
      .listDocuments(DB_ID, TABLE_DOCTORES, [
        Query.contains("ea_servicios", String(eaServiceId)),
        Query.equal("activo", true),
      ])
      .then((res) => setDoctores(res.documents as unknown as Doctor[]))
      .finally(() => setLoading(false));
  }, [eaServiceId]);

  return (
    <div>
      <h3 className="text-lg font-bold text-[#333333]">Elige tu doctor</h3>
      <p className="mt-1 text-sm text-[#666666]">
        Selecciona el profesional para tu cita
      </p>

      {loading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} height={100} borderRadius={16} />
          ))}
        </div>
      ) : doctores.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#E5E5E5] py-16 text-center">
          <IoPersonOutline size={36} className="text-[#CCCCCC]" />
          <p className="text-sm text-[#666666]">
            No hay doctores disponibles para este servicio.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {doctores.map((d) => {
            const initials = `${d.nombres[0]}${d.apellidos[0]}`.toUpperCase();
            const fullName = `${d.nombres} ${d.apellidos}`;
            return (
              <button
                key={d.$id}
                type="button"
                onClick={() =>
                  onSelect({
                    eaProviderId: d.ea_id,
                    doctorNombre: fullName,
                  })
                }
                className="group flex items-center gap-4 rounded-2xl border border-[#E5E5E5] bg-white p-5 text-left shadow-[0_1px_2px_0_rgba(0,0,0,0.04)] transition-all hover:border-[#0066CC]/40 hover:shadow-md cursor-pointer"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#0066CC]/10 text-sm font-bold text-[#0066CC] transition-colors group-hover:bg-[#0066CC] group-hover:text-white">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[#333333]">
                    {fullName}
                  </p>
                  <p className="truncate text-sm text-[#666666]">{d.email}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={onBack}
        className="mt-6 text-sm font-semibold text-[#0066CC] hover:underline cursor-pointer"
      >
        ← Cambiar servicio
      </button>
    </div>
  );
}
