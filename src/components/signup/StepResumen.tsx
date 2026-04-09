import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { IoArrowBack } from "react-icons/io5";
import { toast } from "react-toastify";
import { crearMiembro, getCurrentUserId } from "../../lib/appwrite";
import type { StepProps } from "../../types/signup";

type Props = Pick<StepProps, "formData" | "onBack">;

// Etiquetas legibles para el parentesco
const PARENTESCO_LABEL: Record<string, string> = {
  titular: "Titular",
  conyuge: "Conyuge",
  hijo: "Hijo/a",
  familiar: "Familiar",
};

export default function StepResumen({ formData, onBack }: Props) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /**
   * Crea el documento del miembro en Appwrite con todos los datos acumulados.
   * El auth_user_id se obtiene de la sesion activa.
   * El miembro se crea con activo = false, pendiente de activacion por un admin.
   */
  const handleConfirmar = async () => {
    setLoading(true);
    setError("");

    try {
      const authUserId = await getCurrentUserId();
      await crearMiembro(formData, authUserId);
      toast.success("Cuenta creada. Tu acceso esta pendiente de activacion.");
      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al crear la cuenta.");
    } finally {
      setLoading(false);
    }
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
            Paso 5 de 5
          </span>
        </div>
        <h2 className="text-3xl font-bold text-[#0066CC]">
          Resumen de cuenta
        </h2>
      </div>

      <p className="text-base leading-snug text-[#666666]">
        Revisa tu informacion antes de confirmar. Tu cuenta quedara pendiente de
        activacion por un administrador.
      </p>

      {/* Tarjeta de resumen */}
      <div className="mt-1 flex flex-col gap-0 divide-y divide-[#E5E5E5] rounded-xl border border-[#E5E5E5] bg-white overflow-hidden">
        <ResumenFila label="Telefono" value={formData.telefono} />
        <ResumenFila label="Empresa" value={formData.empresa?.nombre_empresa ?? "—"} />
        <ResumenFila
          label="Parentesco"
          value={PARENTESCO_LABEL[formData.parentesco ?? ""] ?? "—"}
        />
        {formData.titular && (
          <ResumenFila label="Titular vinculado" value={formData.titular.nombre_completo} />
        )}
        <ResumenFila label="Nombre completo" value={formData.nombre_completo} />
        <ResumenFila
          label="Sexo"
          value={formData.sexo === "masculino" ? "Masculino" : "Femenino"}
        />
        <ResumenFila
          label="Fecha de nacimiento"
          value={
            formData.fecha_nacimiento
              ? new Date(formData.fecha_nacimiento).toLocaleDateString("es-NI")
              : "—"
          }
        />
        {formData.documento_identidad && (
          <ResumenFila label="Documento" value={formData.documento_identidad} />
        )}
        {formData.correo && (
          <ResumenFila label="Correo" value={formData.correo} />
        )}

        {/* Estado de la cuenta — siempre inactivo al crear */}
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-[#666666]">Estado de cuenta</span>
          <span className="rounded-full bg-[#FFF3E0] px-2.5 py-0.5 text-xs font-semibold text-[#CC7700]">
            Pendiente de activacion
          </span>
        </div>
      </div>

      <p className="text-xs text-[#666666]">
        Un administrador o encargado de tu empresa debera activar tu cuenta antes de que puedas acceder.
      </p>

      {error && <p className="text-xs text-[#CC3333]">{error}</p>}

      <button
        type="button"
        onClick={handleConfirmar}
        disabled={loading}
        className="mt-1 flex w-full items-center justify-center rounded-xl bg-[#0066CC] px-[18px] py-[14px] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="text-base font-semibold text-white">
          {loading ? "Creando cuenta..." : "Confirmar y crear cuenta"}
        </span>
      </button>
    </div>
  );
}

// Componente auxiliar para cada fila del resumen
function ResumenFila({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-[#666666]">{label}</span>
      <span className="text-sm font-medium text-[#333333]">{value}</span>
    </div>
  );
}
