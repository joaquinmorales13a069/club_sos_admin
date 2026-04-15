export function SectionPlaceholder({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <section className="rounded-2xl border border-[#E5E5E5] bg-white p-8 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
            <h2 className="text-xl font-semibold text-[#0066CC]">{title}</h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#666666]">
                {description}
            </p>
            <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-[#666666]/70">
                Próximamente
            </p>
        </section>
    );
}
