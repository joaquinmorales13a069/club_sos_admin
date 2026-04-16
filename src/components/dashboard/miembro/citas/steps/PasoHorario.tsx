import { useEffect, useState } from "react";
import Skeleton from "react-loading-skeleton";
import { IoTimeOutline } from "react-icons/io5";
import { getDisponibilidad } from "../../../../../lib/eaApi";

interface PasoHorarioProps {
  eaProviderId: number;
  eaServiceId: number;
  fecha: string;
  onSelect: (hora: string) => void;
  onBack: () => void;
}

function to12h(hora24: string): string {
  const [h, m] = hora24.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function PasoHorario({
  eaProviderId,
  eaServiceId,
  fecha,
  onSelect,
  onBack,
}: PasoHorarioProps) {
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getDisponibilidad(eaProviderId, eaServiceId, fecha)
      .then((raw) => {
        const minTimestamp = Date.now() + 24 * 60 * 60 * 1000;
        const validos = raw.filter((hora) => {
          const [h, m] = hora.split(":").map(Number);
          const slotDate = new Date(
            `${fecha}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`,
          );
          return slotDate.getTime() >= minTimestamp;
        });
        setSlots(validos);
      })
      .catch(() => setSlots([]))
      .finally(() => setLoading(false));
  }, [eaProviderId, eaServiceId, fecha]);

  return (
    <div>
      <h3 className="text-lg font-bold text-[#333333]">Elige un horario</h3>
      <p className="mt-1 text-sm text-[#666666]">
        Horarios disponibles para la fecha seleccionada
      </p>

      {loading ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} height={44} borderRadius={12} />
          ))}
        </div>
      ) : slots.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#E5E5E5] py-16 text-center">
          <IoTimeOutline size={36} className="text-[#CCCCCC]" />
          <p className="text-sm text-[#666666]">
            No hay horarios disponibles para esta fecha.
          </p>
          <button
            type="button"
            onClick={onBack}
            className="mt-2 text-sm font-semibold text-[#0066CC] hover:underline cursor-pointer"
          >
            Elegir otra fecha
          </button>
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {slots.map((hora) => (
              <button
                key={hora}
                type="button"
                onClick={() => setSelected(hora)}
                className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-all cursor-pointer ${
                  selected === hora
                    ? "border-[#0066CC] bg-[#0066CC] text-white shadow-sm"
                    : "border-[#E5E5E5] bg-white text-[#333333] hover:border-[#0066CC]/40"
                }`}
              >
                {to12h(hora)}
              </button>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={onBack}
              className="text-sm font-semibold text-[#0066CC] hover:underline cursor-pointer"
            >
              ← Cambiar fecha
            </button>
            <button
              type="button"
              disabled={!selected}
              onClick={() => selected && onSelect(selected)}
              className="rounded-xl bg-[#0066CC] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#0055AA] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Continuar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
