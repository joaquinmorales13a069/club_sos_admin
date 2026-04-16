import {
  IoLocationOutline,
  IoMedkitOutline,
  IoPersonOutline,
  IoCalendarOutline,
  IoTimeOutline,
} from "react-icons/io5";
import type { WizardState } from "../../../../types/citas";

const STEP_LABELS = [
  "Ubicación",
  "Servicio",
  "Doctor",
  "Fecha",
  "Horario",
  "Paciente",
  "Confirmar",
];

interface SummaryItem {
  icon: React.ReactNode;
  label: string;
  value: string;
  minStep: number;
}

function buildSummaryItems(wizard: WizardState): SummaryItem[] {
  const items: SummaryItem[] = [];

  if (wizard.ubicacionNombre) {
    items.push({
      icon: <IoLocationOutline size={14} />,
      label: "Ubicación",
      value: wizard.ubicacionNombre,
      minStep: 2,
    });
  }

  if (wizard.servicioNombre) {
    items.push({
      icon: <IoMedkitOutline size={14} />,
      label: "Servicio",
      value: wizard.servicioNombre,
      minStep: 3,
    });
  }

  if (wizard.doctorNombre) {
    items.push({
      icon: <IoPersonOutline size={14} />,
      label: "Doctor",
      value: wizard.doctorNombre,
      minStep: 4,
    });
  }

  if (wizard.fecha) {
    const formatted = new Intl.DateTimeFormat("es-NI", {
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(new Date(wizard.fecha + "T12:00:00"));
    items.push({
      icon: <IoCalendarOutline size={14} />,
      label: "Fecha",
      value: formatted.charAt(0).toUpperCase() + formatted.slice(1),
      minStep: 5,
    });
  }

  if (wizard.hora) {
    const [h, m] = wizard.hora.split(":").map(Number);
    const suffix = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    items.push({
      icon: <IoTimeOutline size={14} />,
      label: "Hora",
      value: `${h12}:${String(m).padStart(2, "0")} ${suffix}`,
      minStep: 6,
    });
  }

  return items;
}

interface WizardProgressBarProps {
  currentStep: number;
  wizard: WizardState;
}

export function WizardProgressBar({
  currentStep,
  wizard,
}: WizardProgressBarProps) {
  const items = buildSummaryItems(wizard).filter(
    (item) => item.minStep <= currentStep,
  );

  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center justify-between text-xs text-[#666666]">
        <span className="font-semibold text-[#0066CC]">
          Paso {currentStep} de {STEP_LABELS.length}
        </span>
        <span>{STEP_LABELS[currentStep - 1]}</span>
      </div>
      <div className="flex gap-1.5">
        {STEP_LABELS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < currentStep ? "bg-[#0066CC]" : "bg-[#E5E5E5]"
            }`}
          />
        ))}
      </div>

      {items.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              key={item.label}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E5E5] bg-[#F5F3EE]/60 px-3 py-1 text-xs text-[#333333]"
            >
              <span className="text-[#0066CC]">{item.icon}</span>
              <span className="font-semibold">{item.value}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
