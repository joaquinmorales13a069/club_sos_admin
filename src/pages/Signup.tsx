import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { CountryCode } from "libphonenumber-js";
import { Link } from "react-router-dom";
import {
    getCountries,
    getCountryCallingCode,
    parsePhoneNumberFromString,
} from "libphonenumber-js";
import logoSosMedical from "../assets/logo-sosmedical.webp";
import logoClubSos from "../assets/logo-clubSOS.webp";
import signupImagen from "../assets/signup-imagen.webp";

const OTP_LENGTH = 6;
const regionNames = new Intl.DisplayNames(["es"], { type: "region" });
const COUNTRY_CODES: { iso: CountryCode; code: string; label: string }[] =
    getCountries()
        .map((iso) => ({
            iso,
            code: `+${getCountryCallingCode(iso)}`,
            label: regionNames.of(iso) ?? iso,
        }))
        .sort((a, b) => a.label.localeCompare(b.label, "es"));

export default function SignupPage() {
    const [countryIso, setCountryIso] = useState<CountryCode>("NI");
    const [phoneDigits, setPhoneDigits] = useState("");
    const [otp, setOtp] = useState("");
    const [otpSent, setOtpSent] = useState(false);
    const [isVerified, setIsVerified] = useState(false);
    const [statusMessage, setStatusMessage] = useState(
        "Ingresa tu numero para enviarte un codigo OTP.",
    );

    const selectedCountry = useMemo(
        () =>
            COUNTRY_CODES.find((country) => country.iso === countryIso) ??
            COUNTRY_CODES[0],
        [countryIso],
    );
    const parsedPhone = useMemo(
        () => parsePhoneNumberFromString(phoneDigits, countryIso),
        [phoneDigits, countryIso],
    );
    const canSendOtp = Boolean(parsedPhone?.isValid());
    const canVerifyOtp = otp.length === OTP_LENGTH;

    const handleSendOtp = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!canSendOtp) {
            setStatusMessage("Ingresa un numero valido para continuar.");
            return;
        }

        setOtpSent(true);
        setIsVerified(false);
        setStatusMessage(
            `Codigo enviado por SMS a ${parsedPhone?.number ?? `${selectedCountry.code} ${phoneDigits}`}. Ingresa los 6 digitos para verificar.`,
        );
    };

    const handleVerifyOtp = (event: FormEvent<HTMLButtonElement>) => {
        event.preventDefault();
        if (!canVerifyOtp) {
            setStatusMessage("El codigo OTP debe tener 6 digitos.");
            return;
        }

        setIsVerified(true);
        setStatusMessage("Telefono verificado. Paso 1 de 4 completado.");
    };

    const handleResendOtp = () => {
        if (!canSendOtp) {
            setStatusMessage("Ingresa un numero valido antes de reenviar.");
            return;
        }

        setOtp("");
        setIsVerified(false);
        setOtpSent(true);
        setStatusMessage("Se envio un nuevo codigo OTP.");
    };

    return (
        <main className="min-h-screen bg-white p-4 md:p-6">
            <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 bg-white lg:min-h-[calc(100vh-3rem)] lg:flex-row lg:gap-6">
                <div className="flex flex-1 flex-col gap-5 rounded-2xl border border-[#666666] bg-white p-6 md:p-8 lg:w-[38%] lg:flex-none lg:p-8">
                    <div className="w-fit">
                        <img
                            src={logoSosMedical}
                            alt="ClubSOS Admin"
                            className="h-14 w-auto object-contain"
                        />
                    </div>

                    <div className="space-y-4 md:space-y-5 mt-4">
                        <h1
                            className="w-full text-4xl leading-[1.05] font-bold text-[#0066CC] md:text-3xl lg:text-4xl"
                            style={{ fontFamily: "Inter, sans-serif" }}
                        >
                            Crea tu cuenta en ClubSOS
                        </h1>
                        <p
                            className="w-full text-base leading-[1.35] text-[#666666] md:text-lg lg:text-xl"
                            style={{ fontFamily: "Inter, sans-serif" }}
                        >
                            Registra tu acceso de administrador con validacion
                            por SMS para operar de forma segura.
                        </p>
                        <img
                            src={signupImagen}
                            alt="Registro ClubSOS"
                            className="block w-full rounded-xl"
                        />
                    </div>
                </div>

                <div className="flex w-full flex-col justify-center rounded-2xl bg-[#0066CC] p-6 md:p-8 lg:w-[62%] lg:flex-none lg:p-9">
                    <form
                        onSubmit={handleSendOtp}
                        className="mx-auto flex w-full max-w-[600px] flex-col gap-3.5 rounded-2xl bg-[#F5F3EE] p-5 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)] md:p-6 lg:p-[30px]"
                    >
                        <img
                            src={logoClubSos}
                            alt="clubSOS"
                            className="mx-auto mb-3 h-20 w-auto object-contain"
                        />
                        <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
                            <h2
                                className="text-3xl font-bold text-[#0066CC] md:text-4xl"
                                style={{ fontFamily: "Inter, sans-serif" }}
                            >
                                Registro por SMS
                            </h2>
                            <span
                                className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#0066CC]"
                                style={{ fontFamily: "Geist, sans-serif" }}
                            >
                                Paso 1 de 4
                            </span>
                        </div>

                        <p
                            className="text-base leading-[1.35] text-[#666666]"
                            style={{ fontFamily: "Inter, sans-serif" }}
                        >
                            Primero ingresa tu telefono y luego confirma el
                            codigo OTP para crear tu cuenta.
                        </p>

                        <label
                            className="mt-1 text-sm font-medium text-[#666666]"
                            style={{ fontFamily: "Geist, sans-serif" }}
                        >
                            Numero de telefono
                        </label>
                        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-[170px_minmax(0,1fr)]">
                            <select
                                value={countryIso}
                                onChange={(event) =>
                                    setCountryIso(
                                        event.target.value as CountryCode,
                                    )
                                }
                                className="w-full rounded-xl border border-[#666666] bg-white px-3 py-[14px] text-base text-[#666666] outline-none focus:border-[#0066CC]"
                                style={{ fontFamily: "Inter, sans-serif" }}
                            >
                                {COUNTRY_CODES.map((country) => (
                                    <option
                                        key={country.iso}
                                        value={country.iso}
                                    >
                                        {country.label} ({country.code})
                                    </option>
                                ))}
                            </select>
                            <input
                                type="tel"
                                value={phoneDigits}
                                onChange={(event) =>
                                    setPhoneDigits(
                                        event.target.value
                                            .replace(/\D/g, "")
                                            .slice(0, 15),
                                    )
                                }
                                placeholder="88887777"
                                className="w-full rounded-xl border border-[#666666] bg-white px-4 py-[14px] text-base text-[#666666] outline-none placeholder:text-[#666666] focus:border-[#0066CC]"
                                style={{ fontFamily: "Inter, sans-serif" }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={!canSendOtp}
                            className="mt-1 flex w-full items-center justify-center rounded-xl bg-[#CC3333] px-[18px] py-[14px] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <span
                                className="text-base font-semibold text-white"
                                style={{ fontFamily: "Inter, sans-serif" }}
                            >
                                {otpSent ? "Reenviar OTP" : "Enviar OTP"}
                            </span>
                        </button>

                        <label
                            className="mt-1 text-sm font-medium text-[#666666]"
                            style={{ fontFamily: "Geist, sans-serif" }}
                        >
                            Codigo OTP
                        </label>
                        <input
                            type="text"
                            value={otp}
                            disabled={!otpSent}
                            onChange={(event) =>
                                setOtp(
                                    event.target.value
                                        .replace(/\D/g, "")
                                        .slice(0, OTP_LENGTH),
                                )
                            }
                            placeholder="123456"
                            className="w-full rounded-xl border border-[#666666] bg-white px-4 py-[14px] text-base text-[#666666] outline-none placeholder:text-[#666666] focus:border-[#0066CC] disabled:cursor-not-allowed disabled:bg-[#EFEDE8]"
                            style={{ fontFamily: "Inter, sans-serif" }}
                        />

                        <div className="flex justify-end pt-1">
                            <button
                                type="button"
                                onClick={handleResendOtp}
                                className="text-sm font-semibold text-[#CC3333]"
                                style={{ fontFamily: "Geist, sans-serif" }}
                            >
                                Reenviar codigo
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={handleVerifyOtp}
                            disabled={!otpSent || !canVerifyOtp}
                            className="flex w-full items-center justify-center rounded-xl bg-[#0066CC] px-[18px] py-[14px] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <span
                                className="text-base font-semibold text-white"
                                style={{ fontFamily: "Inter, sans-serif" }}
                            >
                                Verificar telefono
                            </span>
                        </button>

                        <p
                            className={`pt-0.5 text-center text-sm ${isVerified ? "text-[#4A6B52]" : "text-[#666666]"}`}
                            style={{ fontFamily: "Geist, sans-serif" }}
                        >
                            {statusMessage}
                        </p>
                        <p
                            className="text-center text-sm text-[#666666]"
                            style={{ fontFamily: "Geist, sans-serif" }}
                        >
                            Ya tienes cuenta?{" "}
                            <Link
                                to="/login"
                                className="font-semibold text-[#0066CC]"
                            >
                                Inicia sesion
                            </Link>
                        </p>
                    </form>
                </div>
            </section>
        </main>
    );
}
