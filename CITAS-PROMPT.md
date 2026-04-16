# Módulo de Citas — Implementación Web (React + Vite)

## Contexto del proyecto

Estás trabajando en la versión web (React 19 + Vite + TypeScript + Tailwind CSS v4) de Club SOS, una plataforma médica. Necesitas implementar el módulo de **Citas** para usuarios tipo `miembro`. El backend usa **Appwrite SDK v24** como base de datos/auth y **Easy! Appointments (EA)** como sistema de agendamiento externo.

Ya existe una implementación funcional en React Native (Expo). Esta es la referencia exacta de lógica, flujo y tipos.

Puedes hacer preguntas si necesitas aclarar partes del proceso.

---

## Stack técnico

- **React 19** + TypeScript + **Vite 8**
- **pnpm** como node package manager
- **Tailwind CSS v4** — sin `tailwind.config.js`, usa `@theme` en CSS directamente
- **Appwrite SDK v24** — base de datos, auth, storage, functions
- **react-router-dom v7** — SPA de una sola ruta `/dashboard`, sin URL params por sección
- **react-loading-skeleton** — para estados de carga
- **react-toastify** — notificaciones (posición `top-right`, `autoClose: 2800`)
- **react-icons/io5** (Ionicons) — para todos los íconos

---

## Librerías a instalar

```bash
pnpm install react-day-picker date-fns
```

- **`react-day-picker`** (v9): calendario con soporte `disabled`, locale español, fácil de estilizar con Tailwind
- **`libphonenumber-js`**: ya está instalado en el proyecto — úsalo directamente
- **No instalar Lucide ni heroicons** — el proyecto usa `react-icons/io5` (Ionicons)

---

## Patrón de navegación — SIN rutas por sección

La app usa una sola ruta `/dashboard` con estado interno de tipo `MiembroDashboardSection`. Las secciones se renderizan con condicionales. **No hay URLs tipo `/dashboard/citas`.**

```typescript
// src/types/dashboard.ts — ya existe, no modificar
export type MiembroDashboardSection =
  | "inicio" | "citas" | "beneficios" | "reportes" | "ajustes"
  | "admin_citas" | "admin_beneficios" | "admin_documentos";
```

El wizard de agendamiento (7 pasos) se implementa como un **sub-estado interno** dentro del componente `<MisCitas>`, no como rutas separadas:

```typescript
type WizardStep =
  | "lista"
  | "ubicacion" | "servicio" | "doctor"
  | "fecha" | "horario" | "paciente" | "confirmar";
```

---

## Estructura de roles

```typescript
type MiembroRol = "admin" | "empresa_admin" | "miembro";
```

- `miembro` → `DashboardMiembroShell` (nav plana, 5 secciones)
- `admin` → `DashboardAdminShell` (nav agrupada: "Mi perfil" + "Administrar")
- `empresa_admin` → `DashboardEmpresaAdminShell`

La sección `citas` existe en ambos shells. **Este módulo implementa solo la vista `miembro`** (sección `"citas"`). La sección `"admin_citas"` es un módulo separado.

---

## Modelo de datos: Miembro

```typescript
// src/types/miembro.ts — ya existe
interface Miembro {
  $id: string;
  auth_user_id: string;           // ID del usuario en Appwrite Auth
  empresa_id: string;             // FK → tabla empresas
  parentesco: string;             // "titular" | "conyuge" | "hijo" | "familiar"
  nombre_completo: string;
  fecha_nacimiento: string;       // ISO string
  sexo: string;
  documento_identidad: string | null;
  correo: string | null;
  telefono: string;               // formato E.164 (+505...)
  titular_miembro_id: string | null;
  rol: MiembroRol;
  activo: boolean;
}
```

---

## Tipos TypeScript para Citas

Crea `src/types/citas.ts`:

