import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { IoRefresh } from "react-icons/io5";
import Skeleton from "react-loading-skeleton";
import { toast } from "react-toastify";
import logoSosMedical from "../assets/logo-sosmedical.webp";
import { DashboardRolePanels } from "../components/dashboard/DashboardRolePanels";
import { ROL_LABEL } from "../types/miembro";
import { useMiembroSession } from "../hooks/useMiembroSession";

export default function Dashboard() {
  const navigate = useNavigate();
  const { state, refetch, logout } = useMiembroSession();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      toast.success("Sesion cerrada correctamente.");
      navigate("/login", { replace: true });
    } catch {
      toast.error("No se pudo cerrar sesion. Intenta de nuevo.");
    } finally {
      setLoggingOut(false);
    }
  };

  const handleRefetch = async () => {
    const toastId = toast.loading("Actualizando datos del miembro...");
    try {
      await refetch();
      toast.update(toastId, {
        render: "Datos actualizados.",
        type: "success",
        isLoading: false,
        autoClose: 2200,
      });
    } catch {
      toast.update(toastId, {
        render: "No se pudieron actualizar los datos.",
        type: "error",
        isLoading: false,
        autoClose: 3200,
      });
    }
  };

  if (state.status === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }

  if (state.status === "loading") {
    return (
      <div className="min-h-screen bg-[#F5F3EE] px-4 py-8 md:px-6">
        <div className="mx-auto max-w-[1200px]">
          <div className="rounded-2xl border border-[#E5E5E5] bg-white p-6 md:p-8">
            <Skeleton height={30} width={220} />
            <Skeleton className="mt-4" count={2} />
            <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <Skeleton height={160} />
              <Skeleton height={160} />
              <Skeleton height={160} />        
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F5F3EE] px-4">
        <p className="max-w-md text-center text-sm text-[#666666]">{state.message}</p>
        <button
          type="button"
          onClick={() => void handleRefetch()}
          className="rounded-xl bg-[#0066CC] px-5 py-2.5 text-sm font-semibold text-white"
        >
          Reintentar
        </button>
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="text-sm font-semibold text-[#CC3333]"
        >
          Cerrar sesion
        </button>
      </div>
    );
  }

  if (state.status === "no_miembro") {
    return (
      <div className="min-h-screen bg-white px-4 py-8">
        <header className="mx-auto flex max-w-3xl flex-col gap-4 border-b border-[#E5E5E5] pb-6">
          <img src={logoSosMedical} alt="ClubSOS Admin" className="h-12 w-auto object-contain" />
        </header>
        <main className="mx-auto mt-8 max-w-lg text-center">
          <h1 className="text-2xl font-bold text-[#0066CC]">Sin perfil de miembro</h1>
          <p className="mt-3 text-base leading-relaxed text-[#666666]">
            Tu sesion esta activa, pero no hay un registro en ClubSOS vinculado a este
            telefono. Completa el registro para continuar.
          </p>
          <Link
            to="/signup?continue=1"
            className="mt-6 inline-block rounded-xl bg-[#CC3333] px-6 py-3 text-sm font-semibold text-white"
          >
            Ir al registro
          </Link>
          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={loggingOut}
            className="mt-4 block w-full text-center text-sm font-semibold text-[#666666] underline disabled:opacity-50"
          >
            {loggingOut ? "Cerrando..." : "Cerrar sesion"}
          </button>
        </main>
      </div>
    );
  }

  const miembro = state.miembro;
  const isPending = state.status === "pending";

  return (
    <div className="min-h-screen bg-[#F5F3EE]">
      <header className="border-b border-[#E5E5E5] bg-white">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 py-5 md:flex-row md:items-center md:justify-between md:px-6">
          <div className="flex flex-wrap items-center gap-4">
            <img src={logoSosMedical} alt="ClubSOS Admin" className="h-11 w-auto object-contain" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-[#0066CC]/10 px-3 py-1 text-xs font-semibold text-[#0066CC]">
              {ROL_LABEL[miembro.rol]}
            </span>
            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={loggingOut}
              className="rounded-xl border border-[#666666]/60 px-4 py-2 text-sm font-semibold text-[#666666] transition-colors hover:bg-[#E8E8E8] disabled:opacity-50"
            >
              {loggingOut ? "..." : "Cerrar sesion"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-4 py-8 md:px-6">
        {miembro.rol !== "miembro" && (
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#0066CC] md:text-4xl">
              Hola, {miembro.nombre_completo.split(" ")[0]}
            </h1>
            <p className="mt-2 text-base text-[#666666]">
              {isPending
                ? "Tu cuenta aun esta pendiente de activacion."
                : "Este es tu panel principal de ClubSOS."}
            </p>
          </div>
        )}

        {isPending ? (
          <section className="rounded-2xl border border-amber-200/80 bg-amber-50/90 p-6 md:p-8">
            <h2 className="text-xl font-semibold text-[#666666]">Cuenta en revision</h2>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#666666]">
              Un administrador de tu empresa o del club debe activar tu cuenta antes de que
              puedas usar todas las funciones. Te notificaremos cuando tu acceso este listo,
              o puedes volver a intentar mas tarde por si ya fue activada.
            </p>
            <button
              type="button"
              onClick={() => void handleRefetch()}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0066CC] px-5 py-2.5 text-sm font-semibold text-white"
            >
              <IoRefresh size={18} />
              Comprobar de nuevo
            </button>
          </section>
        ) : (
          <DashboardRolePanels rol={miembro.rol} miembro={miembro} />
        )}
      </main>
    </div>
  );
}
