import { Client, Account, Databases, Functions, Storage, ID, Query, ExecutionMethod } from "appwrite";
import type { Beneficio, BeneficioFormData, DocumentoMedico, Miembro, MiembroRol } from "../types/miembro";
import type { Empresa, MiembroTitular, SignupFormData } from "../types/signup";
import { getOtpSmsGateStatus, recordOtpSmsSent } from "./otpRateLimit";

// Inicializa el cliente de Appwrite con el endpoint y el ID del proyecto
// definidos en las variables de entorno (.env)
const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

// Servicios disponibles de Appwrite
export const account = new Account(client);         // Autenticacion y sesiones
export const databases = new Databases(client);     // Base de datos
export const storage = new Storage(client);         // Almacenamiento de archivos
export const functions = new Functions(client);     // Funciones serverless

// IDs de base de datos y tablas
const DB_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const TABLE_EMPRESAS = import.meta.env.VITE_APPWRITE_TABLE_EMPRESAS_ID;
const TABLE_MIEMBROS = import.meta.env.VITE_APPWRITE_TABLE_MIEMBROS_ID;
const TABLE_BENEFICIOS = import.meta.env.VITE_APPWRITE_TABLE_BENEFICIOS_ID;

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

// ---------------------------------------------------------------------------
// BENEFICIOS
// ---------------------------------------------------------------------------

function documentoABeneficio(doc: Record<string, unknown>): Beneficio {
  return {
    $id: String(doc.$id),
    titulo: String(doc.titulo),
    descripcion: String(doc.descripcion),
    fecha_inicio: String(doc.fecha_inicio),
    fecha_fin: doc.fecha_fin == null ? null : String(doc.fecha_fin),
    estado_beneficio: String(doc.estado_beneficio),
    tipo_beneficio: doc.tipo_beneficio == null ? null : String(doc.tipo_beneficio),
    empresa_id: Array.isArray(doc.empresa_id) ? (doc.empresa_id as string[]) : [],
    beneficio_image_url: doc.beneficio_image_url == null ? null : String(doc.beneficio_image_url),
  };
}

/**
 * Retorna los beneficios disponibles para un miembro: globales (empresa_id vacío)
 * y los asignados a su empresa. Ordenados por fecha de creación descendente.
 *
 * @param empresaId - ID de la empresa del miembro
 * @param limit - Máximo de resultados (0 = sin límite). Por defecto 3.
 */
export async function getBeneficiosDisponibles(
  empresaId: string,
  limit = 3,
): Promise<Beneficio[]> {
  // Appwrite no soporta query "array vacío", traemos todos los activos
  // y filtramos en cliente: globales (empresa_id=[]) + empresa específica.
  const response = await databases.listDocuments(DB_ID, TABLE_BENEFICIOS, [
    Query.equal("estado_beneficio", "activa"),
    Query.orderDesc("$createdAt"),
    Query.limit(100),
  ]);

  const disponibles = response.documents.filter((doc) => {
    const ids = Array.isArray(doc.empresa_id) ? (doc.empresa_id as string[]) : [];
    return ids.length === 0 || ids.includes(empresaId);
  });

  const resultado = limit > 0 ? disponibles.slice(0, limit) : disponibles;
  return resultado.map((doc) => documentoABeneficio(doc as unknown as Record<string, unknown>));
}

/**
 * Retorna todos los beneficios sin filtrar (para la vista de administración).
 */
export async function getBeneficiosAdmin(): Promise<Beneficio[]> {
  const response = await databases.listDocuments(DB_ID, TABLE_BENEFICIOS, [
    Query.orderDesc("$createdAt"),
    Query.limit(100),
  ]);
  return response.documents.map((doc) =>
    documentoABeneficio(doc as unknown as Record<string, unknown>),
  );
}

/**
 * Retorna todas las empresas ordenadas por nombre (para el formulario de beneficios).
 */
export async function getTodasLasEmpresas(): Promise<Empresa[]> {
  const response = await databases.listDocuments(DB_ID, TABLE_EMPRESAS, [
    Query.orderAsc("nombre_empresa"),
    Query.limit(100),
  ]);
  return response.documents.map((doc) => ({
    $id: doc.$id,
    nombre_empresa: String(doc.nombre_empresa),
    codigo_empresa: String(doc.codigo_empresa),
    estado: doc.estado as "activo" | "inactivo",
    notas: doc.notas ? String(doc.notas) : undefined,
  }));
}

/**
 * Convierte un File a base64 (sin el prefijo data URL) para enviarlo
 * a la Appwrite Function que maneja el upload con la API key del servidor.
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Sube una imagen al bucket de beneficios a través de la Appwrite Function,
 * que verifica el rol admin antes de ejecutar el upload con la API key.
 */
