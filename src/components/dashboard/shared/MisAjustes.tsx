import { useState } from "react";
import {
    IoCheckmarkCircleOutline,
    IoCloseOutline,
    IoCreateOutline,
    IoPersonOutline,
    IoPhonePortraitOutline,
} from "react-icons/io5";
import { toast } from "react-toastify";
import type { Miembro } from "../../../types/miembro";
import {
    actualizarPerfilMiembro,
    actualizarTelefonoMiembro,
    sendWhatsappOTP,
} from "../../../lib/appwrite";

// ── Types ─────────────────────────────────────────────────────────────────────

type FasetelPhone = "idle" | "ingresando" | "enviando_otp" | "verificando" | "confirmando";

// ── Component ─────────────────────────────────────────────────────────────────

export function MisAjustes({ miembro }: { miembro: Miembro }) {
    // Datos personales + contacto
    const [nombreCompleto, setNombreCompleto]         = useState(miembro.nombre_completo);
    const [correo, setCorreo]                         = useState(miembro.correo ?? "");
    const [documentoIdentidad, setDocumentoIdentidad] = useState(miembro.documento_identidad ?? "");
    const [guardando, setGuardando]                   = useState(false);

    // Cambio de teléfono (flujo OTP)
    const [telefono, setTelefono]       = useState(miembro.telefono);
    const [fasePhone, setFasePhone]     = useState<FasetelPhone>("idle");
    const [nuevoTelefono, setNuevoTel]  = useState("");
    const [otpUserId, setOtpUserId]     = useState("");
    const [otpCode, setOtpCode]         = useState("");

    // ── Guardar datos personales ─────────────────────────────────────────────

    async function handleGuardarDatos(e: React.FormEvent) {
        e.preventDefault();

        const nombreTrimmed = nombreCompleto.trim();
        if (!nombreTrimmed) {
            toast.error("El nombre completo es requerido.");
            return;
        }

        setGuardando(true);
        try {
            await actualizarPerfilMiembro(miembro.$id, {
                nombre_completo:    nombreTrimmed,
                correo:             correo.trim() || undefined,
                documento_identidad: documentoIdentidad.trim() || undefined,
            });
            toast.success("Datos actualizados correctamente.");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Error al guardar.");
        } finally {
            setGuardando(false);
        }
    }

    // ── Flujo OTP teléfono ───────────────────────────────────────────────────

    async function handleEnviarOtp() {
        const tel = nuevoTelefono.trim();
        if (!tel.startsWith("+") || tel.length < 8) {
            toast.error("Ingresa el teléfono en formato internacional (ej: +50588887777).");
            return;
        }
        if (tel === telefono) {
            toast.error("El nuevo teléfono es igual al actual.");
            return;
        }

        setFasePhone("enviando_otp");
        try {
            const userId = await sendWhatsappOTP(tel);
            setOtpUserId(userId);
            setOtpCode("");
            setFasePhone("verificando");
            toast.success("Código enviado por WhatsApp.");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Error al enviar el código.");
            setFasePhone("ingresando");
        }
    }

    async function handleConfirmarTelefono() {
        if (otpCode.trim().length !== 6) {
            toast.error("El código debe tener 6 dígitos.");
            return;
        }

        setFasePhone("confirmando");
        try {
            await actualizarTelefonoMiembro(
                miembro.$id,
                nuevoTelefono.trim(),
                otpUserId,
                otpCode.trim(),
            );
            setTelefono(nuevoTelefono.trim());
            setFasePhone("idle");
            setNuevoTel("");
            setOtpUserId("");
            setOtpCode("");
            toast.success("Teléfono actualizado correctamente.");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Código inválido o expirado.");
            setFasePhone("verificando");
        }
    }

    function handleCancelarPhone() {
        setFasePhone("idle");
        setNuevoTel("");
        setOtpUserId("");
        setOtpCode("");
    }

    const cargandoPhone = fasePhone === "enviando_otp" || fasePhone === "confirmando";

    return (
        <div className="space-y-6">
            {/* Header */}
            <header className="rounded-2xl border border-[#0066CC]/15 bg-linear-to-br from-white to-[#0066CC]/6 px-5 py-6 md:px-7">
                <p className="text-sm font-medium text-[#666666]">Tu membresía</p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#0066CC] md:text-3xl">
                    Ajustes de perfil
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[#666666]">
                    Actualiza tus datos personales y de contacto.
                </p>
            </header>

            {/* Datos personales + Contacto */}
            <form
                onSubmit={handleGuardarDatos}
                className="rounded-2xl border border-[#E5E5E5] bg-white p-6 shadow-sm space-y-6"
            >
                {/* Sección: Datos personales */}
                <SectionTitle icon={<IoPersonOutline size={16} />} label="Datos personales" />

                <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                        label="Nombre completo"
                        required
                        value={nombreCompleto}
                        onChange={setNombreCompleto}
                        placeholder="Ej: Juan Pérez"
                        autoComplete="name"
                    />
                    <Field
                        label="Documento de identidad"
                        value={documentoIdentidad}
                        onChange={setDocumentoIdentidad}
                        placeholder="Cédula o pasaporte"
                        autoComplete="off"
                    />
                </div>

                {/* Sección: Contacto */}
                <div className="border-t border-[#F0F0F0] pt-6 space-y-4">
                    <SectionTitle icon={<IoCreateOutline size={16} />} label="Contacto" />
                    <Field
                        label="Correo electrónico"
                        type="email"
                        value={correo}
                        onChange={setCorreo}
                        placeholder="ejemplo@correo.com"
                        autoComplete="email"
                    />
                </div>

                {/* Info campos de solo lectura */}
                <ReadOnlyRow label="Rol" value={ROL_LABEL[miembro.rol] ?? miembro.rol} />
                <ReadOnlyRow label="Parentesco" value={PARENTESCO_LABEL[miembro.parentesco] ?? miembro.parentesco} />
                <ReadOnlyRow
                    label="Fecha de nacimiento"
                    value={new Date(miembro.fecha_nacimiento).toLocaleDateString("es-NI", {
                        day: "numeric", month: "long", year: "numeric",
                    })}
                />

                {/* Guardar */}
                <div className="flex justify-end border-t border-[#F0F0F0] pt-4">
                    <button
                        type="submit"
                        disabled={guardando}
                        className="flex items-center gap-2 rounded-xl bg-[#0066CC] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0055AA] disabled:opacity-60"
                    >
                        {guardando ? (
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : (
                            <IoCheckmarkCircleOutline size={16} />
                        )}
                        {guardando ? "Guardando…" : "Guardar cambios"}
                    </button>
                </div>
            </form>

            {/* Cambiar teléfono */}
            <div className="rounded-2xl border border-[#E5E5E5] bg-white p-6 shadow-sm space-y-4">
                <SectionTitle icon={<IoPhonePortraitOutline size={16} />} label="Teléfono" />

                {/* Teléfono actual */}
                <div className="flex items-center justify-between gap-4 rounded-xl bg-[#F5F3EE] px-4 py-3">
                    <div>
                        <p className="text-xs text-[#999999]">Número actual</p>
                        <p className="font-semibold text-[#333333]">{telefono}</p>
                    </div>
                    {fasePhone === "idle" && (
                        <button
                            type="button"
                            onClick={() => setFasePhone("ingresando")}
                            className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-[#0066CC] transition-colors hover:bg-[#0066CC]/10"
                        >
                            Cambiar
                        </button>
                    )}
                </div>

                {/* Paso 1: ingresar nuevo número */}
                {(fasePhone === "ingresando" || fasePhone === "enviando_otp") && (
                    <div className="space-y-3">
                        <p className="text-sm text-[#666666]">
                            Ingresa el nuevo número. Te enviaremos un código de verificación por WhatsApp.
                        </p>
                        <div className="flex gap-2">
                            <input
                                type="tel"
                                value={nuevoTelefono}
                                onChange={(e) => setNuevoTel(e.target.value)}
                                placeholder="+50588887777"
                                autoComplete="tel"
                                className="flex-1 rounded-xl border border-[#E5E5E5] px-3 py-2.5 text-sm text-[#333333] placeholder:text-[#BBBBBB] focus:border-[#0066CC] focus:outline-none"
                            />
                            <button
                                type="button"
                                onClick={handleEnviarOtp}
                                disabled={cargandoPhone}
                                className="flex items-center gap-1.5 rounded-xl bg-[#0066CC] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0055AA] disabled:opacity-60"
                            >
                                {fasePhone === "enviando_otp" ? (
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                ) : "Enviar código"}
                            </button>
                            <button
                                type="button"
                                onClick={handleCancelarPhone}
                                className="flex h-10 w-10 items-center justify-center rounded-xl text-[#999999] transition-colors hover:bg-[#F5F3EE] hover:text-[#333333]"
                                aria-label="Cancelar"
                            >
                                <IoCloseOutline size={18} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Paso 2: ingresar OTP */}
                {(fasePhone === "verificando" || fasePhone === "confirmando") && (
                    <div className="space-y-3">
                        <p className="text-sm text-[#666666]">
                            Ingresa el código de 6 dígitos enviado al{" "}
                            <span className="font-semibold text-[#333333]">{nuevoTelefono}</span>.
                        </p>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                value={otpCode}
                                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                                placeholder="000000"
                                className="flex-1 rounded-xl border border-[#E5E5E5] px-3 py-2.5 text-center text-lg font-bold tracking-[0.4em] text-[#333333] placeholder:text-[#BBBBBB] focus:border-[#0066CC] focus:outline-none"
                            />
                            <button
                                type="button"
                                onClick={handleConfirmarTelefono}
                                disabled={cargandoPhone}
                                className="flex items-center gap-1.5 rounded-xl bg-[#0066CC] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0055AA] disabled:opacity-60"
                            >
                                {fasePhone === "confirmando" ? (
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                ) : (
                                    <><IoCheckmarkCircleOutline size={16} /> Verificar</>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={handleCancelarPhone}
                                className="flex h-10 w-10 items-center justify-center rounded-xl text-[#999999] transition-colors hover:bg-[#F5F3EE] hover:text-[#333333]"
                                aria-label="Cancelar"
                            >
                                <IoCloseOutline size={18} />
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={() => setFasePhone("ingresando")}
                            disabled={cargandoPhone}
                            className="text-xs text-[#0066CC] hover:underline disabled:opacity-50"
                        >
                            Cambiar número
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ROL_LABEL: Record<string, string> = {
    miembro:       "Miembro",
    empresa_admin: "Administrador de empresa",
    admin:         "Administrador",
};

const PARENTESCO_LABEL: Record<string, string> = {
    titular:  "Titular",
    conyuge:  "Cónyuge",
    hijo:     "Hijo/a",
    familiar: "Familiar",
};

function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
    return (
        <div className="flex items-center gap-2">
            <span className="text-[#0066CC]">{icon}</span>
            <h3 className="text-sm font-bold uppercase tracking-wide text-[#555555]">{label}</h3>
        </div>
    );
}

function Field({
    label,
    value,
    onChange,
    type = "text",
    placeholder,
    required,
    autoComplete,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    type?: string;
    placeholder?: string;
    required?: boolean;
    autoComplete?: string;
}) {
    return (
        <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-[#555555]">
                {label} {required && <span className="text-[#CC0000]">*</span>}
            </span>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                required={required}
                autoComplete={autoComplete}
                className="rounded-xl border border-[#E5E5E5] px-3 py-2.5 text-sm text-[#333333] placeholder:text-[#BBBBBB] focus:border-[#0066CC] focus:outline-none transition-colors"
            />
        </label>
    );
}

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-xl bg-[#FAFAFA] px-4 py-2.5">
            <span className="text-xs font-semibold text-[#999999]">{label}</span>
            <span className="text-sm font-medium text-[#555555]">{value}</span>
        </div>
    );
}
