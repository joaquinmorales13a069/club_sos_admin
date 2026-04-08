import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { CountryCode } from "libphonenumber-js";
import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
} from "libphonenumber-js";
import { sendPhoneOTP, verifyPhoneOTP, getCurrentUserId } from "../../lib/appwrite";
import type { StepProps } from "../../types/signup";

const OTP_LENGTH = 6;
const regionNames = new Intl.DisplayNames(["es"], { type: "region" });

// Lista de paises ordenada alfabeticamente en espanol, generada una sola vez
const COUNTRY_CODES: { iso: CountryCode; code: string; label: string }[] =
  getCountries()
    .map((iso) => ({
      iso,
      code: `+${getCountryCallingCode(iso)}`,
      label: regionNames.of(iso) ?? iso,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "es"));

type Props = Pick<StepProps, "onNext">;

export default function StepPhoneOTP({ onNext }: Props) {
  const [countryIso, setCountryIso] = useState<CountryCode>("NI");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [otp, setOtp] = useState("");
  const [userId, setUserId] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState(
    "Ingresa tu numero para enviarte un codigo OTP.",
  );

  const selectedCountry = useMemo(
    () => COUNTRY_CODES.find((c) => c.iso === countryIso) ?? COUNTRY_CODES[0],
    [countryIso],
  );

  const parsedPhone = useMemo(
    () => parsePhoneNumberFromString(phoneDigits, countryIso),
    [phoneDigits, countryIso],
  );

  const fullPhone = parsedPhone?.number ?? "";
  const canSendOtp = Boolean(parsedPhone?.isValid());
  const canVerifyOtp = otp.length === OTP_LENGTH;

  // Paso 1a: envia el OTP por SMS
  const handleSendOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSendOtp) {
      setStatusMessage("Ingresa un numero valido para continuar.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const newUserId = await sendPhoneOTP(fullPhone);
      setUserId(newUserId);
      setOtpSent(true);
      setIsVerified(false);
      setStatusMessage(
        `Codigo enviado a ${parsedPhone?.number ?? `${selectedCountry.code} ${phoneDigits}`}. Ingresa los 6 digitos.`,
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al enviar el OTP.");
    } finally {
      setLoading(false);
    }
  };

  // Paso 1b: verifica el OTP y obtiene el auth_user_id para pasar al siguiente paso
  const handleVerifyOtp = async (event: FormEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!canVerifyOtp || !userId) return;

    setLoading(true);
    setError("");

    try {
      await verifyPhoneOTP(userId, otp);
      const authUserId = await getCurrentUserId();
      setIsVerified(true);
      setStatusMessage("Telefono verificado. Continua con el siguiente paso.");

      // Pasa telefono y authUserId al orquestador para uso en pasos posteriores
      onNext({ telefono: fullPhone, authUserId });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Codigo OTP incorrecto.");
    } finally {
      setLoading(false);
    }
  };

  // Reenvio del OTP generando un nuevo token
  const handleResendOtp = async () => {
    if (!canSendOtp) return;

    setLoading(true);
    setError("");
    setOtp("");
    setIsVerified(false);

    try {
      const newUserId = await sendPhoneOTP(fullPhone);
      setUserId(newUserId);
      setOtpSent(true);
      setStatusMessage("Se envio un nuevo codigo OTP.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al reenviar el codigo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSendOtp} className="flex flex-col gap-3.5">
      <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
        <h2 className="text-3xl font-bold text-[#0066CC] md:text-4xl">
          Registro por SMS
        </h2>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#0066CC]">
          Paso 1 de 5
        </span>
      </div>

      <p className="text-base leading-snug text-[#666666]">
        Ingresa tu telefono y confirma el codigo OTP para crear tu cuenta.
      </p>

      <label className="mt-1 text-sm font-medium text-[#666666]">
        Numero de telefono
      </label>
      <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-[170px_minmax(0,1fr)]">
        <select
          value={countryIso}
          onChange={(e) => setCountryIso(e.target.value as CountryCode)}
          disabled={otpSent}
          className="w-full rounded-xl border border-[#666666] bg-white px-3 py-[14px] text-base text-[#666666] outline-none focus:border-[#0066CC] disabled:cursor-not-allowed disabled:opacity-60"
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
            setPhoneDigits(e.target.value.replace(/\D/g, "").slice(0, 15))
          }
          disabled={otpSent}
          placeholder="88887777"
          className="w-full rounded-xl border border-[#666666] bg-white px-4 py-[14px] text-base text-[#666666] outline-none placeholder:text-[#666666] focus:border-[#0066CC] disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>

      {/* Boton enviar OTP */}
      <button
        type="submit"
        disabled={!canSendOtp || loading}
        className="mt-1 flex w-full items-center justify-center rounded-xl bg-[#CC3333] px-[18px] py-[14px] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="text-base font-semibold text-white">
          {loading && !otpSent ? "Enviando..." : otpSent ? "Reenviar OTP" : "Enviar OTP"}
        </span>
      </button>

      {/* Campo OTP — solo visible tras enviar */}
      {otpSent && (
        <>
          <label className="mt-1 text-sm font-medium text-[#666666]">
            Codigo OTP
          </label>
          <input
            type="text"
            value={otp}
            disabled={isVerified}
            onChange={(e) =>
              setOtp(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))
            }
            placeholder="123456"
            className="w-full rounded-xl border border-[#666666] bg-white px-4 py-[14px] text-base text-[#666666] outline-none placeholder:text-[#666666] focus:border-[#0066CC] disabled:bg-[#EFEDE8]"
          />

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={loading}
              className="text-sm font-semibold text-[#CC3333] disabled:opacity-50"
            >
              Reenviar codigo
            </button>
          </div>
        </>
      )}

      {error && <p className="text-xs text-[#CC3333]">{error}</p>}

      {/* Boton verificar OTP */}
      {otpSent && (
        <button
          type="button"
          onClick={handleVerifyOtp}
          disabled={!canVerifyOtp || loading || isVerified}
          className="flex w-full items-center justify-center rounded-xl bg-[#0066CC] px-[18px] py-[14px] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="text-base font-semibold text-white">
            {loading ? "Verificando..." : isVerified ? "Verificado" : "Verificar telefono"}
          </span>
        </button>
      )}

      <p className={`pt-0.5 text-center text-sm ${isVerified ? "text-[#4A6B52]" : "text-[#666666]"}`}>
        {statusMessage}
      </p>
    </form>
  );
}
