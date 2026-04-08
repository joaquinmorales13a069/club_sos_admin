import type { Parentesco, StepProps } from "../../types/signup";

type Props = Pick<StepProps, "onNext">;

// Opciones de parentesco con su descripcion para mayor claridad al usuario
const OPCIONES: { value: Parentesco; label: string; descripcion: string }[] = [
  {
    value: "titular",
    label: "Titular",
    descripcion: "Soy el titular principal de la cuenta.",
  },
  {
    value: "conyuge",
    label: "Conyuge",
    descripcion: "Soy esposo/a del titular de la cuenta.",
  },
  {
    value: "hijo",
    label: "Hijo/a",
    descripcion: "Soy hijo/a del titular de la cuenta.",
  },
  {
    value: "familiar",
    label: "Familiar",
    descripcion: "Soy otro familiar del titular de la cuenta.",
  },
];

export default function StepParentesco({ onNext }: Props) {
  // Al seleccionar parentesco, pasa directamente al siguiente paso
  // sin necesidad de boton — mejora la fluidez del flujo
  const handleSelect = (parentesco: Parentesco) => {
    onNext({ parentesco });
  };

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
        <h2 className="text-3xl font-bold text-[#0066CC] md:text-4xl">
          Tipo de cuenta
        </h2>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#0066CC]">
          Paso 3 de 5
        </span>
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
