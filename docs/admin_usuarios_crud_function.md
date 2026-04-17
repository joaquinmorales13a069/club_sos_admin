# Función Appwrite: `admin_usuarios_crud`

## Resumen

Función serverless que gestiona mutaciones sobre la tabla `miembros`. Sirve a tres tipos de callers con restricciones distintas:

| Acción          | admin | empresa_admin | miembro titular |
|-----------------|-------|---------------|-----------------|
| `toggle_activo` | ✅ cualquier usuario | ✅ solo su empresa | ✅ solo sus familiares directos |
| `editar_datos`  | ✅ cualquier usuario | ✅ solo su empresa | ❌ denegado |
| `cambiar_rol`   | ✅ solo a `miembro` o `empresa_admin` | ❌ denegado | ❌ denegado |

---

## Configuración en Appwrite Console

1. Ir a **Functions** → **Create Function**
2. Configurar:
   - **Name:** `admin_usuarios_crud`
   - **Runtime:** Node.js 21.0
   - **Entrypoint:** `src/main.js`
   - **Build command:** *(dejar vacío)*
3. En la pestaña **Settings** → **Execute access:** `Users` (cualquier usuario autenticado puede llamarla — la función valida el rol internamente)
4. Agregar las **Variables de entorno** listadas abajo
5. Desplegar el código (subir archivo ZIP o usar Appwrite CLI)
6. Copiar el **Function ID** y agregarlo a tu `.env` del frontend:
   ```
   VITE_APPWRITE_ADMIN_USUARIOS_FN=<function_id>
   ```

---

## Variables de entorno

Definirlas en **Function Settings → Variables**:

| Variable                          | Valor                              | Dónde obtenerlo                                    |
|-----------------------------------|------------------------------------|----------------------------------------------------|
| `APPWRITE_API_KEY`                | `<api_key_con_permisos_db>`        | Console → Overview → API Keys → Create Key (scope: `databases.write`) |
| `DB_ID`                           | `69808b54002bc0fc790f`             | Console → Databases → tu base de datos             |
| `TABLE_MIEMBROS`                  | `miembros`                         | Console → Databases → Collections → miembros → ID |

> `APPWRITE_FUNCTION_API_ENDPOINT` y `APPWRITE_FUNCTION_PROJECT_ID` son inyectadas automáticamente por Appwrite — no necesitas definirlas.

---

## Estructura de archivos

```
admin_usuarios_crud/
├── src/
│   └── main.js
└── package.json
```

---

## `package.json`

```json
{
  "name": "admin-usuarios-crud",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "node-appwrite": "^16.0.0"
  }
}
```

---

## `src/main.js` (código completo)