export async function subirImagenBeneficio(file: File): Promise<string> {
  const base64 = await fileToBase64(file);

  const execution = await functions.createExecution(
    FN_BENEFICIOS_CRUD,
    JSON.stringify({
      action: "upload_image",
      data: { base64, mimeType: file.type, fileName: file.name },
    }),
    false,
    "/",
    ExecutionMethod.POST,
  );

  if (execution.responseStatusCode >= 400) {
    const body = JSON.parse(execution.responseBody || "{}");
    throw new Error(body.message ?? "Error al subir la imagen.");
  }

  const body = JSON.parse(execution.responseBody);
  return body.url as string;
}

const FN_BENEFICIOS_CRUD = import.meta.env.VITE_APPWRITE_BENEFICIOS_CRUD_FN;
const TABLE_DOCUMENTOS = "documentos_medicos";
const FN_HANDLER_DOCUMENTOS = "69ac29ed001582625f9e";
const FN_SUBIR_DOCUMENTO = import.meta.env.VITE_APPWRITE_SUBIR_DOCUMENTO_FN;

/**
 * Llama a la Appwrite Function `beneficios_crud_actions` con la acción indicada.
 * La función verifica server-side que el usuario tenga rol = "admin" antes de ejecutar.
 */
async function ejecutarBeneficiosFn(
  action: "create" | "update" | "delete",
  payload: { id?: string; data?: Partial<BeneficioFormData> },
): Promise<void> {
  const execution = await functions.createExecution(
    FN_BENEFICIOS_CRUD,
    JSON.stringify({ action, ...payload }),
    false,                // async = false (espera respuesta)
    "/",
    ExecutionMethod.POST,
  );

  if (execution.responseStatusCode >= 400) {
    const body = JSON.parse(execution.responseBody || "{}");
    throw new Error(body.message ?? "Error en la función de beneficios.");
  }
}

export async function crearBeneficio(data: BeneficioFormData): Promise<void> {
  await ejecutarBeneficiosFn("create", { data });
}

export async function editarBeneficio(id: string, data: BeneficioFormData): Promise<void> {
  await ejecutarBeneficiosFn("update", { id, data });
}

export async function eliminarBeneficio(id: string): Promise<void> {
  await ejecutarBeneficiosFn("delete", { id });
}

// ---------------------------------------------------------------------------
// DOCUMENTOS
// ---------------------------------------------------------------------------

function documentoADocumentoMedico(doc: Record<string, unknown>): DocumentoMedico {
  return {
    $id: String(doc.$id),
    nombre_documento: String(doc.nombre_documento),
    tipo_documento: String(doc.tipo_documento),
    tipo_archivo: String(doc.tipo_archivo),
    fecha_documento: String(doc.fecha_documento),
    estado_archivo: String(doc.estado_archivo),
    miembro_id: String(doc.miembro_id),
    storage_archivo_id: String(doc.storage_archivo_id),
    subido_por: doc.subido_por != null ? String(doc.subido_por) : undefined,
  };
}

/**
 * Retorna todos los documentos no eliminados (para la vista de administración).
 * Ordenados por fecha de creación descendente.
 */
export async function getDocumentosAdmin(): Promise<DocumentoMedico[]> {
  const response = await databases.listDocuments(DB_ID, TABLE_DOCUMENTOS, [
    Query.notEqual("estado_archivo", "eliminado"),
    Query.orderDesc("$createdAt"),
    Query.limit(200),
  ]);
  return response.documents.map((doc) =>
    documentoADocumentoMedico(doc as unknown as Record<string, unknown>),
  );
}

/**
 * Dado un conjunto de miembro_ids, retorna un Map de id → nombre_completo.
 * Usado para mostrar el nombre del miembro en la tabla de documentos sin N+1.
 */
export async function getMiembrosPorIds(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const response = await databases.listDocuments(DB_ID, TABLE_MIEMBROS, [
    Query.equal("$id", ids),
    Query.limit(ids.length),
  ]);
  const map = new Map<string, string>();
  for (const doc of response.documents) {
    map.set(doc.$id, String(doc.nombre_completo));
  }
  return map;
}

/**
 * Actualiza los metadatos de un documento médico via la función server-side.
 */
export async function editarDocumentoMetadatos(
  id: string,
  data: { nombre_documento: string; tipo_documento: string; fecha_documento: string },
): Promise<void> {
  const execution = await functions.createExecution(
    FN_SUBIR_DOCUMENTO,
    JSON.stringify({ action: "editar_metadatos", id, ...data }),
    false,
    "/",
    ExecutionMethod.POST,
  );
  if (execution.responseStatusCode >= 400) {
    const body = JSON.parse(execution.responseBody || "{}");
    throw new Error(body.error ?? "Error al editar metadatos.");
  }
}

