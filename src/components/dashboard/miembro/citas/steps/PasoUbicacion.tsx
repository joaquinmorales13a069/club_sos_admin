import { IoLocationOutline } from "react-icons/io5";
import type { WizardState } from "../../../../../types/citas";

const UBICACIONES = [
  { id: 1, nombre: "Managua", descripcion: "Clínicas SOS en la capital" },
  { id: 2, nombre: "León", descripcion: "Clínicas SOS en el occidente" },
];

interface PasoUbicacionProps {
  onSelect: (patch: Partial<WizardState>) => void;
}

export function PasoUbicacion({ onSelect }: PasoUbicacionProps) {
  return (
    <div>
      <h3 className="text-lg font-bold text-[#333333]">
        ¿Dónde deseas tu cita?
      </h3>
      <p className="mt-1 text-sm text-[#666666]">
        Selecciona la ubicación de la clínica
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {UBICACIONES.map((u) => (
          <button
            key={u.id}
            type="button"
            onClick={() =>
              onSelect({ categoriaId: u.id, ubicacionNombre: u.nombre })
            }
            className="group flex items-start gap-4 rounded-2xl border border-[#E5E5E5] bg-white p-5 text-left shadow-[0_1px_2px_0_rgba(0,0,0,0.04)] transition-all hover:border-[#0066CC]/40 hover:shadow-md cursor-pointer"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0066CC]/10 text-[#0066CC] transition-colors group-hover:bg-[#0066CC] group-hover:text-white">
              <IoLocationOutline size={22} />
            </div>
            <div>
              <p className="font-semibold text-[#333333]">{u.nombre}</p>
              <p className="mt-0.5 text-sm text-[#666666]">{u.descripcion}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
