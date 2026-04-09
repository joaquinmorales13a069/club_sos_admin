import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { account } from "../lib/appwrite";
import logoSosMedical from "../assets/logo-sosmedical.webp";
import logoClubSos from "../assets/logo-clubSOS.webp";
import signupImagen from "../assets/signup-imagen.webp";
import StepPhoneOTP from "../components/signup/StepPhoneOTP";
import StepEmpresa from "../components/signup/StepEmpresa";
import StepParentesco from "../components/signup/StepParentesco";
import StepTitular from "../components/signup/StepTitular";
import StepPerfil from "../components/signup/StepPerfil";
import StepResumen from "../components/signup/StepResumen";
import type { SignupFormData, SignupStep } from "../types/signup";

// Estado inicial vacio del formulario acumulado
const INITIAL_FORM_DATA: SignupFormData = {
  telefono: "",
  authUserId: "",
  empresa: null,
  parentesco: null,
  titular: null,
  nombre_completo: "",
  sexo: "",
  fecha_nacimiento: "",
  documento_identidad: "",
  correo: "",
};

export default function SignupPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const continueFromSession = searchParams.get("continue") === "1";
  const [resumeReady, setResumeReady] = useState(!continueFromSession);

  const [step, setStep] = useState<SignupStep>(1);
  const [formData, setFormData] = useState<SignupFormData>(INITIAL_FORM_DATA);

  /**
   * Tras iniciar sesion sin perfil de miembro, ?continue=1 reanuda en el paso 2
   * usando la sesion OTP ya activa (telefono + auth_user_id desde Appwrite).
   */
  useEffect(() => {
    if (!continueFromSession) return;

    let cancelled = false;

    void (async () => {
      try {
        const user = await account.get();
        if (cancelled) return;
        const phone = user.phone;
        if (phone) {
          setFormData((prev) => ({
            ...prev,
            telefono: phone,
            authUserId: user.$id,
          }));
          setStep(2);
        }
      } catch {
        // Sin sesion valida: el usuario completa el paso 1 con OTP como siempre.
      } finally {
        if (!cancelled) {
          setResumeReady(true);
          setSearchParams({}, { replace: true });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [continueFromSession, setSearchParams]);

  /**
   * Recibe los datos parciales de cada paso, los fusiona con el estado
   * acumulado y avanza al siguiente paso.
   * El paso 3 decide si ir a 3.5 (no titular) o directo a 4 (titular).
   */
  const handleNext = (data: Partial<SignupFormData>) => {
    const updated = { ...formData, ...data };
    setFormData(updated);

    if (step === 1) setStep(2);
    else if (step === 2) setStep(3);
    else if (step === 3) {
      // Si es titular va directo al paso 4, si no pasa por el 3.5
      setStep(updated.parentesco === "titular" ? 4 : 3.5);
    }
    else if (step === 3.5) setStep(4);
    else if (step === 4) setStep(5);
  };

  /**
   * Retrocede al paso anterior.
   * El paso 4 puede venir de 3 (titular) o de 3.5 (dependiente),
   * por lo que se verifica el parentesco acumulado para decidir.
   */
  const handleBack = () => {
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
    else if (step === 3.5) setStep(3);
    else if (step === 4) {
      setStep(formData.parentesco === "titular" ? 3 : 3.5);
    }
    else if (step === 5) setStep(4);
  };

  // Renderiza el componente del paso actual
  const renderStep = () => {
    switch (step) {
      case 1:
        return <StepPhoneOTP onNext={handleNext} />;
      case 2:
        return <StepEmpresa onNext={handleNext} onBack={handleBack} />;
      case 3:
        return <StepParentesco onNext={handleNext} onBack={handleBack} />;
      case 3.5:
        return <StepTitular formData={formData} onNext={handleNext} onBack={handleBack} />;
      case 4:
        return <StepPerfil formData={formData} onNext={handleNext} onBack={handleBack} />;
      case 5:
        return <StepResumen formData={formData} onBack={handleBack} />;
    }
  };

  return (
    <main className="min-h-screen bg-white p-4 md:p-6">
      <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 bg-white lg:min-h-[calc(100vh-3rem)] lg:flex-row lg:gap-6">

        {/* Panel izquierdo — branding */}
        <div className="flex flex-1 flex-col gap-5 rounded-2xl border border-[#666666] bg-white p-6 md:p-8 lg:w-[38%] lg:flex-none lg:p-8">
          <div className="w-fit">
            <img
              src={logoSosMedical}
              alt="ClubSOS Admin"
              className="h-14 w-auto object-contain"
            />
          </div>

          <div className="mt-4 space-y-4 md:space-y-5">
            <h1 className="w-full text-4xl font-bold leading-[1.05] text-[#0066CC] md:text-3xl lg:text-4xl">
              Crea tu cuenta en ClubSOS
            </h1>
            <p className="w-full text-base leading-[1.35] text-[#666666] md:text-lg lg:text-xl">
              Registra tu acceso de administrador con validacion por SMS para
              operar de forma segura.
            </p>
            <img
              src={signupImagen}
              alt="Registro ClubSOS"
              className="block w-full rounded-xl"
            />
          </div>
        </div>

        {/* Panel derecho — formulario por pasos */}
        <div className="flex w-full flex-col justify-center rounded-2xl bg-[#0066CC] p-6 md:p-8 lg:w-[62%] lg:flex-none lg:p-9">
          <div className="mx-auto flex w-full max-w-[600px] flex-col gap-3.5 rounded-2xl bg-[#F5F3EE] p-5 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)] md:p-6 lg:p-[30px]">
            <img
              src={logoClubSos}
              alt="clubSOS"
              className="mx-auto mb-3 h-20 w-auto object-contain"
            />

            {/* Paso activo */}
            {!resumeReady ? (
              <div className="flex flex-col items-center justify-center gap-3 py-10">
                <div
                  className="h-10 w-10 animate-spin rounded-full border-2 border-[#0066CC] border-t-transparent"
                  aria-hidden
                />
                <p className="text-center text-sm text-[#666666]">
                  Preparando tu registro...
                </p>
              </div>
            ) : (
              renderStep()
            )}

            <p className="mt-1 text-center text-sm text-[#666666]">
              Ya tienes cuenta?{" "}
              <Link to="/login" className="font-semibold text-[#0066CC]">
                Inicia sesion
              </Link>
            </p>
          </div>
        </div>

      </section>
    </main>
  );
}
