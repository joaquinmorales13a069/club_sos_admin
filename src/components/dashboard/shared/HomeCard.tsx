import type { ReactNode } from "react";

export function HomeCard({
    title,
    icon,
    children,
    className = "",
}: {
    title: string;
    icon: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    return (
        <article
            className={`flex flex-col rounded-2xl border border-[#E5E5E5] bg-white p-5 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)] ${className}`}
        >
            <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0066CC]/10 text-[#0066CC]">
                    {icon}
                </span>
                <h3 className="text-base font-semibold text-[#0066CC]">{title}</h3>
            </div>
            {children}
        </article>
    );
}
