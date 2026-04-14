import { useEffect, useRef, useState } from "react";
import { IoCloseOutline, IoCloudUploadOutline, IoImageOutline } from "react-icons/io5";
import type { Beneficio, BeneficioFormData, EstadoBeneficio, TipoBeneficio } from "../../../types/miembro";
import type { Empresa } from "../../../types/signup";
import {
    crearBeneficio,
    editarBeneficio,
    subirImagenBeneficio,
} from "../../../lib/appwrite";

const ESTADO_OPTIONS: { value: EstadoBeneficio; label: string }[] = [
    { value: "activa", label: "Activa" },
    { value: "expirada", label: "Expirada" },
];

const TIPO_OPTIONS: { value: TipoBeneficio; label: string }[] = [
    { value: "descuento", label: "Descuento" },
    { value: "promocion", label: "Promoción" },
    { value: "anuncio", label: "Anuncio" },
];

const FORM_INITIAL: BeneficioFormData = {
    titulo: "",
    descripcion: "",
    fecha_inicio: new Date().toISOString().slice(0, 10),
    fecha_fin: "",
    estado_beneficio: "activa",
    tipo_beneficio: "",
    empresa_id: [],
    beneficio_image_url: "",
};

interface Props {
    beneficio?: Beneficio | null;
    empresas: Empresa[];
    onClose: () => void;
    onSaved: () => void;
}

