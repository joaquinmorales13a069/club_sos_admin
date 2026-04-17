import { useState } from "react";
import { IoPersonOutline, IoPeopleOutline } from "react-icons/io5";
import type { CountryCode } from "libphonenumber-js";
import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
} from "libphonenumber-js";
import type { Miembro } from "../../../../../types/miembro";
import type { WizardState } from "../../../../../types/citas";

const regionNames = new Intl.DisplayNames(["es"], { type: "region" });
const COUNTRY_CODES = getCountries()
  .map((iso) => ({
    iso,
    code: `+${getCountryCallingCode(iso)}`,
    label: regionNames.of(iso) ?? iso,
  }))
  .sort((a, b) => a.label.localeCompare(b.label, "es"));

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface PasoPacienteProps {
  miembro: Miembro;
  onSelect: (patch: Partial<WizardState>) => void;
  onBack: () => void;
}

export function PasoPaciente({ miembro, onSelect, onBack }: PasoPacienteProps) {
  const [paraTitular, setParaTitular] = useState(true);

  const [nombre, setNombre] = useState("");
  const [countryIso, setCountryIso] = useState<CountryCode>("NI");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [noTieneTelefono, setNoTieneTelefono] = useState(false);
  const [correo, setCorreo] = useState("");
  const [noTieneCorreo, setNoTieneCorreo] = useState(false);
  const [cedula, setCedula] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const parsedPhone = parsePhoneNumberFromString(phoneDigits, countryIso);
  const fullPhone = parsedPhone?.number ?? "";
  const isPhoneValid = Boolean(parsedPhone?.isValid());

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!paraTitular) {
      if (!nombre.trim()) e.nombre = "El nombre es requerido";
      if (!noTieneTelefono && !phoneDigits.trim())
        e.telefono = "El teléfono es requerido";
      if (!noTieneTelefono && phoneDigits.trim() && !isPhoneValid)
        e.telefono = "Teléfono inválido";
      if (!noTieneCorreo && correo.trim() && !EMAIL_REGEX.test(correo))
        e.correo = "Correo inválido";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleContinue() {
    if (!validate()) return;

    if (paraTitular) {
      onSelect({
        paraTitular: true,
        pacienteNombre: miembro.nombre_completo,
        pacienteTelefono: miembro.telefono,
        pacienteCorreo: miembro.correo ?? "",
        pacienteCedula: miembro.documento_identidad ?? "",
      });
    } else {
      const tel = noTieneTelefono
        ? miembro.telefono
        : (isPhoneValid ? fullPhone : phoneDigits).slice(0, 20);
      onSelect({
        paraTitular: false,
        pacienteNombre: nombre.trim(),
        pacienteTelefono: tel,
        pacienteCorreo: noTieneCorreo ? "" : correo.trim(),
        pacienteCedula: cedula.trim().slice(0, 50),
      });
    }
  }

  return (
    <div>
      <h3 className="text-lg font-bold text-[#333333]">
        ¿Para quién es la cita?
      </h3>
      <p className="mt-1 text-sm text-[#666666]">
        Indica los datos del paciente
      </p>

      {/* Toggle: Para mí / Para otra persona */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setParaTitular(true)}
          className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-all cursor-pointer ${
            paraTitular
              ? "border-[#0066CC] bg-[#0066CC] text-white shadow-sm"
              : "border-[#E5E5E5] bg-white text-[#333333] hover:border-[#0066CC]/40"
          }`}
        >
          <IoPersonOutline size={18} />
          Para mí
        </button>
        <button
          type="button"
          onClick={() => setParaTitular(false)}
          className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-all cursor-pointer ${
            !paraTitular
              ? "border-[#0066CC] bg-[#0066CC] text-white shadow-sm"
              : "border-[#E5E5E5] bg-white text-[#333333] hover:border-[#0066CC]/40"
          }`}
        >
          <IoPeopleOutline size={18} />
          Otra persona
        </button>
      </div>

      {paraTitular ? (
        <div className="mt-6 space-y-3 rounded-2xl border border-[#E5E5E5] bg-[#F5F3EE]/50 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#666666]">
            Datos del paciente
          </p>
          <p className="text-sm font-semibold text-[#333333]">
            {miembro.nombre_completo}
          </p>
          <p className="text-sm text-[#666666]">{miembro.telefono}</p>
          {miembro.correo && (
            <p className="text-sm text-[#666666]">{miembro.correo}</p>
          )}
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {/* Nombre */}
          <div>
            <label className="mb-1 block text-sm font-medium text-[#333333]">
              Nombre completo *
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre del paciente"
              className="w-full rounded-xl border border-[#E5E5E5] bg-white px-4 py-3 text-sm text-[#333333] outline-none focus:border-[#0066CC]"
            />
            {errors.nombre && (
              <p className="mt-1 text-xs text-red-500">{errors.nombre}</p>
            )}
          </div>

          {/* Teléfono */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-sm font-medium text-[#333333]">
                Teléfono {!noTieneTelefono && "*"}
              </label>
              <label className="flex items-center gap-1.5 text-xs text-[#666666] cursor-pointer">
                <input
                  type="checkbox"
                  checked={noTieneTelefono}
                  onChange={(e) => setNoTieneTelefono(e.target.checked)}
                  className="accent-[#0066CC]"
                />
                No tiene teléfono
              </label>
            </div>
            {noTieneTelefono ? (
              <p className="mt-1 rounded-lg bg-[#F5F3EE] px-3 py-2 text-xs leading-relaxed text-[#666666]">
                Se usará tu número de contacto{" "}
                <span className="font-semibold text-[#333333]">
                  {miembro.telefono}
                </span>{" "}
                como referencia para esta cita.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[240px_minmax(0,1fr)]">
                <select
                  value={countryIso}
                  onChange={(e) =>
                    setCountryIso(e.target.value as CountryCode)
                  }
                  className="rounded-xl border border-[#E5E5E5] bg-white px-3 py-3 text-sm text-[#333333] outline-none focus:border-[#0066CC]"
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.iso} value={c.iso}>
                      {c.label} ({c.code})
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  value={phoneDigits}
                  onChange={(e) =>
                    setPhoneDigits(
                      e.target.value.replace(/\D/g, "").slice(0, 15),
                    )
                  }
                  placeholder="88887777"
                  className="rounded-xl border border-[#E5E5E5] bg-white px-4 py-3 text-sm text-[#333333] outline-none focus:border-[#0066CC]"
                />
              </div>
            )}
            {errors.telefono && (
              <p className="mt-1 text-xs text-red-500">{errors.telefono}</p>
            )}
          </div>

          {/* Cédula */}
          <div>
            <label className="mb-1 block text-sm font-medium text-[#333333]">
              Cédula (opcional)
            </label>
            <input
              type="text"
              value={cedula}
              onChange={(e) => setCedula(e.target.value.slice(0, 50))}
              placeholder="Número de cédula"
              className="w-full rounded-xl border border-[#E5E5E5] bg-white px-4 py-3 text-sm text-[#333333] outline-none focus:border-[#0066CC]"
            />
          </div>

          {/* Correo */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-sm font-medium text-[#333333]">
                Correo electrónico
              </label>
              <label className="flex items-center gap-1.5 text-xs text-[#666666] cursor-pointer">
                <input
                  type="checkbox"
                  checked={noTieneCorreo}
                  onChange={(e) => setNoTieneCorreo(e.target.checked)}
                  className="accent-[#0066CC]"
                />
                No tiene correo
              </label>
            </div>
            {!noTieneCorreo && (
              <input
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="w-full rounded-xl border border-[#E5E5E5] bg-white px-4 py-3 text-sm text-[#333333] outline-none focus:border-[#0066CC]"
              />
            )}
            {errors.correo && (
              <p className="mt-1 text-xs text-red-500">{errors.correo}</p>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-semibold text-[#0066CC] hover:underline cursor-pointer"
        >
          ← Cambiar horario
        </button>
        <button
          type="button"
          onClick={handleContinue}
          className="rounded-xl bg-[#0066CC] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#0055AA] cursor-pointer"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
