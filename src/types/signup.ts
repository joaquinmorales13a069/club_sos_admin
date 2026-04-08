// Pasos del flujo de registro
export type SignupStep = 1 | 2 | 3 | 3.5 | 4 | 5;

// Parentesco del nuevo miembro
export type Parentesco = "titular" | "conyuge" | "hijo" | "familiar";

// Datos de empresa (de la tabla empresas)
export interface Empresa {
  $id: string;
  nombre_empresa: string;
  codigo_empresa: string;
  estado: "activo" | "inactivo";
  notas?: string;
}

// Datos del miembro titular (para paso 3.5)
export interface MiembroTitular {
  $id: string;
  nombre_completo: string;
  documento_identidad: string;
  empresa_id: string;
  telefono: string;
}

// Estado acumulado del formulario entre pasos
export interface SignupFormData {
  // Paso 1 — OTP
  telefono: string;
  authUserId: string;

  // Paso 2 — Empresa
  empresa: Empresa | null;

  // Paso 3 — Parentesco
  parentesco: Parentesco | null;

  // Paso 3.5 — Titular (solo si parentesco != "titular")
  titular: MiembroTitular | null;

  // Paso 4 — Perfil
  nombre_completo: string;
  sexo: "masculino" | "femenino" | "";
  fecha_nacimiento: string;
  documento_identidad: string;
  correo: string;
}

// Props base que recibe cada paso
export interface StepProps {
  formData: SignupFormData;
  onNext: (data: Partial<SignupFormData>) => void;
}
