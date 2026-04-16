import { useState } from "react";
import {
  IoCheckmarkCircleOutline,
  IoAlertCircleOutline,
  IoPersonOutline,
} from "react-icons/io5";
import type { WizardState } from "../../../../../types/citas";

interface PasoConfirmarProps {
  wizard: WizardState;
  onConfirm: () => Promise<void>;
  onBack: () => void;
}

const formatFechaLocal = (yyyy_mm_dd: string): string =>
  new Intl.DateTimeFormat("es-NI", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(yyyy_mm_dd + "T12:00:00"));

function to12h(hora24: string): string {
  const [h, m] = hora24.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function PasoConfirmar({
  wizard,
  onConfirm,
  onBack,
}: PasoConfirmarProps) {
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h3 className="text-lg font-bold text-[#333333]">Confirmar cita</h3>
      <p className="mt-1 text-sm text-[#666666]">
        Revisa los detalles antes de agendar
      </p>

      <div className="mt-6 space-y-4">
        {/* Servicio + Ubicación */}
        <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#666666]">
            Servicio
          </p>
          <p className="mt-1 font-semibold text-[#333333]">
            {wizard.servicioNombre}
          </p>
          <p className="mt-0.5 text-sm text-[#666666]">
            {wizard.ubicacionNombre}
          </p>
        </div>

        {/* Doctor + Fecha + Hora */}
        <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#666666]">
            Cita
          </p>
          <p className="mt-1 font-semibold text-[#333333]">
            {wizard.doctorNombre}
          </p>
          <p className="mt-0.5 text-sm text-[#666666]">
            {cap(formatFechaLocal(wizard.fecha))} a las {to12h(wizard.hora)}
          </p>
        </div>

        {/* Paciente */}
        <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#666666]">
              Paciente
            </p>
            {!wizard.paraTitular && (
              <span className="flex items-center gap-1 rounded-full bg-[#0066CC]/10 px-2.5 py-0.5 text-[10px] font-semibold text-[#0066CC]">
                <IoPersonOutline size={12} />
                Tercero
              </span>
            )}
          </div>
          <p className="mt-1 font-semibold text-[#333333]">
            {wizard.pacienteNombre}
          </p>
          {wizard.pacienteTelefono && (
            <p className="mt-0.5 text-sm text-[#666666]">
              {wizard.pacienteTelefono}
            </p>
          )}
          {wizard.pacienteCorreo && (
            <p className="text-sm text-[#666666]">{wizard.pacienteCorreo}</p>
          )}
          {wizard.pacienteCedula && (
            <p className="text-sm text-[#666666]">{wizard.pacienteCedula}</p>
          )}
        </div>

        {/* Banner pendiente */}
        <div className="flex items-start gap-3 rounded-2xl border border-[#D97706]/30 bg-[#D97706]/5 p-4">
          <IoAlertCircleOutline
            size={22}
            className="mt-0.5 shrink-0 text-[#D97706]"
          />
          <p className="text-sm leading-relaxed text-[#333333]">
            La cita quedará{" "}
            <strong className="text-[#D97706]">pendiente de aprobación</strong>.
            Un administrador la revisará y agendará en la clínica.
          </p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="text-sm font-semibold text-[#0066CC] hover:underline disabled:opacity-40 cursor-pointer"
        >
          ← Volver
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={submitting}
          className="flex items-center gap-2 rounded-xl bg-[#0066CC] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#0055AA] disabled:opacity-60 cursor-pointer"
        >
          <IoCheckmarkCircleOutline size={18} />
          {submitting
            ? "Agendando..."
            : wizard.citaIdToEdit
              ? "Reagendar cita"
              : "Confirmar cita"}
        </button>
      </div>
    </div>
  );
}
