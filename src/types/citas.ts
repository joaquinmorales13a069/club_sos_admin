export type EstadoSync = "pendiente" | "sincronizado" | "fallido";

export interface Cita {
  $id: string;
  miembro_id: string;
  empresa_id: string;
  fecha_hora_cita: string;
  motivo_cita: string | null;
  ea_service_id: string;
  ea_provider_id: string;
  ea_customer_id: string;
  estado_sync: EstadoSync;
  ea_appointment_id: string | null;
  para_titular: boolean;
  paciente_nombre: string;
  paciente_telefono: string | null;
  paciente_correo: string | null;
  paciente_cedula: string | null;
  $createdAt: string;
  $updatedAt: string;
}

export interface Servicio {
  $id: string;
  ea_id: number;
  nombre: string;
  duracion: number;
  precio: number;
  moneda: string;
  descripcion: string | null;
  ubicacion: string | null;
  ea_category_id: number;
}

export interface Doctor {
  $id: string;
  ea_id: number;
  nombres: string;
  apellidos: string;
  email: string;
  telefono: string;
  ea_servicios: string[];
  activo: boolean;
}

export type WizardStep =
  | "lista"
  | "ubicacion"
  | "servicio"
  | "doctor"
  | "fecha"
  | "horario"
  | "paciente"
  | "confirmar";

export interface WizardState {
  categoriaId: number | null;
  ubicacionNombre: string;
  eaServiceId: number | null;
  servicioNombre: string;
  servicioDuracion: number;
  eaProviderId: number | null;
  doctorNombre: string;
  fecha: string;
  hora: string;
  paraTitular: boolean;
  pacienteNombre: string;
  pacienteTelefono: string;
  pacienteCorreo: string;
  pacienteCedula: string;
  citaIdToEdit?: string;
}

export const WIZARD_INITIAL: WizardState = {
  categoriaId: null,
  ubicacionNombre: "",
  eaServiceId: null,
  servicioNombre: "",
  servicioDuracion: 0,
  eaProviderId: null,
  doctorNombre: "",
  fecha: "",
  hora: "",
  paraTitular: true,
  pacienteNombre: "",
  pacienteTelefono: "",
  pacienteCorreo: "",
  pacienteCedula: "",
};
