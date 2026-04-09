import { Client, Account, Databases, Storage, ID, Query } from "appwrite";
import type { Miembro, MiembroRol } from "../types/miembro";
import type { Empresa, MiembroTitular, SignupFormData } from "../types/signup";
import { getOtpSmsGateStatus, recordOtpSmsSent } from "./otpRateLimit";

// Inicializa el cliente de Appwrite con el endpoint y el ID del proyecto
// definidos en las variables de entorno (.env)
const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

// Servicios disponibles de Appwrite
export const account = new Account(client);     // Autenticacion y sesiones
export const databases = new Databases(client); // Base de datos
export const storage = new Storage(client);     // Almacenamiento de archivos

// IDs de base de datos y tablas
const DB_ID = "69808b54002bc0fc790f";
const TABLE_EMPRESAS = "empresas";
const TABLE_MIEMBROS = "miembros";

// ---------------------------------------------------------------------------
// AUTH
// ---------------------------------------------------------------------------

/**
 * Envia un codigo OTP por SMS al numero de telefono indicado.
 * Appwrite crea el usuario automaticamente si no existe.
 *
 * @param phone - Numero en formato E.164 (ej: +50588887777)
 * @returns userId generado por Appwrite, necesario para verificar el OTP
 */
export async function sendPhoneOTP(phone: string): Promise<string> {
  const gate = getOtpSmsGateStatus(phone);
  if (gate.ok === false) {
    throw new Error(gate.message);
  }
  const token = await account.createPhoneToken(ID.unique(), phone);
  recordOtpSmsSent(phone);
  return token.userId;
}

/**
 * Verifica el OTP ingresado por el usuario y crea una sesion activa.
 * Si el codigo es incorrecto o expirado, Appwrite lanza un error.
 *
 * @param userId - ID retornado por sendPhoneOTP
 * @param otp - Codigo de 6 digitos recibido por SMS
 */
export async function verifyPhoneOTP(userId: string, otp: string): Promise<void> {
  await account.createSession(userId, otp);
}

/**
 * Retorna el ID del usuario autenticado en la sesion activa.
 * Se usa en el paso final para vincular auth_user_id con el nuevo miembro.
 */
export async function getCurrentUserId(): Promise<string> {
  const user = await account.get();
  return user.$id;
}

/**
 * Cierra la sesion actual en este dispositivo.
 */
export async function cerrarSesion(): Promise<void> {
  await account.deleteSession({ sessionId: "current" });
}

function parseMiembroRol(value: string): MiembroRol {
  if (value === "admin" || value === "empresa_admin" || value === "miembro") {
    return value;
  }
  return "miembro";
}

function documentoAMiembro(doc: Record<string, unknown>): Miembro {
  return {
    $id: String(doc.$id),
    auth_user_id: String(doc.auth_user_id),
    empresa_id: String(doc.empresa_id),
    parentesco: String(doc.parentesco),
    nombre_completo: String(doc.nombre_completo),
    fecha_nacimiento: String(doc.fecha_nacimiento),
    sexo: String(doc.sexo),
    documento_identidad:
      doc.documento_identidad == null ? null : String(doc.documento_identidad),
    correo: doc.correo == null ? null : String(doc.correo),
    telefono: String(doc.telefono),
    titular_miembro_id:
      doc.titular_miembro_id == null ? null : String(doc.titular_miembro_id),
    rol: parseMiembroRol(String(doc.rol)),
    activo: Boolean(doc.activo),
    ea_customer_sync:
      doc.ea_customer_sync == null ? undefined : Boolean(doc.ea_customer_sync),
  };
}

/**
 * Obtiene el documento de miembro vinculado al usuario de Auth (telefono OTP).
 * Un usuario puede no tener fila si aun no completo el registro en `miembros`.
 */
export async function getMiembroPorAuthUserId(
  authUserId: string,
): Promise<Miembro | null> {
  const response = await databases.listDocuments(DB_ID, TABLE_MIEMBROS, [
    Query.equal("auth_user_id", authUserId),
    Query.limit(1),
  ]);

  if (response.documents.length === 0) return null;

  return documentoAMiembro(
    response.documents[0] as unknown as Record<string, unknown>,
  );
}

