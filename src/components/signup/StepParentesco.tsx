import { IoArrowBack } from "react-icons/io5";
import type { Parentesco, StepProps } from "../../types/signup";

type Props = Pick<StepProps, "onNext" | "onBack">;

// Opciones de parentesco con su descripcion para mayor claridad al usuario
const OPCIONES: { value: Parentesco; label: string; descripcion: string }[] = [
  {
    value: "titular",
    label: "Titular",
    descripcion: "Soy trabajador/a de la empresa.",
  },
  {
    value: "conyuge",
    label: "Conyuge",
    descripcion: "Soy esposo/a de un trabajador/a de la empresa.",
  },
  {
    value: "hijo",
    label: "Hijo/a",
    descripcion: "Soy hijo/a de un trabajador/a de la empresa.",
  },
  {
    value: "familiar",
    label: "Familiar",
    descripcion: "Soy otro familiar de un trabajador/a de la empresa.",
  },
];

export default function StepParentesco({ onNext, onBack }: Props) {
  // Al seleccionar parentesco, pasa directamente al siguiente paso
  // sin necesidad de boton — mejora la fluidez del flujo
  const handleSelect = (parentesco: Parentesco) => {
    onNext({ parentesco });
  };

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-[#666666] transition-colors hover:bg-[#E8E8E8]"
            aria-label="Retroceder"
          >
            <IoArrowBack size={16} />
            Regresar
          </button>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#0066CC]">
            Paso 3 de 5
          </span>
        </div>
        <h2 className="text-3xl font-bold text-[#0066CC]">
          Tipo de cuenta
        </h2>
      </div>

      <p className="text-base leading-snug text-[#666666]">
        Selecciona tu parentesco para continuar con el registro.
      </p>

      <div className="mt-1 flex flex-col gap-2.5">
        {OPCIONES.map((opcion) => (
          <button
            key={opcion.value}
            type="button"
            onClick={() => handleSelect(opcion.value)}
            className="flex w-full flex-col gap-0.5 rounded-xl border border-[#666666] bg-white px-4 py-3.5 text-left transition-colors hover:border-[#0066CC] hover:bg-[#E8F0FB]"
          >
            <span className="text-base font-semibold text-[#333333]">
              {opcion.label}
            </span>
            <span className="text-sm text-[#666666]">{opcion.descripcion}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
