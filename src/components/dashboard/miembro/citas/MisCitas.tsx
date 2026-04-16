import { useEffect, useState, useCallback } from "react";
import Skeleton from "react-loading-skeleton";
import { toast } from "react-toastify";
import {
  IoCalendarOutline,
  IoAddOutline,
  IoArrowBackOutline,
} from "react-icons/io5";
import { Query } from "appwrite";
import { databases } from "../../../../lib/appwrite";
import { ID } from "appwrite";
import type { Miembro } from "../../../../types/miembro";
import type {
  Cita,
  Servicio,
  WizardState,
  WizardStep,
} from "../../../../types/citas";
import { WIZARD_INITIAL } from "../../../../types/citas";
import { WizardProgressBar } from "./WizardProgressBar";
import { CitaCard } from "./CitaCard";
import { PasoUbicacion } from "./steps/PasoUbicacion";
import { PasoServicio } from "./steps/PasoServicio";
import { PasoDoctor } from "./steps/PasoDoctor";
import { PasoFecha } from "./steps/PasoFecha";
import { PasoHorario } from "./steps/PasoHorario";
import { PasoPaciente } from "./steps/PasoPaciente";
import { PasoConfirmar } from "./steps/PasoConfirmar";

const DB_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const TABLE_CITAS = import.meta.env.VITE_APPWRITE_TABLE_CITAS_ID;
const TABLE_SERVICIOS = import.meta.env.VITE_APPWRITE_TABLE_SERVICIOS_ID;
const TABLE_DOCTORES = import.meta.env.VITE_APPWRITE_TABLE_DOCTORES_ID;

const STEP_NUMBER: Record<Exclude<WizardStep, "lista">, number> = {
  ubicacion: 1,
  servicio: 2,
  doctor: 3,
  fecha: 4,
  horario: 5,
  paciente: 6,
  confirmar: 7,
};

interface MisCitasProps {
  miembro: Miembro;
}

