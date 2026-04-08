import { useState } from "react";
import type { FormEvent } from "react";
import { IoArrowBack } from "react-icons/io5";
import { buscarEmpresaPorCodigo } from "../../lib/appwrite";
import type { Empresa, StepProps } from "../../types/signup";

type Props = Pick<StepProps, "onNext" | "onBack">;

export default function StepEmpresa({ onNext, onBack }: Props) {
  const [codigo, setCodigo] = useState("");
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Busca la empresa por codigo_empresa exacto y activa
  const handleBuscar = async (event: FormEvent) => {
    event.preventDefault();
    if (!codigo.trim()) return;

    setLoading(true);
    setError("");
    setEmpresa(null);

    try {
      const resultado = await buscarEmpresaPorCodigo(codigo.trim());
      if (!resultado) {
        setError("No se encontro ninguna empresa con ese codigo. Verifica e intenta de nuevo.");
        return;
      }
      setEmpresa(resultado);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al buscar la empresa.");
    } finally {
      setLoading(false);
    }
  };

  // Vincula al miembro con la empresa encontrada y avanza al siguiente paso
  const handleVincular = () => {
    if (!empresa) return;
    onNext({ empresa });
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
            Paso 2 de 5
          </span>
        </div>
        <h2 className="text-3xl font-bold text-[#0066CC]">
          Vincular empresa
        </h2>
      </div>

      <p className="text-base leading-snug text-[#666666]">
        Ingresa el codigo de tu empresa para vincular tu cuenta.
      </p>

      <form onSubmit={handleBuscar} className="flex flex-col gap-3.5">
        <label className="mt-1 text-sm font-medium text-[#666666]">
          Codigo de empresa
        </label>
        <input
          type="text"
          value={codigo}
          onChange={(e) => {
            setCodigo(e.target.value);
            // Limpia resultado anterior si cambia el codigo
            setEmpresa(null);
            setError("");
          }}
          placeholder="EJ: EMP-001"
          className="w-full rounded-xl border border-[#666666] bg-white px-4 py-[14px] text-base uppercase text-[#666666] outline-none placeholder:normal-case placeholder:text-[#666666] focus:border-[#0066CC]"
        />

        {error && <p className="text-xs text-[#CC3333]">{error}</p>}

        <button
          type="submit"
          disabled={!codigo.trim() || loading}
          className="flex w-full items-center justify-center rounded-xl bg-[#CC3333] px-[18px] py-[14px] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="text-base font-semibold text-white">
            {loading ? "Buscando..." : "Buscar empresa"}
          </span>
        </button>
      </form>

      {/* Card con datos de la empresa encontrada */}
      {empresa && (
        <div className="mt-2 flex flex-col gap-3 rounded-xl border border-[#0066CC] bg-white p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#0066CC]">
              Empresa encontrada
            </p>
            <span className="rounded-full bg-[#E8F0FB] px-2.5 py-0.5 text-xs font-semibold text-[#0066CC]">
              {empresa.estado}
            </span>
          </div>

          <div>
            <p className="text-lg font-bold text-[#333333]">{empresa.nombre_empresa}</p>
            <p className="text-sm text-[#666666]">Codigo: {empresa.codigo_empresa}</p>
            {empresa.notas && (
              <p className="mt-1 text-sm text-[#666666]">{empresa.notas}</p>
            )}
          </div>

          <button
            type="button"
            onClick={handleVincular}
            className="flex w-full items-center justify-center rounded-xl bg-[#0066CC] px-[18px] py-[14px]"
          >
            <span className="text-base font-semibold text-white">
              Vincular con esta empresa
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