/**
 * Soft-delete de un documento médico (estado_archivo → "eliminado") via la función server-side.
 */
export async function eliminarDocumento(id: string): Promise<void> {
  const execution = await functions.createExecution(
    FN_SUBIR_DOCUMENTO,
    JSON.stringify({ action: "eliminar", id }),
    false,
    "/",
    ExecutionMethod.POST,
  );
  if (execution.responseStatusCode >= 400) {
    const body = JSON.parse(execution.responseBody || "{}");
    throw new Error(body.error ?? "Error al eliminar el documento.");
  }
}

/**
 * Retorna los últimos documentos activos del miembro, ordenados por fecha
 * de creación descendente.
 *
 * @param miembroId - $id del documento en la tabla miembros
 * @param limit - Máximo de resultados. Por defecto 3.
 */
export async function getDocumentosRecientes(
  miembroId: string,
  limit = 3,
): Promise<DocumentoMedico[]> {
  const response = await databases.listDocuments(DB_ID, TABLE_DOCUMENTOS, [
    Query.equal("miembro_id", miembroId),
    Query.equal("estado_archivo", "activo"),
    Query.orderDesc("$createdAt"),
    Query.limit(limit),
  ]);

  return response.documents.map((doc) =>
    documentoADocumentoMedico(doc as unknown as Record<string, unknown>),
  );
}

/**
 * Descarga un documento via la función `handler_documentos`.
 * La función verifica server-side que el archivo pertenece al usuario autenticado,
 * luego retorna el contenido como base64.
 *
 * @param fileId - storage_archivo_id del documento
 * @param fileName - nombre para el archivo descargado (incluir extensión)
 */
export async function descargarDocumento(
  fileId: string,
  fileName: string,
): Promise<void> {
  const execution = await functions.createExecution(
    FN_HANDLER_DOCUMENTOS,
    JSON.stringify({ fileId }),
    false,
    "/",
    ExecutionMethod.POST,
  );

  if (execution.responseStatusCode >= 400) {
    const body = JSON.parse(execution.responseBody || "{}");
    throw new Error(body.error ?? "Error al descargar el documento.");
  }

  const { base64 } = JSON.parse(execution.responseBody) as { base64: string };

  const bytes = atob(base64);
  const array = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    array[i] = bytes.charCodeAt(i);
  }
  const blob = new Blob([array], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// ADMIN — BÚSQUEDA DE MIEMBROS
// ---------------------------------------------------------------------------

export type CampoBusqueda = "nombre" | "cedula" | "telefono";

/**
 * Busca miembros por nombre (prefijo), cédula (exacto) o teléfono (prefijo).
 * Solo debe llamarse desde contextos admin.
 *
 * @param termino - Texto a buscar
 * @param campo   - Campo sobre el que se busca
 */
export async function buscarMiembros(
  termino: string,
  campo: CampoBusqueda,
): Promise<Miembro[]> {
  const trimmed = termino.trim();
  if (!trimmed) return [];

  let queries: string[];

  if (campo === "nombre") {
    queries = [Query.startsWith("nombre_completo", trimmed), Query.limit(10)];
  } else if (campo === "cedula") {
    queries = [Query.startsWith("documento_identidad", trimmed), Query.limit(10)];
  } else {
    queries = [Query.startsWith("telefono", trimmed), Query.limit(10)];
  }

  const response = await databases.listDocuments(DB_ID, TABLE_MIEMBROS, queries);
  return response.documents.map((doc) =>
    documentoAMiembro(doc as unknown as Record<string, unknown>),
  );
}

// ---------------------------------------------------------------------------
// ADMIN — SUBIR DOCUMENTO MÉDICO
// ---------------------------------------------------------------------------

export interface SubirDocumentoParams {
  file: File;
  miembro_id: string;
  nombre_documento: string;
  tipo_documento: string;
  fecha_documento: string;
}

/**
 * Sube un documento médico al bucket y registra sus metadatos via la función
 * `handler_subir_documento`, que verifica rol admin server-side.
 */
export async function subirDocumentoMedico(
  params: SubirDocumentoParams,
): Promise<void> {
  const base64 = await fileToBase64(params.file);

  const execution = await functions.createExecution(
    FN_SUBIR_DOCUMENTO,
    JSON.stringify({
      base64,
      mimeType: params.file.type,
      fileName: params.file.name,
      miembro_id: params.miembro_id,
      nombre_documento: params.nombre_documento,
      tipo_documento: params.tipo_documento,
      fecha_documento: params.fecha_documento,
    }),
    false,
    "/",
    ExecutionMethod.POST,
  );

  if (execution.responseStatusCode >= 400) {
    const body = JSON.parse(execution.responseBody || "{}");
    throw new Error(body.error ?? "Error al subir el documento.");
  }
}