// ---------------------------------------------------------------------------
// EMPRESAS
// ---------------------------------------------------------------------------

/**
 * Busca una empresa por su codigo_empresa (campo unico).
 * Retorna null si no existe ninguna empresa con ese codigo.
 *
 * @param codigo - Valor del campo codigo_empresa
 */
export async function buscarEmpresaPorCodigo(codigo: string): Promise<Empresa | null> {
  const response = await databases.listDocuments(DB_ID, TABLE_EMPRESAS, [
    Query.equal("codigo_empresa", codigo),
    Query.equal("estado", "activo"),
    Query.limit(1),
  ]);

  if (response.documents.length === 0) return null;

  const doc = response.documents[0];
  return {
    $id: doc.$id,
    nombre_empresa: doc.nombre_empresa,
    codigo_empresa: doc.codigo_empresa,
    estado: doc.estado,
    notas: doc.notas,
  };
}

// ---------------------------------------------------------------------------
// MIEMBROS
// ---------------------------------------------------------------------------

/**
 * Busca un miembro titular por nombre_completo y documento_identidad,
 * dentro de una empresa especifica (empresa_id).
 * La busqueda es exacta en ambos campos para mayor seguridad.
 *
 * @param empresaId - ID de la empresa del paso 2
 * @param nombreCompleto - Nombre exacto del titular
 * @param documentoIdentidad - Documento exacto del titular
 */
export async function buscarMiembroTitular(
  empresaId: string,
  nombreCompleto: string,
  documentoIdentidad: string,
): Promise<MiembroTitular | null> {
  const response = await databases.listDocuments(DB_ID, TABLE_MIEMBROS, [
    Query.equal("empresa_id", empresaId),
    Query.equal("parentesco", "titular"),
    Query.equal("nombre_completo", nombreCompleto),
    Query.equal("documento_identidad", documentoIdentidad),
    Query.limit(1),
  ]);

  if (response.documents.length === 0) return null;

  const doc = response.documents[0];
  return {
    $id: doc.$id,
    nombre_completo: doc.nombre_completo,
    documento_identidad: doc.documento_identidad,
    empresa_id: doc.empresa_id,
    telefono: doc.telefono,
  };
}

/** Limite del campo `name` en usuarios de Appwrite Auth */
const AUTH_NAME_MAX_LEN = 128;

/**
 * Crea el registro del nuevo miembro en la tabla miembros.
 * Se llama al finalizar el paso 5 (resumen).
 * El miembro se crea con activo = false, pendiente de activacion por un admin.
 *
 * Tambien actualiza el campo `name` del usuario de Auth para que coincida con
 * nombre_completo (visible en el panel de usuarios de Appwrite).
 *
 * @param data - Datos acumulados durante todo el flujo de registro
 * @param authUserId - ID del usuario autenticado (obtenido de getCurrentUserId)
 */
export async function crearMiembro(
  data: SignupFormData,
  authUserId: string,
): Promise<void> {
  const nombreAuth = data.nombre_completo.trim().slice(0, AUTH_NAME_MAX_LEN);

  // Primero el perfil Auth: si falla el documento, el usuario puede reintentar
  // sin fila duplicada en miembros.
  await account.updateName({ name: nombreAuth });

  await databases.createDocument(DB_ID, TABLE_MIEMBROS, ID.unique(), {
    auth_user_id: authUserId,
    empresa_id: data.empresa!.$id,
    parentesco: data.parentesco,
    titular_miembro_id: data.titular?.$id ?? null,
    nombre_completo: data.nombre_completo,
    fecha_nacimiento: data.fecha_nacimiento,
    sexo: data.sexo,
    documento_identidad: data.documento_identidad || null,
    correo: data.correo || null,
    telefono: data.telefono,
    rol: "miembro",
    activo: false,         // Requiere activacion por empresa_admin o admin
    ea_customer_sync: false,
  });
}