```typescript
export type EstadoSync = "pendiente" | "sincronizado" | "fallido";

export interface Cita {
  $id: string;
  miembro_id: string;
  empresa_id: string;
  fecha_hora_cita: string;         // ISO UTC: "2025-06-01T14:00:00.000+00:00"
  motivo_cita: string | null;
  ea_service_id: string;           // número como string: "3"
  ea_provider_id: string;          // número como string: "2"
  ea_customer_id: string;          // string vacío "" al crear; se llena cuando admin aprueba
  estado_sync: EstadoSync;         // enum en DB: "pendiente" | "sincronizado" | "fallido"
  ea_appointment_id: string | null;
  para_titular: boolean;
  paciente_nombre: string;
  paciente_telefono: string | null; // máx 20 chars en DB
  paciente_correo: string | null;   // validado como email en DB
  paciente_cedula: string | null;   // máx 50 chars en DB
  $createdAt: string;
  $updatedAt: string;
}

export interface Servicio {
  $id: string;
  ea_id: number;                   // ID en Easy! Appointments
  nombre: string;
  duracion: number;                // minutos (0–120)
  precio: number;
  moneda: string;                  // "C$" o "USD"
  descripcion: string | null;
  ubicacion: string | null;
  ea_category_id: number;          // 1 = Managua, 2 = León
}

export interface Doctor {
  $id: string;
  ea_id: number;
  nombres: string;
  apellidos: string;
  email: string;
  telefono: string;
  ea_servicios: string[];          // array de ea_id de servicios como strings
  activo: boolean;
}
```

---

## Appwrite: tablas y permisos

Las tres tablas relevantes existen en la DB `69808b54002bc0fc790f` (usar `import.meta.env.VITE_APPWRITE_DATABASE_ID`):

| Tabla | ID literal | Permisos |
|-------|-----------|---------|
| Citas | `"citas"` | `create/read/update/delete("users")` |
| Servicios | `"servicios"` | `read("users")` |
| Doctores | `"doctores"` | `read("users")` |

> `rowSecurity: false` en las tres tablas.

---

## Por qué SDK directo (sin función Appwrite)

A diferencia de `beneficios` y `documentos`, **las citas del miembro no requieren Appwrite Function**:

- `beneficios_crud_actions` existe porque solo admins pueden mutar beneficios → verificación de rol server-side obligatoria.
- `handler_documentos` / `upload_files_to_bucket` existen porque el bucket de Storage requiere API key del servidor para operar.

Para citas del miembro:
- La tabla `citas` ya tiene `create/delete("users")` — cualquier usuario autenticado puede operar directamente sin función.
- Al crear, solo se guarda `estado_sync: "pendiente"` — sin lógica server-side, sin API key secreta, **sin llamada a EA desde el cliente**.
- Una función añadiría latencia de cold start (~300–800 ms) sin ningún beneficio.
- Es el mismo patrón que usa la app React Native.

**La función Appwrite será necesaria para `admin_citas`** (cuando el admin apruebe y cree la cita en EA — eso requiere la API key del servidor). Ese módulo es independiente y no hace parte de esta implementación.

---

## Patrón de llamadas a Appwrite

Importa desde `src/lib/appwrite.ts` (ya existe):

```typescript
import { databases, ID } from "../../../lib/appwrite";
import { Query } from "appwrite";

const DB_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const TABLE_CITAS     = "citas";
const TABLE_SERVICIOS = "servicios";
const TABLE_DOCTORES  = "doctores";

// Leer citas del miembro
const res = await databases.listDocuments(DB_ID, TABLE_CITAS, [
  Query.equal("miembro_id", miembro.$id),
  Query.orderDesc("$createdAt"),
]);

// Crear cita (directo, sin función)
await databases.createDocument(DB_ID, TABLE_CITAS, ID.unique(), { ... });

// Eliminar cita (directo, sin función)
await databases.deleteDocument(DB_ID, TABLE_CITAS, citaId);
```

---

## Cliente Easy! Appointments

