const sdk = require("node-appwrite");

/**
 * handler_subir_documento
 *
 * Sube un archivo al bucket de documentos médicos y registra sus metadatos
 * en la colección documentos_medicos. Verifica server-side que el caller
 * tenga rol = "admin".
 *
 * Body esperado (JSON):
 * {
 *   base64:           string,   // contenido del archivo en base64
 *   mimeType:         string,   // ej: "application/pdf", "image/jpeg"
 *   fileName:         string,   // nombre original del archivo
 *   miembro_id:       string,   // $id del documento en la tabla miembros
 *   nombre_documento: string,   // nombre descriptivo
 *   tipo_documento:   string,   // enum: laboratorio|radiologia|consulta_medica|especialidades|otro
 *   fecha_documento:  string,   // ISO 8601
 * }
 *
 * Respuesta exitosa: { success: true, fileId: string }
 */
module.exports = async ({ req, res, log }) => {
  log("=== handler_subir_documento iniciado ===");

  // ── Auth ────────────────────────────────────────────────────────────────
  const userId = req.headers["x-appwrite-user-id"];
  log("userId: " + (userId ?? "NO PRESENTE"));
  if (!userId) return res.json({ error: "No autenticado" }, 401);

  // ── Parse body ──────────────────────────────────────────────────────────
  let body;
  try {
    body = JSON.parse(req.body ?? "{}");
  } catch (e) {
    log("ERROR parseando body: " + e.message);
    return res.json({ error: "Body inválido" }, 400);
  }

  const {
    base64,
    mimeType,
    fileName,
    miembro_id,
    nombre_documento,
    tipo_documento,
    fecha_documento,
  } = body;

  const camposRequeridos = { base64, mimeType, fileName, miembro_id, nombre_documento, tipo_documento, fecha_documento };
  const faltantes = Object.entries(camposRequeridos)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (faltantes.length > 0) {
    log("Campos faltantes: " + faltantes.join(", "));
    return res.json({ error: `Campos requeridos: ${faltantes.join(", ")}` }, 400);
  }

  // ── Env vars ────────────────────────────────────────────────────────────
  const endpoint    = process.env.APPWRITE_ENDPOINT;
  const projectId   = process.env.APPWRITE_PROJECT_ID;
  const apiKey      = process.env.APPWRITE_API_KEY;
  const databaseId  = process.env.APPWRITE_DATABASE_ID;
  const miembrosCol = process.env.APPWRITE_MIEMBROS_COLLECTION_ID;
  const docsCol     = process.env.APPWRITE_DOCUMENTOS_COLLECTION_ID;
  const bucketId    = process.env.APPWRITE_BUCKET_ID;

  // ── Helpers fetch con API key ───────────────────────────────────────────
  const authHeaders = {
    "x-appwrite-project": projectId,
    "x-appwrite-key": apiKey,
  };

  const appwriteJson = async (path, options = {}) => {
    const r = await fetch(`${endpoint}${path}`, {
      ...options,
      headers: { ...authHeaders, "Content-Type": "application/json", ...(options.headers ?? {}) },
    });
    const data = await r.json();
    log(`${options.method ?? "GET"} ${path} → ${r.status}`);
    if (!r.ok) throw new Error(data.message ?? `HTTP ${r.status}`);
    return data;
  };

  try {
    // ── Verificar que el caller existe y es admin ────────────────────────
    log("Verificando rol del caller...");
    const q = encodeURIComponent(JSON.stringify({ method: "equal", attribute: "auth_user_id", values: [userId] }));
    const mbrRes = await appwriteJson(
      `/databases/${databaseId}/collections/${miembrosCol}/documents?queries[]=${q}&queries[]=${encodeURIComponent(JSON.stringify({ method: "limit", values: [1] }))}`,
    );

    if (mbrRes.total === 0) {
      log("Caller no encontrado en miembros");
      return res.json({ error: "Miembro no encontrado" }, 403);
    }

    const caller = mbrRes.documents[0];
    log("Caller rol: " + caller.rol);

    if (caller.rol !== "admin") {
      log("PERMISO DENEGADO — rol: " + caller.rol);
      return res.json({ error: "Sin permiso: se requiere rol admin" }, 403);
    }

    const subido_por = caller.nombre_completo;

    // ── Subir archivo al bucket via multipart ────────────────────────────
    log("Subiendo archivo al bucket...");
    const buffer   = Buffer.from(base64, "base64");
    const boundary = `----AppwriteBoundary${Date.now()}`;

    const bodyBuffer = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="fileId"\r\n\r\nunique()\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: ${mimeType}\r\n\r\n`),
      buffer,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    const uploadRes = await fetch(
      `${endpoint}/storage/buckets/${bucketId}/files`,
      {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": `multipart/form-data; boundary=${boundary}` },
        body: bodyBuffer,
      },
    );
    const uploaded = await uploadRes.json();
    log(`POST /storage/buckets/${bucketId}/files → ${uploadRes.status}`);
    if (!uploadRes.ok) throw new Error(uploaded.message ?? `HTTP ${uploadRes.status}`);
    log("Archivo subido: " + uploaded.$id);

    // ── Determinar tipo_archivo desde mimeType ───────────────────────────
    const tipo_archivo = mimeType.startsWith("image/") ? "imagen" : "pdf";

    // ── Crear documento en documentos_medicos ────────────────────────────
    log("Creando documento en DB...");
    await appwriteJson(`/databases/${databaseId}/collections/${docsCol}/documents`, {
      method: "POST",
      body: JSON.stringify({
        documentId: "unique()",
        data: {
          nombre_documento,
          tipo_documento,
          tipo_archivo,
          subido_por,
          fecha_documento,
          estado_archivo: "activo",
          miembro_id,
          storage_archivo_id: uploaded.$id,
        },
      }),
    });

    log("Documento creado exitosamente");
    return res.json({ success: true, fileId: uploaded.$id });

  } catch (err) {
    log("ERROR: " + err.message);
    return res.json({ error: err.message }, 500);
  }
};