```js
import { Client, Databases, Query } from "node-appwrite";

export default async ({ req, res }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);
  const DB_ID = process.env.DB_ID;
  const TABLE_MIEMBROS = process.env.TABLE_MIEMBROS;

  // ── Autenticación ────────────────────────────────────────────────────────
  const callerUserId = req.headers["x-appwrite-user-id"];
  if (!callerUserId) {
    return res.json({ error: "No autenticado" }, 401);
  }

  // Resolver rol del caller
  const callerDocs = await databases.listDocuments(DB_ID, TABLE_MIEMBROS, [
    Query.equal("auth_user_id", callerUserId),
    Query.limit(1),
  ]);
  if (!callerDocs.documents.length) {
    return res.json({ error: "Acceso denegado" }, 403);
  }
  const caller = callerDocs.documents[0];
  const callerRol = caller.rol;

  // Titular: miembro con parentesco = "titular" — solo toggle_activo en sus familiares
  const esTitular = callerRol === "miembro" && caller.parentesco === "titular";

  if (callerRol !== "admin" && callerRol !== "empresa_admin" && !esTitular) {
    return res.json({ error: "Acceso denegado" }, 403);
  }

  // ── Payload ──────────────────────────────────────────────────────────────
  let body;
  try {
    body = JSON.parse(req.body);
  } catch {
    return res.json({ error: "Payload inválido" }, 400);
  }

  const { action, miembro_id, activo, rol, datos } = body;

  if (!miembro_id) {
    return res.json({ error: "miembro_id requerido" }, 400);
  }

  // ── Obtener target para validaciones ─────────────────────────────────────
  let target;
  try {
    target = await databases.getDocument(DB_ID, TABLE_MIEMBROS, miembro_id);
  } catch {
    return res.json({ error: "Miembro no encontrado" }, 404);
  }

  // empresa_admin: solo puede operar sobre usuarios de su propia empresa
  if (callerRol === "empresa_admin" && target.empresa_id !== caller.empresa_id) {
    return res.json({ error: "Acceso denegado" }, 403);
  }

  // titular: solo puede operar sobre sus familiares directos
  if (esTitular && target.titular_miembro_id !== caller.$id) {
    return res.json({ error: "Acceso denegado" }, 403);
  }

  // ── Acciones ─────────────────────────────────────────────────────────────
  if (action === "toggle_activo") {
    // titular solo puede hacer toggle_activo
    if (typeof activo !== "boolean") {
      return res.json({ error: "Campo 'activo' requerido (boolean)" }, 400);
    }
    await databases.updateDocument(DB_ID, TABLE_MIEMBROS, miembro_id, { activo });
    return res.json({ ok: true });
  }

  // Las acciones siguientes requieren al menos empresa_admin o admin
  if (esTitular) {
    return res.json({ error: "Acción no permitida" }, 403);
  }

  if (action === "editar_datos") {
    const CAMPOS_PERMITIDOS = ["nombre_completo", "telefono", "correo", "documento_identidad"];
    const update = Object.fromEntries(
      Object.entries(datos ?? {}).filter(([k]) => CAMPOS_PERMITIDOS.includes(k)),
    );
    if (Object.keys(update).length === 0) {
      return res.json({ error: "No hay campos válidos para actualizar" }, 400);
    }
    await databases.updateDocument(DB_ID, TABLE_MIEMBROS, miembro_id, update);
    return res.json({ ok: true });
  }

  if (action === "cambiar_rol") {
    // Solo admin puede cambiar roles
    if (callerRol !== "admin") {
      return res.json({ error: "Acceso denegado" }, 403);
    }
    // No se puede escalar a admin desde esta función
    if (rol !== "empresa_admin" && rol !== "miembro") {
      return res.json({ error: "Rol no permitido. Solo 'miembro' o 'empresa_admin'." }, 400);
    }
    await databases.updateDocument(DB_ID, TABLE_MIEMBROS, miembro_id, { rol });
    return res.json({ ok: true });
  }

  return res.json({ error: "Acción desconocida" }, 400);
};
```

---

## Prueba en Appwrite Console

Ir a la función → pestaña **Executions** → **Execute**. Usar los siguientes payloads de ejemplo:

### toggle_activo
```json
{
  "action": "toggle_activo",
  "miembro_id": "<$id del miembro>",
  "activo": false
}
```

### editar_datos
```json
{
  "action": "editar_datos",
  "miembro_id": "<$id del miembro>",
  "datos": {
    "nombre_completo": "Juan Pérez Actualizado",
    "telefono": "+50588990011"
  }
}
```

### cambiar_rol (solo admin)
```json
{
  "action": "cambiar_rol",
  "miembro_id": "<$id del miembro>",
  "rol": "empresa_admin"
}
```

### toggle_activo desde titular (miembro familiar)
```json
{
  "action": "toggle_activo",
  "miembro_id": "<$id del familiar>",
  "activo": true
}
```
> El caller debe ser `miembro` con `parentesco = "titular"` y el target debe tener `titular_miembro_id = caller.$id`.

---

## Notas de seguridad

- La función **nunca permite escalar a `admin`**. Ese rol solo se puede asignar manualmente desde la consola de Appwrite.
- `empresa_admin` no puede modificar usuarios fuera de su empresa, ni cambiar roles.
- Los campos editables están en una lista blanca (`CAMPOS_PERMITIDOS`) — campos como `auth_user_id` o `empresa_id` no pueden modificarse desde esta función.