Crea `src/lib/eaApi.ts`:

```typescript
const EA_BASE_URL = import.meta.env.VITE_EA_API_URL;
const EA_API_KEY  = import.meta.env.VITE_EA_API_KEY;

const eaHeaders = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${EA_API_KEY}`,
};

/**
 * Retorna slots disponibles como ["09:00", "09:30", ...]
 * GET /availabilities?providerId=X&serviceId=Y&date=YYYY-MM-DD
 */
export async function getDisponibilidad(
  eaProviderId: number,
  eaServiceId: number,
  fecha: string,  // YYYY-MM-DD
): Promise<string[]> {
  const url = `${EA_BASE_URL}/availabilities?providerId=${eaProviderId}&serviceId=${eaServiceId}&date=${fecha}`;
  const res = await fetch(url, { headers: eaHeaders });
  if (!res.ok) throw new Error(`Error disponibilidad (HTTP ${res.status})`);
  const data: unknown = await res.json();
  return Array.isArray(data) ? (data as string[]) : [];
}
```

> **Nota:** `crearCitaEA` NO se usa desde el cliente miembro. La cita se guarda en Appwrite con `estado_sync: "pendiente"` y el admin la crea en EA server-side. No incluir la función `crearCitaEA` en `eaApi.ts` por ahora.

---

## Patrón de componentes de sección

El componente raíz recibe `miembro` como prop y vive en:
`src/components/dashboard/miembro/citas/index.tsx`

```typescript
interface MisCitasProps {
  miembro: Miembro;
}
```

Estado de carga con `react-loading-skeleton`:

```typescript
const [citas, setCitas] = useState<Cita[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetchCitas(miembro.$id)
    .then(setCitas)
    .catch(() => toast.error("Error al cargar citas"))
    .finally(() => setLoading(false));
}, [miembro.$id]);
```

---

## Design system

Usa estos valores exactos. Tailwind CSS v4 no usa `tailwind.config.js` — aplica colores con sintaxis `bg-[#0066CC]`.

| Token | Valor |
|-------|-------|
| Azul primario | `#0066CC` |
| Hover azul | `#0055AA` |
| Fondo suave | `#F5F3EE` |
| Texto principal | `#333333` |
| Texto secundario | `#666666` |
| Borde | `#E5E5E5` |

**Card estándar:**
```
rounded-2xl border border-[#E5E5E5] bg-white p-6 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]
```

**Botón primario:**
```
bg-[#0066CC] text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-[#0055AA] cursor-pointer
```

**Nav activa:**
```
bg-[#0066CC] text-white shadow-sm rounded-xl
```

**Colores de estado para CitaCard:**
- `sincronizado` → `#16A34A` (verde) → "Confirmada"
- `pendiente` → `#D97706` (amarillo) → "Pendiente de aprobación"
- `fallido` → `#9CA3AF` (gris) → "Rechazada"

---

## Flujo wizard (7 pasos, sin rutas)

El wizard vive dentro de `<MisCitas>` como estado interno. Estructura de estado:

```typescript
interface WizardState {
  categoriaId: number | null;       // 1=Managua, 2=León
  ubicacionNombre: string;
  eaServiceId: number | null;
  servicioNombre: string;
  servicioDuracion: number;
  eaProviderId: number | null;
  doctorNombre: string;
  fecha: string;                    // YYYY-MM-DD
  hora: string;                     // HH:mm
  paraTitular: boolean;
  pacienteNombre: string;
  pacienteTelefono: string;
  pacienteCorreo: string;
  pacienteCedula: string;
  citaIdToEdit?: string;
}

const WIZARD_INITIAL: WizardState = {
  categoriaId: null, ubicacionNombre: "",
  eaServiceId: null, servicioNombre: "", servicioDuracion: 0,
  eaProviderId: null, doctorNombre: "",
  fecha: "", hora: "",
  paraTitular: true,
  pacienteNombre: "", pacienteTelefono: "", pacienteCorreo: "", pacienteCedula: "",
};
```

Render condicional por paso:
```tsx
{step === "lista"     && <ListaCitas ... />}
{step === "ubicacion" && <PasoUbicacion ... />}
{step === "servicio"  && <PasoServicio ... />}
{step === "doctor"    && <PasoDoctor ... />}
{step === "fecha"     && <PasoFecha ... />}
{step === "horario"   && <PasoHorario ... />}
{step === "paciente"  && <PasoPaciente ... />}
{step === "confirmar" && <PasoConfirmar ... />}
```

Incluye una barra de progreso visible en pasos 1–7 (paso actual / 7).

---

## Paso 1 — Ubicación

Dos tarjetas clickeables. Al seleccionar → guarda `categoriaId` + `ubicacionNombre` en `wizard` → avanza a `"servicio"`.

```typescript
const UBICACIONES = [
  { id: 1, nombre: "Managua", descripcion: "Clínicas SOS en la capital" },
  { id: 2, nombre: "León",    descripcion: "Clínicas SOS en el occidente" },
];
```

---

## Paso 2 — Servicio

**Datos:** `databases.listDocuments(DB_ID, "servicios", [Query.equal("ea_category_id", categoriaId)])`.

**Tarjeta:** `nombre`, `descripcion`, duración formateada (`60` → `1h`, `30` → `30 min`), precio (`C$ 500`).

**Al seleccionar:** Guarda `eaServiceId`, `servicioNombre`, `servicioDuracion` → avanza a `"doctor"`.

---

## Paso 3 — Doctor

**Datos:** `databases.listDocuments(DB_ID, "doctores", [Query.contains("ea_servicios", String(eaServiceId)), Query.equal("activo", true)])`.

**Tarjeta:** Avatar con iniciales (`nombres[0] + apellidos[0]`), nombre completo (`nombres + " " + apellidos`), email.

**Al seleccionar:** Guarda `eaProviderId`, `doctorNombre` → avanza a `"fecha"`.

---

## Paso 4 — Fecha

**Componente:** Usa `react-day-picker` con estas restricciones:
- **Mínimo:** `new Date(Date.now() + 86400000)` (hoy + 24h)
- **Máximo:** hoy + 3 meses
- **Deshabilitar domingos:** `disabled={{ dayOfWeek: [0] }}`
- Locale español: `import { es } from "date-fns/locale"`

**Importante:** Construir fecha en formato `YYYY-MM-DD` local (no UTC) para evitar desfase de zona horaria:
```typescript
const toLocalDateString = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};
```

**Al continuar:** Guarda `fecha` → avanza a `"horario"`.

---

## Paso 5 — Horario

**Datos:** Llama `getDisponibilidad(eaProviderId, eaServiceId, fecha)` de `src/lib/eaApi.ts`.

**Filtro post-fetch:** Descartar slots dentro de las próximas 24h:
```typescript
const minTimestamp = Date.now() + 24 * 60 * 60 * 1000;
const validos = slots.filter(hora => {
  const [h, m] = hora.split(":").map(Number);
  const slotDate = new Date(
    `${fecha}T${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:00`
  );
  return slotDate.getTime() >= minTimestamp;
});
```

**UI:** Grid 2–3 columnas de chips. Cada chip muestra hora en 12h (`9:00 AM`). Chip seleccionado con `bg-[#0066CC] text-white`.

**Al continuar:** Guarda `hora` → avanza a `"paciente"`.

---

## Paso 6 — Paciente

**Dos modos (toggle tipo radio cards):**

1. **"Para mí"** (titular): Muestra datos del `miembro` prop como solo lectura (nombre, teléfono, correo).
2. **"Para otra persona"** (tercero): Formulario con:
   - Nombre completo (requerido)
   - Teléfono (requerido, toggle "No tiene teléfono"). **Máx 20 chars** en DB.
   - Cédula (opcional, máx 50 chars)
   - Correo electrónico (opcional, toggle "No tiene correo", validar regex)

**Input de teléfono — mismo patrón que `Login.tsx` y `StepPhoneOTP.tsx`:**

```typescript
import type { CountryCode } from "libphonenumber-js";
import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
} from "libphonenumber-js";

const regionNames = new Intl.DisplayNames(["es"], { type: "region" });
const COUNTRY_CODES = getCountries()
  .map((iso) => ({
    iso,
    code: `+${getCountryCallingCode(iso)}`,
    label: regionNames.of(iso) ?? iso,
  }))
  .sort((a, b) => a.label.localeCompare(b.label, "es"));

// Estado local
const [countryIso, setCountryIso] = useState<CountryCode>("NI");
const [phoneDigits, setPhoneDigits] = useState("");

const parsedPhone = parsePhoneNumberFromString(phoneDigits, countryIso);
const fullPhone = parsedPhone?.number ?? ""; // E.164: "+50588887777"
const isPhoneValid = Boolean(parsedPhone?.isValid());
```

UI: `<select>` de países + `<input type="tel">` que filtra solo dígitos:
```tsx
<div className="grid grid-cols-1 gap-2 sm:grid-cols-[170px_minmax(0,1fr)]">
  <select
    value={countryIso}
    onChange={(e) => setCountryIso(e.target.value as CountryCode)}
    className="rounded-xl border border-[#E5E5E5] bg-white px-3 py-3 text-sm text-[#333333] outline-none focus:border-[#0066CC]"
  >
    {COUNTRY_CODES.map((c) => (
      <option key={c.iso} value={c.iso}>{c.label} ({c.code})</option>
    ))}
  </select>
  <input
    type="tel"
    value={phoneDigits}
    onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, "").slice(0, 15))}
    placeholder="88887777"
    className="rounded-xl border border-[#E5E5E5] bg-white px-4 py-3 text-sm text-[#333333] outline-none focus:border-[#0066CC]"
  />
</div>
```

Al guardar en wizard: usa `fullPhone` (E.164) si `isPhoneValid`, si no el raw `phoneDigits`. Truncar a 20 chars antes de guardar en DB.

**Validación:**
```typescript
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// nombre: requerido siempre
// telefono: requerido si noTieneTelefono === false
// correo: si no vacío y noTieneCorreo === false → debe pasar EMAIL_REGEX
```

**Toggle teléfono:** Si "No tiene teléfono" → usar `miembro.telefono` al construir payload final.

**Al continuar:** Guarda datos de paciente en `wizard` → avanza a `"confirmar"`.

---

## Paso 7 — Confirmar

Resumen en tarjetas agrupadas:
- **Servicio:** especialidad + ubicación
- **Cita:** doctor + fecha legible + hora 12h
- **Paciente:** nombre, teléfono, correo, cédula (mostrar solo campos con valor) + badge "Tercero" si `paraTitular === false`

**Banner visible (amarillo):** La cita queda **pendiente de aprobación**. Un administrador la revisará y agendará en la clínica.

**Al confirmar — lógica (SDK directo, sin función):**
```typescript
const fechaHoraCita = `${wizard.fecha}T${wizard.hora}:00.000+00:00`; // UTC

// Si es edición: eliminar la cita anterior primero
if (wizard.citaIdToEdit) {
  await databases.deleteDocument(DB_ID, TABLE_CITAS, wizard.citaIdToEdit);
}

// Crear nueva cita directamente con SDK
await databases.createDocument(DB_ID, TABLE_CITAS, ID.unique(), {
  miembro_id: miembro.$id,
  empresa_id: miembro.empresa_id,
  fecha_hora_cita: fechaHoraCita,
  ea_service_id: String(wizard.eaServiceId),
  ea_provider_id: String(wizard.eaProviderId),
  ea_customer_id: "",              // required en DB; se llena cuando admin aprueba en EA
  para_titular: wizard.paraTitular,
  paciente_nombre: wizard.pacienteNombre,
  paciente_telefono: wizard.pacienteTelefono || null,
  paciente_correo: wizard.pacienteCorreo || null,
  paciente_cedula: wizard.pacienteCedula || null,
  estado_sync: "pendiente",
  ea_appointment_id: null,
  motivo_cita: null,
});

toast.success("Cita agendada correctamente");
setWizard(WIZARD_INITIAL);
setStep("lista");
```

> **Importante:** La cita NO se crea en Easy! Appointments desde el cliente. Se guarda en Appwrite con `estado_sync: "pendiente"`. Un `empresa_admin` la aprueba → ahí se crea en EA server-side. Eso es responsabilidad del módulo `admin_citas`.

---

## Vista principal — Lista de citas (`step === "lista"`)

### Fetch y enriquecimiento

```typescript
const DB_ID        = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const TABLE_CITAS     = "citas";
const TABLE_SERVICIOS = "servicios";
const TABLE_DOCTORES  = "doctores";

const citasRes = await databases.listDocuments(
  DB_ID, TABLE_CITAS,
  [Query.equal("miembro_id", miembro.$id), Query.orderDesc("$createdAt")]
);
const citasList = citasRes.documents as unknown as Cita[];

// Enriquecer con nombres de servicios y doctores (evitar N+1)
const serviceEaIds = [...new Set(citasList.map(c => parseInt(c.ea_service_id)))];
const providerEaIds = [...new Set(citasList.map(c => parseInt(c.ea_provider_id)))];

const [servicesRes, doctoresRes] = await Promise.all([
  databases.listDocuments(DB_ID, TABLE_SERVICIOS, [Query.equal("ea_id", serviceEaIds)]),
  databases.listDocuments(DB_ID, TABLE_DOCTORES,  [Query.equal("ea_id", providerEaIds)]),
]);

const serviceMap = new Map(
  (servicesRes.documents as unknown as Servicio[]).map(s => [s.ea_id, s])
);
const doctorMap = new Map(
  (doctoresRes.documents as unknown as Doctor[]).map(d => [d.ea_id, `${d.nombres} ${d.apellidos}`])
);
```

### Header

Título "Mis Citas" + botón "Agendar" (`IoAddOutline` de react-icons/io5) que ejecuta `setStep("ubicacion")`.

### Estado vacío

Si `citas.length === 0`: icono `IoCalendarOutline`, texto "Sin citas programadas", botón "Agendar tu primera cita".

### CitaCard

Cada tarjeta:
- **Badge de estado:**
  - `sincronizado` → verde `#16A34A` → "Confirmada" + `IoCheckmarkCircleOutline`
  - `pendiente` → amarillo `#D97706` → "Pendiente de aprobación" + `IoTimeOutline`
  - `fallido` → gris `#9CA3AF` → "Rechazada" + `IoCloseCircleOutline`
- Fecha: `Lunes, 02 de Junio a las 09:00 AM` (UTC, locale `es-NI`)
- Servicio, doctor, paciente
- **Acciones:**
  - Botón **Eliminar** (siempre) → confirm dialog → `databases.deleteDocument(DB_ID, TABLE_CITAS, cita.$id)` → reload
  - Botón **Editar** (solo si `estado_sync === "pendiente"`) → pre-carga wizard en paso `"fecha"` con `citaIdToEdit` + datos de la cita

### Editar cita

```typescript
// Al hacer click en Editar:
const servicio = serviceMap.get(parseInt(cita.ea_service_id));
setWizard({
  ...WIZARD_INITIAL,
  categoriaId: servicio?.ea_category_id ?? null,
  ubicacionNombre: servicio?.ea_category_id === 1 ? "Managua" : "León",
  eaServiceId: parseInt(cita.ea_service_id),
  servicioNombre: servicio?.nombre ?? "",
  servicioDuracion: servicio?.duracion ?? 0,
  eaProviderId: parseInt(cita.ea_provider_id),
  doctorNombre: doctorMap.get(parseInt(cita.ea_provider_id)) ?? "",
  citaIdToEdit: cita.$id,
});
setStep("fecha"); // salta directo al paso 4
```

---

## Formateo de fechas

```typescript
// Para CitaCard (siempre UTC)
const formatFechaCita = (isoString: string): string => {
  const date = new Date(isoString);
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const weekday = cap(new Intl.DateTimeFormat("es-NI", { weekday: "long",  timeZone: "UTC" }).format(date));
  const day     =     new Intl.DateTimeFormat("es-NI", { day: "2-digit",   timeZone: "UTC" }).format(date);
  const month   = cap(new Intl.DateTimeFormat("es-NI", { month: "long",    timeZone: "UTC" }).format(date));
  const time    =     new Intl.DateTimeFormat("es-NI", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "UTC" }).format(date);
  return `${weekday}, ${day} de ${month} a las ${time}`;
};

// Para pasos del wizard (fecha local, sin conversión UTC)
const formatFechaLocal = (yyyy_mm_dd: string): string =>
  new Intl.DateTimeFormat("es-NI", { weekday: "long", day: "numeric", month: "long" })
    .format(new Date(yyyy_mm_dd + "T12:00:00"));
```

> **Regla crítica:** Al guardar `fecha_hora_cita` → siempre `${fecha}T${hora}:00.000+00:00`. Al leer → siempre `timeZone: "UTC"`.

---

## Lo que YA existe (no recrear)

- `src/lib/appwrite.ts` — cliente Appwrite, exports: `databases`, `functions`, `storage`, `account`, `ID`
- `src/types/miembro.ts` — tipos `Miembro`, `MiembroRol`
- `src/types/dashboard.ts` — tipo `MiembroDashboardSection`
- `DashboardMiembroShell` y `DashboardAdminShell` — el nav ya incluye sección `"citas"`. Solo reemplaza el `<SectionPlaceholder>` actual.
- `DashboardInicio` — tiene una card de próxima cita con datos **mock**. No modificar, no conectar a datos reales en este módulo.

---

## Lo que debes crear

- `src/types/citas.ts`
- `src/lib/eaApi.ts` (solo `getDisponibilidad`)
- `src/components/dashboard/miembro/citas/index.tsx` — raíz con step + wizard state
- `src/components/dashboard/miembro/citas/CitaCard.tsx`
- `src/components/dashboard/miembro/citas/WizardProgressBar.tsx`
- `src/components/dashboard/miembro/citas/steps/PasoUbicacion.tsx`
- `src/components/dashboard/miembro/citas/steps/PasoServicio.tsx`
- `src/components/dashboard/miembro/citas/steps/PasoDoctor.tsx`
- `src/components/dashboard/miembro/citas/steps/PasoFecha.tsx`
- `src/components/dashboard/miembro/citas/steps/PasoHorario.tsx`
- `src/components/dashboard/miembro/citas/steps/PasoPaciente.tsx`
- `src/components/dashboard/miembro/citas/steps/PasoConfirmar.tsx`

---

## Variables de entorno (.env)

```
VITE_EA_API_URL=https://servicios.sosmedical.com.ni/index.php/api/v1
VITE_EA_API_KEY=<api_key>
VITE_APPWRITE_ENDPOINT=...
VITE_APPWRITE_PROJECT_ID=...
VITE_APPWRITE_DATABASE_ID=69808b54002bc0fc790f
```

> Las colecciones `citas`, `servicios` y `doctores` usan sus IDs como strings literales (igual que `documentos_medicos` en el código existente). Ya estan creadas todas las variables de entornos de las tablas de appwrite y las necesarias de easy! Appointments
