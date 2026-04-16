import { useState } from "react";
import { DayPicker } from "react-day-picker";
import { es as esBase } from "date-fns/locale";
import type { Locale } from "date-fns";

const es: Locale = {
  ...esBase,
  localize: {
    ...esBase.localize!,
    month: ((n: number, options?: { width?: string }) => {
      const raw = esBase.localize!.month(n, options) as string;
      return raw.charAt(0).toUpperCase() + raw.slice(1);
    }) as Locale["localize"]["month"],
  },
};
import { IoInformationCircleOutline } from "react-icons/io5";
import "react-day-picker/style.css";

interface PasoFechaProps {
  onSelect: (fecha: string) => void;
  onBack: () => void;
}

const toLocalDateString = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export function PasoFecha({ onSelect, onBack }: PasoFechaProps) {
  const [selected, setSelected] = useState<Date | undefined>();

  const tomorrow = new Date(Date.now() + 86400000);
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 3);

  return (
    <div>
      <h3 className="text-lg font-bold text-[#333333]">Selecciona la fecha</h3>
      <p className="mt-1 text-sm text-[#666666]">
        Elige el día para tu cita médica
      </p>

      <div className="mt-5 flex items-start gap-3 rounded-xl border border-[#0066CC]/20 bg-[#0066CC]/5 px-4 py-3">
        <IoInformationCircleOutline
          size={20}
          className="mt-0.5 shrink-0 text-[#0066CC]"
        />
        <p className="text-sm leading-relaxed text-[#333333]">
          Las citas deben agendarse con al menos{" "}
          <strong className="text-[#0066CC]">24 horas de anticipación</strong> y
          hasta un máximo de{" "}
          <strong className="text-[#0066CC]">3 meses</strong> a partir de hoy.
          Los domingos no están disponibles.
        </p>
      </div>

      <div
        className="mt-6 flex justify-center"
        style={{
          "--rdp-day_button-height": "48px",
          "--rdp-day_button-width": "48px",
          "--rdp-accent-color": "#0066CC",
          "--rdp-accent-background-color": "#0066CC",
          "--rdp-today-color": "#0066CC",
          "--rdp-disabled-opacity": "0.35",
          "--rdp-month_caption-font": "bold 1.25rem / 1.4 'Poppins', sans-serif",
          "--rdp-weekday-font": "600 0.875rem / 1 'Poppins', sans-serif",
        } as React.CSSProperties}
      >
        <DayPicker
          mode="single"
          locale={es}
          selected={selected}
          onSelect={setSelected}
          disabled={[{ dayOfWeek: [0] }, { before: tomorrow, after: maxDate }]}
          startMonth={tomorrow}
          endMonth={maxDate}
          classNames={{
            today: "!font-bold !text-[#0066CC] !opacity-100 !no-underline",
            selected: "!bg-[#0066CC] !text-white rounded-xl font-semibold shadow-md",
            disabled: "text-[#9CA3AF] line-through",
            root: "text-[#333333] text-base p-4",
            chevron: "fill-[#0066CC]",
          }}
        />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-semibold text-[#0066CC] hover:underline cursor-pointer"
        >
          ← Cambiar doctor
        </button>

        <button
          type="button"
          disabled={!selected}
          onClick={() => selected && onSelect(toLocalDateString(selected))}
          className="rounded-xl bg-[#0066CC] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#0055AA] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
