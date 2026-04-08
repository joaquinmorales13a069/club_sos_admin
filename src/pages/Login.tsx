export default function LoginPage() {
  return (
    <main className="min-h-screen bg-white p-6">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-[1440px] gap-6 rounded-none bg-white">
        <div className="flex flex-1 flex-col justify-between gap-6 rounded-2xl border border-[#666666] bg-white p-12">
          <div className="w-fit rounded-full bg-[#CC3333] px-[14px] py-2">
            <p
              className="text-sm font-medium text-white"
              style={{ fontFamily: "Geist, sans-serif" }}
            >
              ClubSOS Admin
            </p>
          </div>

          <div className="space-y-6">
            <h1
              className="w-full text-[56px] leading-[1.05] font-bold text-[#0066CC]"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Bienvenido al panel de ClubSOS
            </h1>
            <p
              className="w-full text-[20px] leading-[1.35] text-[#666666]"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Gestiona afiliados, pagos y contenido del club desde un solo
              lugar, de forma segura y rapida.
            </p>
          </div>

          <div className="grid w-full grid-cols-2 gap-4">
            <article className="space-y-1.5 rounded-xl border border-[#666666] bg-white p-5">
              <p
                className="text-[30px] font-bold text-[#0066CC]"
                style={{ fontFamily: '"Geist Mono", monospace' }}
              >
                24/7
              </p>
              <p
                className="text-[13px] font-medium text-[#666666]"
                style={{ fontFamily: "Geist, sans-serif" }}
              >
                Disponibilidad
              </p>
            </article>

            <article className="space-y-1.5 rounded-xl border border-[#666666] bg-white p-5">
              <p
                className="text-[30px] font-bold text-[#0066CC]"
                style={{ fontFamily: '"Geist Mono", monospace' }}
              >
                100%
              </p>
              <p
                className="text-[13px] font-medium text-[#666666]"
                style={{ fontFamily: "Geist, sans-serif" }}
              >
                Canales seguros
              </p>
            </article>
          </div>
        </div>

        <div className="flex w-[520px] flex-col justify-center rounded-2xl bg-[#0066CC] p-9">
          <p
            className="mb-[211px] text-center text-2xl font-bold text-white"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            clubSOS
          </p>

          <form className="flex w-full flex-col gap-3.5 rounded-2xl bg-[#F5F3EE] p-[30px] shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
            <h2
              className="text-[32px] font-bold text-[#0066CC]"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Inicia sesion por SMS
            </h2>
            <p
              className="text-[15px] leading-[1.35] text-[#666666]"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Ingresa tu telefono para recibir un codigo OTP de acceso.
            </p>

            <label
              className="mt-1 text-sm font-medium text-[#666666]"
              style={{ fontFamily: "Geist, sans-serif" }}
            >
              Numero de telefono
            </label>
            <input
              type="tel"
              defaultValue="+52 55 1234 5678"
              className="w-full rounded-xl border border-[#666666] bg-white px-4 py-[14px] text-[15px] text-[#666666] outline-none placeholder:text-[#666666] focus:border-[#0066CC]"
              style={{ fontFamily: "Inter, sans-serif" }}
            />

            <label
              className="mt-1 text-sm font-medium text-[#666666]"
              style={{ fontFamily: "Geist, sans-serif" }}
            >
              Codigo OTP
            </label>
            <input
              type="text"
              defaultValue="123456"
              className="w-full rounded-xl border border-[#666666] bg-white px-4 py-[14px] text-[15px] text-[#666666] outline-none placeholder:text-[#666666] focus:border-[#0066CC]"
              style={{ fontFamily: "Inter, sans-serif" }}
            />

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <span className="h-[14px] w-[14px] rounded-full border-2 border-[#4A6B52]" />
                <p
                  className="text-[13px] font-medium text-[#4A6B52]"
                  style={{ fontFamily: "Geist, sans-serif" }}
                >
                  Confiar en este dispositivo
                </p>
              </div>
              <button
                type="button"
                className="text-[13px] font-semibold text-[#CC3333]"
                style={{ fontFamily: "Geist, sans-serif" }}
              >
                Reenviar codigo
              </button>
            </div>

            <button
              type="submit"
              className="flex w-full items-center justify-center rounded-xl bg-[#CC3333] px-[18px] py-[14px]"
            >
              <span
                className="text-base font-semibold text-white"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Enviar OTP
              </span>
            </button>

            <p
              className="pt-0.5 text-center text-[13px] text-[#666666]"
              style={{ fontFamily: "Geist, sans-serif" }}
            >
              Te enviaremos un SMS con un codigo de 6 digitos.
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