export function MisCitas({ miembro }: MisCitasProps) {
  const [step, setStep] = useState<WizardStep>("lista");
  const [wizard, setWizard] = useState<WizardState>(WIZARD_INITIAL);

  const [citas, setCitas] = useState<Cita[]>([]);
  const [loading, setLoading] = useState(true);
  const [serviceMap, setServiceMap] = useState<Map<number, Servicio>>(
    new Map(),
  );
  const [doctorMap, setDoctorMap] = useState<Map<number, string>>(new Map());

  const fetchCitas = useCallback(async () => {
    try {
      const citasRes = await databases.listDocuments(DB_ID, TABLE_CITAS, [
        Query.equal("miembro_id", miembro.$id),
        Query.orderDesc("$createdAt"),
      ]);
      const citasList = citasRes.documents as unknown as Cita[];
      setCitas(citasList);

      if (citasList.length > 0) {
        const serviceEaIds = [
          ...new Set(citasList.map((c) => parseInt(c.ea_service_id))),
        ];
        const providerEaIds = [
          ...new Set(citasList.map((c) => parseInt(c.ea_provider_id))),
        ];

        const [servicesRes, doctoresRes] = await Promise.all([
          databases.listDocuments(DB_ID, TABLE_SERVICIOS, [
            Query.equal("ea_id", serviceEaIds),
          ]),
          databases.listDocuments(DB_ID, TABLE_DOCTORES, [
            Query.equal("ea_id", providerEaIds),
          ]),
        ]);

        setServiceMap(
          new Map(
            (servicesRes.documents as unknown as Servicio[]).map((s) => [
              s.ea_id,
              s,
            ]),
          ),
        );
        setDoctorMap(
          new Map(
            (
              doctoresRes.documents as unknown as {
                ea_id: number;
                nombres: string;
                apellidos: string;
              }[]
            ).map((d) => [d.ea_id, `${d.nombres} ${d.apellidos}`]),
          ),
        );
      }
    } catch {
      toast.error("Error al cargar citas");
    } finally {
      setLoading(false);
    }
  }, [miembro.$id]);

  useEffect(() => {
    fetchCitas();
  }, [fetchCitas]);

  function patchWizard(patch: Partial<WizardState>) {
    setWizard((prev) => ({ ...prev, ...patch }));
  }

  async function handleConfirm() {
    try {
      const fechaHoraCita = `${wizard.fecha}T${wizard.hora}:00.000+00:00`;

      if (wizard.citaIdToEdit) {
        await databases.deleteDocument(
          DB_ID,
          TABLE_CITAS,
          wizard.citaIdToEdit,
        );
      }

      await databases.createDocument(DB_ID, TABLE_CITAS, ID.unique(), {
        miembro_id: miembro.$id,
        empresa_id: miembro.empresa_id,
        fecha_hora_cita: fechaHoraCita,
        ea_service_id: String(wizard.eaServiceId),
        ea_provider_id: String(wizard.eaProviderId),
        ea_customer_id: "",
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
      setLoading(true);
      fetchCitas();
    } catch {
      toast.error("Error al agendar la cita");
    }
  }

  async function handleCancel(citaId: string) {
    try {
      await databases.updateDocument(DB_ID, TABLE_CITAS, citaId, {
        estado_sync: "cancelado",
      });
      toast.success("Cita cancelada");
      setLoading(true);
      fetchCitas();
    } catch {
      toast.error("Error al cancelar la cita");
    }
  }

  function handleEdit(cita: Cita) {
    const servicio = serviceMap.get(parseInt(cita.ea_service_id));
    setWizard({
      ...WIZARD_INITIAL,
      categoriaId: servicio?.ea_category_id ?? null,
      ubicacionNombre:
        servicio?.ea_category_id === 1 ? "Managua" : "León",
      eaServiceId: parseInt(cita.ea_service_id),
      servicioNombre: servicio?.nombre ?? "",
      servicioDuracion: servicio?.duracion ?? 0,
      eaProviderId: parseInt(cita.ea_provider_id),
      doctorNombre:
        doctorMap.get(parseInt(cita.ea_provider_id)) ?? "",
      citaIdToEdit: cita.$id,
    });
    setStep("fecha");
  }

  // ── Wizard steps render ──

  if (step !== "lista") {
    return (
      <div className="space-y-4">
        {/* Wizard header */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setWizard(WIZARD_INITIAL);
              setStep("lista");
            }}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E5E5E5] text-[#666666] hover:bg-[#F5F3EE] transition-colors cursor-pointer"
            aria-label="Volver a lista"
          >
            <IoArrowBackOutline size={18} />
          </button>
          <h2 className="text-xl font-bold tracking-tight text-[#333333]">
            {wizard.citaIdToEdit ? "Reagendar cita" : "Agendar cita"}
          </h2>
        </div>

        <section className="rounded-2xl border border-[#E5E5E5] bg-white p-6 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
          <WizardProgressBar currentStep={STEP_NUMBER[step]} wizard={wizard} />

          {step === "ubicacion" && (
            <PasoUbicacion
              onSelect={(patch) => {
                patchWizard(patch);
                setStep("servicio");
              }}
            />
          )}

          {step === "servicio" && wizard.categoriaId !== null && (
            <PasoServicio
              categoriaId={wizard.categoriaId}
              onSelect={(patch) => {
                patchWizard(patch);
                setStep("doctor");
              }}
              onBack={() => setStep("ubicacion")}
            />
          )}

          {step === "doctor" && wizard.eaServiceId !== null && (
            <PasoDoctor
              eaServiceId={wizard.eaServiceId}
              onSelect={(patch) => {
                patchWizard(patch);
                setStep("fecha");
              }}
              onBack={() => setStep("servicio")}
            />
          )}

          {step === "fecha" && (
            <PasoFecha
              onSelect={(fecha) => {
                patchWizard({ fecha });
                setStep("horario");
              }}
              onBack={() =>
                wizard.citaIdToEdit
                  ? (() => {
                      setWizard(WIZARD_INITIAL);
                      setStep("lista");
                    })()
                  : setStep("doctor")
              }
            />
          )}

          {step === "horario" &&
            wizard.eaProviderId !== null &&
            wizard.eaServiceId !== null && (
              <PasoHorario
                eaProviderId={wizard.eaProviderId}
                eaServiceId={wizard.eaServiceId}
                fecha={wizard.fecha}
                onSelect={(hora) => {
                  patchWizard({ hora });
                  setStep("paciente");
                }}
                onBack={() => setStep("fecha")}
              />
            )}

          {step === "paciente" && (
            <PasoPaciente
              miembro={miembro}
              onSelect={(patch) => {
                patchWizard(patch);
                setStep("confirmar");
              }}
              onBack={() => setStep("horario")}
            />
          )}

          {step === "confirmar" && (
            <PasoConfirmar
              wizard={wizard}
              onConfirm={handleConfirm}
              onBack={() => setStep("paciente")}
            />
          )}
        </section>
      </div>
    );
  }

  // ── Lista de citas ──

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-[#333333]">
          Mis Citas
        </h2>
        <button
          type="button"
          onClick={() => setStep("ubicacion")}
          className="flex items-center gap-2 rounded-xl bg-[#0066CC] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0055AA] cursor-pointer"
        >
          <IoAddOutline size={18} />
          Agendar
        </button>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} height={160} borderRadius={16} />
          ))}
        </div>
      ) : citas.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-[#E5E5E5] bg-white py-20 text-center">
          <IoCalendarOutline size={48} className="text-[#CCCCCC]" />
          <div>
            <p className="font-semibold text-[#333333]">
              Sin citas programadas
            </p>
            <p className="mt-1 text-sm text-[#666666]">
              Agenda tu primera cita médica con nosotros
            </p>
          </div>
          <button
            type="button"
            onClick={() => setStep("ubicacion")}
            className="mt-2 flex items-center gap-2 rounded-xl bg-[#0066CC] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0055AA] cursor-pointer"
          >
            <IoAddOutline size={18} />
            Agendar tu primera cita
          </button>
        </div>
      ) : (
        /* Citas grid */
        <div className="grid gap-4 sm:grid-cols-2">
          {citas.map((cita) => (
            <CitaCard
              key={cita.$id}
              cita={cita}
              servicioNombre={
                serviceMap.get(parseInt(cita.ea_service_id))?.nombre ??
                "Servicio"
              }
              doctorNombre={
                doctorMap.get(parseInt(cita.ea_provider_id)) ?? "Doctor"
              }
              serviceMap={serviceMap}
              doctorMap={doctorMap}
              onEdit={() => handleEdit(cita)}
              onCancel={() => handleCancel(cita.$id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
