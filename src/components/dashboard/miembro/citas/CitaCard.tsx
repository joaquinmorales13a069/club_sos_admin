import { useState } from "react";
import {
  IoCheckmarkCircleOutline,
  IoTimeOutline,
  IoCloseCircleOutline,
  IoCreateOutline,
  IoTrashOutline,
} from "react-icons/io5";
import type { Cita, EstadoSync, Servicio } from "../../../../types/citas";

const ESTADO_CONFIG: Record<
  EstadoSync,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  sincronizado: {
    label: "Confirmada",
    color: "#16A34A",
    bg: "rgba(22,163,74,0.08)",
    icon: <IoCheckmarkCircleOutline size={16} />,
  },
  pendiente: {
    label: "Pendiente de aprobación",
    color: "#D97706",
    bg: "rgba(217,119,6,0.08)",
    icon: <IoTimeOutline size={16} />,
  },
  fallido: {
    label: "Rechazada",
    color: "#9CA3AF",
    bg: "rgba(156,163,175,0.08)",
    icon: <IoCloseCircleOutline size={16} />,
  },
};

const formatFechaCita = (isoString: string): string => {
  const date = new Date(isoString);
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const weekday = cap(
    new Intl.DateTimeFormat("es-NI", {
      weekday: "long",
      timeZone: "UTC",
    }).format(date),
  );
  const day = new Intl.DateTimeFormat("es-NI", {
    day: "2-digit",
    timeZone: "UTC",
  }).format(date);
  const month = cap(
    new Intl.DateTimeFormat("es-NI", {
      month: "long",
      timeZone: "UTC",
    }).format(date),
  );
  const time = new Intl.DateTimeFormat("es-NI", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(date);
  return `${weekday}, ${day} de ${month} a las ${time}`;
};

interface CitaCardProps {
  cita: Cita;
  servicioNombre: string;
  doctorNombre: string;
  serviceMap: Map<number, Servicio>;
  doctorMap: Map<number, string>;
  onEdit: () => void;
  onDelete: () => void;
}

export function CitaCard({
  cita,
  servicioNombre,
  doctorNombre,
  onEdit,
  onDelete,
}: CitaCardProps) {
  const [deleting, setDeleting] = useState(false);
  const estado = ESTADO_CONFIG[cita.estado_sync];

  async function handleDelete() {
    if (!window.confirm("¿Estás seguro de que deseas eliminar esta cita?"))
      return;
    setDeleting(true);
    onDelete();
  }

  return (
    <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
      {/* Badge estado */}
      <div className="mb-3 flex items-center justify-between">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{ color: estado.color, backgroundColor: estado.bg }}
        >
          {estado.icon}
          {estado.label}
        </span>
        {!cita.para_titular && (
          <span className="rounded-full bg-[#0066CC]/10 px-2.5 py-0.5 text-[10px] font-semibold text-[#0066CC]">
            Tercero
          </span>
        )}
      </div>

      {/* Fecha */}
      <p className="text-sm font-semibold text-[#333333]">
        {formatFechaCita(cita.fecha_hora_cita)}
      </p>

      {/* Detalles */}
      <div className="mt-2 space-y-0.5 text-sm text-[#666666]">
        <p>{servicioNombre}</p>
        <p>{doctorNombre}</p>
        <p>{cita.paciente_nombre}</p>
      </div>

      {/* Acciones */}
      <div className="mt-4 flex items-center gap-2">
        {cita.estado_sync === "pendiente" && (
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center gap-1.5 rounded-lg border border-[#E5E5E5] px-3 py-1.5 text-xs font-semibold text-[#0066CC] hover:bg-[#F5F3EE] transition-colors cursor-pointer"
          >
            <IoCreateOutline size={14} />
            Editar
          </button>
        )}
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center gap-1.5 rounded-lg border border-[#E5E5E5] px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40 cursor-pointer"
        >
          <IoTrashOutline size={14} />
          {deleting ? "Eliminando..." : "Eliminar"}
        </button>
      </div>
    </div>
  );
}
