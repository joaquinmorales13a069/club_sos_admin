import { useState } from "react";
import type { FormEvent } from "react";
import type { StepProps } from "../../types/signup";

type Props = Pick<StepProps, "formData" | "onNext">;

export default function StepPerfil({ formData, onNext }: Props) {
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [sexo, setSexo] = useState<"masculino" | "femenino" | "">("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [documentoIdentidad, setDocumentoIdentidad] = useState("");
  const [correo, setCorreo] = useState("");
  const [error, setError] = useState("");

  // Validacion de correo opcional: si tiene contenido debe tener formato valido
  const correoValido = correo === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);

  const canSubmit =
    nombreCompleto.trim().length > 0 &&
    sexo !== "" &&
    fechaNacimiento !== "" &&
    correoValido;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) {
      setError("Por favor completa todos los campos requeridos.");
      return;
    }

    onNext({
      nombre_completo: nombreCompleto.trim(),
      sexo,
      fecha_nacimiento: new Date(fechaNacimiento).toISOString(),
      documento_identidad: documentoIdentidad.trim(),
      correo: correo.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
      <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
        <h2 className="text-3xl font-bold text-[#0066CC] md:text-4xl">
          Informacion personal
        </h2>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#0066CC]">
          Paso 4 de 5
        </span>
      </div>

      <p className="text-base leading-snug text-[#666666]">
        Completa tu perfil para finalizar el registro.
      </p>

      {/* Nombre completo */}
      <label className="mt-1 text-sm font-medium text-[#666666]">
        Nombre completo <span className="text-[#CC3333]">*</span>
      </label>
      <input
        type="text"
        value={nombreCompleto}
        onChange={(e) => setNombreCompleto(e.target.value)}
        placeholder="Tu nombre completo"
        className="w-full rounded-xl border border-[#666666] bg-white px-4 py-[14px] text-base text-[#666666] outline-none placeholder:text-[#666666] focus:border-[#0066CC]"
      />

      {/* Sexo */}
      <label className="text-sm font-medium text-[#666666]">
        Sexo <span className="text-[#CC3333]">*</span>
      </label>
      <select
        value={sexo}
        onChange={(e) => setSexo(e.target.value as "masculino" | "femenino" | "")}
        className="w-full rounded-xl border border-[#666666] bg-white px-3 py-[14px] text-base text-[#666666] outline-none focus:border-[#0066CC]"
      >
        <option value="" disabled>Selecciona tu sexo</option>
        <option value="masculino">Masculino</option>
        <option value="femenino">Femenino</option>
      </select>

      {/* Fecha de nacimiento */}
      <label className="text-sm font-medium text-[#666666]">
        Fecha de nacimiento <span className="text-[#CC3333]">*</span>
      </label>
      <input
        type="date"
        value={fechaNacimiento}
        onChange={(e) => setFechaNacimiento(e.target.value)}
        max={new Date().toISOString().split("T")[0]} // No permite fechas futuras
        className="w-full rounded-xl border border-[#666666] bg-white px-4 py-[14px] text-base text-[#666666] outline-none focus:border-[#0066CC]"
      />

      {/* Documento de identidad */}
      <label className="text-sm font-medium text-[#666666]">
        Documento de identidad
      </label>
      <input
        type="text"
        value={documentoIdentidad}
        onChange={(e) => setDocumentoIdentidad(e.target.value)}
        placeholder="Cedula o pasaporte (opcional)"
        className="w-full rounded-xl border border-[#666666] bg-white px-4 py-[14px] text-base text-[#666666] outline-none placeholder:text-[#666666] focus:border-[#0066CC]"
      />

      {/* Correo electronico */}
      <label className="text-sm font-medium text-[#666666]">
        Correo electronico
      </label>
      <input
        type="email"
        value={correo}
        onChange={(e) => setCorreo(e.target.value)}
        placeholder="tucorreo@ejemplo.com (opcional)"
        className="w-full rounded-xl border border-[#666666] bg-white px-4 py-[14px] text-base text-[#666666] outline-none placeholder:text-[#666666] focus:border-[#0066CC]"
      />
      {correo !== "" && !correoValido && (
        <p className="text-xs text-[#CC3333]">Ingresa un correo valido.</p>
      )}

      {/* Telefono verificado (solo lectura, viene del paso 1) */}
      <label className="text-sm font-medium text-[#666666]">
        Telefono verificado
      </label>
      <input
        type="text"
        value={formData.telefono}
        disabled
        className="w-full rounded-xl border border-[#666666] bg-[#EFEDE8] px-4 py-[14px] text-base text-[#666666]"
      />
      <p className="text-xs text-[#666666]">
        Este es el telefono que verificaste en el paso 1.
      </p>

      {error && <p className="text-xs text-[#CC3333]">{error}</p>}

      <button
        type="submit"
        disabled={!canSubmit}
        className="mt-1 flex w-full items-center justify-center rounded-xl bg-[#0066CC] px-[18px] py-[14px] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="text-base font-semibold text-white">
          Continuar al resumen
        </span>
      </button>
    </form>
  );
}
