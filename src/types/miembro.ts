/**
 * Valores del enum `rol` en la tabla Appwrite `miembros`.
 * Deben coincidir con la definicion en el panel de Appwrite.
 */
export type MiembroRol = "admin" | "empresa_admin" | "miembro";

/** Etiquetas para mostrar el rol en la UI */
export const ROL_LABEL: Record<MiembroRol, string> = {
  miembro: "Miembro",
  empresa_admin: "Administrador de empresa",
  admin: "Administrador",
};

export type EstadoBeneficio = "activa" | "expirada";
export type TipoBeneficio = "descuento" | "promocion" | "anuncio";

export interface BeneficioFormData {
  titulo: string;
  descripcion: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado_beneficio: EstadoBeneficio;
  tipo_beneficio: TipoBeneficio | "";
  empresa_id: string[];
  beneficio_image_url: string;
}

export interface Beneficio {
  $id: string;
  titulo: string;
  descripcion: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  estado_beneficio: string;
  tipo_beneficio: string | null;
  empresa_id: string[];
  beneficio_image_url: string | null;
}

export interface Miembro {
  $id: string;
  auth_user_id: string;
  empresa_id: string;
  parentesco: string;
  nombre_completo: string;
  fecha_nacimiento: string;
  sexo: string;
  documento_identidad: string | null;
  correo: string | null;
  telefono: string;
  titular_miembro_id: string | null;
  rol: MiembroRol;
  activo: boolean;
  ea_customer_sync?: boolean;
}