export function BeneficioFormModal({ beneficio, empresas, onClose, onSaved }: Props) {
    const isEdit = !!beneficio;

    const [form, setForm] = useState<BeneficioFormData>(() =>
        beneficio
            ? {
                  titulo: beneficio.titulo,
                  descripcion: beneficio.descripcion,
                  fecha_inicio: beneficio.fecha_inicio.slice(0, 10),
                  fecha_fin: beneficio.fecha_fin ? beneficio.fecha_fin.slice(0, 10) : "",
                  estado_beneficio: beneficio.estado_beneficio as EstadoBeneficio,
                  tipo_beneficio: (beneficio.tipo_beneficio ?? "") as TipoBeneficio | "",
                  empresa_id: beneficio.empresa_id,
                  beneficio_image_url: beneficio.beneficio_image_url ?? "",
              }
            : FORM_INITIAL,
    );
    const [isGlobal, setIsGlobal] = useState(
        !beneficio || beneficio.empresa_id.length === 0,
    );
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>(beneficio?.beneficio_image_url ?? "");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose]);

    function setField<K extends keyof BeneficioFormData>(key: K, value: BeneficioFormData[K]) {
        setForm((prev) => ({ ...prev, [key]: value }));
    }

    function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    }

    function toggleEmpresa(id: string) {
        setForm((prev) => {
            const ids = prev.empresa_id.includes(id)
                ? prev.empresa_id.filter((x) => x !== id)
                : [...prev.empresa_id, id];
            return { ...prev, empresa_id: ids };
        });
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setSaving(true);

        try {
            let imageUrl = form.beneficio_image_url;

            if (imageFile) {
                imageUrl = await subirImagenBeneficio(imageFile);
            }

            const data: BeneficioFormData = {
                ...form,
                empresa_id: isGlobal ? [] : form.empresa_id,
                beneficio_image_url: imageUrl,
            };

            if (isEdit && beneficio) {
                await editarBeneficio(beneficio.$id, data);
            } else {
                await crearBeneficio(data);
            }

            onSaved();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al guardar el beneficio.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#E5E5E5] px-6 py-5">
                    <div>
                        <h2 className="text-lg font-bold text-[#333333]">
                            {isEdit ? "Editar beneficio" : "Nuevo beneficio"}
                        </h2>
                        <p className="text-sm text-[#666666]">
                            {isEdit ? "Modifica los datos del beneficio." : "Completa los datos para crear un beneficio."}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-[#666666] transition-colors hover:bg-[#F5F3EE] hover:text-[#333333]"
                    >
                        <IoCloseOutline size={22} />
                    </button>
                </div>

                {/* Body */}
                <form id="beneficio-form" onSubmit={handleSubmit} className="flex flex-col gap-5 overflow-y-auto px-6 py-5">
                    {/* Imagen */}
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-[#333333]">
                            Imagen del beneficio
                        </label>
                        <div className="flex items-start gap-4">
                            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-[#E5E5E5] bg-[#F5F3EE]">
                                {imagePreview ? (
                                    <img
                                        src={imagePreview}
                                        alt="Preview"
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <IoImageOutline size={28} className="text-[#CCCCCC]" />
                                )}
                            </div>
                            <div className="flex flex-col gap-2">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="inline-flex items-center gap-2 rounded-xl border border-[#E5E5E5] bg-[#F5F3EE] px-4 py-2.5 text-sm font-semibold text-[#0066CC] transition-colors hover:bg-[#0066CC]/10"
                                >
                                    <IoCloudUploadOutline size={18} />
                                    {imagePreview ? "Cambiar imagen" : "Subir imagen"}
                                </button>
                                {imagePreview && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setImageFile(null);
                                            setImagePreview("");
                                            setField("beneficio_image_url", "");
                                        }}
                                        className="text-left text-xs text-[#666666] underline hover:text-red-600"
                                    >
                                        Quitar imagen
                                    </button>
                                )}
                                <p className="text-xs text-[#666666]">PNG, JPG, WEBP · máx 5 MB</p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    className="hidden"
                                    onChange={handleImageChange}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Título */}
                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-[#333333]">
                            Título <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            maxLength={300}
                            value={form.titulo}
                            onChange={(e) => setField("titulo", e.target.value)}
                            className="w-full rounded-xl border border-[#E5E5E5] bg-white px-4 py-2.5 text-sm text-[#333333] outline-none transition-colors focus:border-[#0066CC] focus:ring-2 focus:ring-[#0066CC]/15"
                            placeholder="Ej: 10% en farmacia"
                        />
                    </div>

                    {/* Descripción */}
                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-[#333333]">
                            Descripción <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            required
                            maxLength={3000}
                            rows={3}
                            value={form.descripcion}
                            onChange={(e) => setField("descripcion", e.target.value)}
                            className="w-full resize-none rounded-xl border border-[#E5E5E5] bg-white px-4 py-2.5 text-sm text-[#333333] outline-none transition-colors focus:border-[#0066CC] focus:ring-2 focus:ring-[#0066CC]/15"
                            placeholder="Describe el beneficio en detalle..."
                        />
                    </div>

                    {/* Tipo y Estado */}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-[#333333]">
                                Tipo de beneficio
                            </label>
                            <select
                                value={form.tipo_beneficio}
                                onChange={(e) => setField("tipo_beneficio", e.target.value as TipoBeneficio | "")}
                                className="w-full rounded-xl border border-[#E5E5E5] bg-white px-4 py-2.5 text-sm text-[#333333] outline-none transition-colors focus:border-[#0066CC] focus:ring-2 focus:ring-[#0066CC]/15"
                            >
                                <option value="">Sin tipo</option>
                                {TIPO_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-[#333333]">
                                Estado <span className="text-red-500">*</span>
                            </label>
                            <select
                                required
                                value={form.estado_beneficio}
                                onChange={(e) => setField("estado_beneficio", e.target.value as EstadoBeneficio)}
                                className="w-full rounded-xl border border-[#E5E5E5] bg-white px-4 py-2.5 text-sm text-[#333333] outline-none transition-colors focus:border-[#0066CC] focus:ring-2 focus:ring-[#0066CC]/15"
                            >
                                {ESTADO_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Fechas */}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-[#333333]">
                                Fecha de inicio <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                required
                                value={form.fecha_inicio}
                                onChange={(e) => setField("fecha_inicio", e.target.value)}
                                className="w-full rounded-xl border border-[#E5E5E5] bg-white px-4 py-2.5 text-sm text-[#333333] outline-none transition-colors focus:border-[#0066CC] focus:ring-2 focus:ring-[#0066CC]/15"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-[#333333]">
                                Fecha de fin
                                <span className="ml-1 text-xs font-normal text-[#666666]">(opcional)</span>
                            </label>
                            <input
                                type="date"
                                value={form.fecha_fin}
                                onChange={(e) => setField("fecha_fin", e.target.value)}
                                className="w-full rounded-xl border border-[#E5E5E5] bg-white px-4 py-2.5 text-sm text-[#333333] outline-none transition-colors focus:border-[#0066CC] focus:ring-2 focus:ring-[#0066CC]/15"
                            />
                        </div>
                    </div>

                    {/* Empresas */}
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-[#333333]">
                            Asignación de empresas
                        </label>
                        <label className="mb-3 flex cursor-pointer items-center gap-2.5">
                            <input
                                type="checkbox"
                                checked={isGlobal}
                                onChange={(e) => setIsGlobal(e.target.checked)}
                                className="h-4 w-4 rounded accent-[#0066CC]"
                            />
                            <span className="text-sm font-medium text-[#333333]">
                                Global — disponible para todas las empresas
                            </span>
                        </label>
                        {!isGlobal && (
                            <div className="max-h-40 space-y-2 overflow-y-auto rounded-xl border border-[#E5E5E5] p-3">
                                {empresas.length === 0 ? (
                                    <p className="text-sm text-[#666666]">No hay empresas disponibles.</p>
                                ) : (
                                    empresas.map((emp) => (
                                        <label key={emp.$id} className="flex cursor-pointer items-center gap-2.5">
                                            <input
                                                type="checkbox"
                                                checked={form.empresa_id.includes(emp.$id)}
                                                onChange={() => toggleEmpresa(emp.$id)}
                                                className="h-4 w-4 rounded accent-[#0066CC]"
                                            />
                                            <span className="text-sm text-[#333333]">{emp.nombre_empresa}</span>
                                            <span className="ml-auto text-xs text-[#666666]">
                                                {emp.estado === "inactivo" && "(inactiva)"}
                                            </span>
                                        </label>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {error && (
                        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {error}
                        </p>
                    )}
                </form>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 border-t border-[#E5E5E5] px-6 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="rounded-xl border border-[#E5E5E5] px-5 py-2.5 text-sm font-semibold text-[#666666] transition-colors hover:bg-[#F5F3EE] disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="beneficio-form"
                        disabled={saving}
                        className="rounded-xl bg-[#0066CC] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0055aa] disabled:opacity-60"
                    >
                        {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear beneficio"}
                    </button>
                </div>
            </div>
        </div>
    );
}
