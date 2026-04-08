import { useState } from "react";
import type { FormEvent } from "react";
import { IoArrowBack } from "react-icons/io5";
import { buscarMiembroTitular } from "../../lib/appwrite";
import type { MiembroTitular, StepProps } from "../../types/signup";

type Props = Pick<StepProps, "formData" | "onNext" | "onBack">;

export default function StepTitular({ formData, onNext, onBack }: Props) {
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [documentoIdentidad, setDocumentoIdentidad] = useState("");
  const [titular, setTitular] = useState<MiembroTitular | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canBuscar = nombreCompleto.trim().length > 0 && documentoIdentidad.trim().length > 0;

  /**
   * Busca el titular usando nombre_completo + documento_identidad exactos,
   * filtrado ademas por la empresa vinculada en el paso 2.
   */
  const handleBuscar = async (event: FormEvent) => {
    event.preventDefault();
    if (!canBuscar || !formData.empresa) return;

    setLoading(true);
    setError("");
    setTitular(null);

    try {
      const resultado = await buscarMiembroTitular(
        formData.empresa.$id,
        nombreCompleto.trim(),
        documentoIdentidad.trim(),
      );

      if (!resultado) {
        setError("No se encontro un titular con esos datos en tu empresa. Verifica la informacion.");
        return;
      }

      setTitular(resultado);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al buscar el titular.");
    } finally {
      setLoading(false);
    }
  };

  // Vincula al nuevo miembro con el titular encontrado y avanza al siguiente paso
  const handleVincular = () => {
    if (!titular) return;
    onNext({ titular });
  };

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-[#666666] transition-colors hover:bg-[#E8E8E8]"
            aria-label="Retroceder"
          >
            <IoArrowBack size={16} />
            Regresar
          </button>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#0066CC]">
            Paso 3.5 de 5
          </span>
        </div>
        <h2 className="text-3xl font-bold text-[#0066CC]">
          Vincular titular
        </h2>
      </div>

      <p className="text-base leading-snug text-[#666666]">
        Ingresa los datos del titular de la cuenta a la que quieres vincularte.
      </p>

      <form onSubmit={handleBuscar} className="flex flex-col gap-3.5">
        <label className="mt-1 text-sm font-medium text-[#666666]">
          Nombre completo del titular
        </label>
        <input
          type="text"
          value={nombreCompleto}
          onChange={(e) => {
            setNombreCompleto(e.target.value);
            setTitular(null);
            setError("");
          }}
          placeholder="Nombre tal como esta registrado"
          className="w-full rounded-xl border border-[#666666] bg-white px-4 py-[14px] text-base text-[#666666] outline-none placeholder:text-[#666666] focus:border-[#0066CC]"
        />

        <label className="text-sm font-medium text-[#666666]">
          Documento de identidad del titular
        </label>
        <input
          type="text"
          value={documentoIdentidad}
          onChange={(e) => {
            setDocumentoIdentidad(e.target.value);
            setTitular(null);
            setError("");
          }}
          placeholder="Cedula o pasaporte"
          className="w-full rounded-xl border border-[#666666] bg-white px-4 py-[14px] text-base text-[#666666] outline-none placeholder:text-[#666666] focus:border-[#0066CC]"
        />

        {error && <p className="text-xs text-[#CC3333]">{error}</p>}

        <button
          type="submit"
          disabled={!canBuscar || loading}
          className="flex w-full items-center justify-center rounded-xl bg-[#CC3333] px-[18px] py-[14px] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="text-base font-semibold text-white">
            {loading ? "Buscando..." : "Buscar titular"}
          </span>
        </button>
      </form>

      {/* Card con datos del titular encontrado */}
      {titular && (
        <div className="mt-2 flex flex-col gap-3 rounded-xl border border-[#0066CC] bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#0066CC]">
            Titular encontrado
          </p>

          <div>
            <p className="text-lg font-bold text-[#333333]">{titular.nombre_completo}</p>
            <p className="text-sm text-[#666666]">
              Documento: {titular.documento_identidad}
            </p>
            <p className="text-sm text-[#666666]">
              Telefono: {titular.telefono}
            </p>
          </div>

          <button
            type="button"
            onClick={handleVincular}
            className="flex w-full items-center justify-center rounded-xl bg-[#0066CC] px-[18px] py-[14px]"
          >
            <span className="text-base font-semibold text-white">
              Vincular con este titular
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
