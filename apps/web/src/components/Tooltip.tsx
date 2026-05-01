'use client';

export function Tooltip({
  content,
  children,
}: {
  content: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="group relative inline-flex items-center">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-56 -translate-x-1/2 rounded border border-heliora-cyan/30 bg-heliora-dark px-3 py-2 text-[11px] leading-relaxed text-heliora-text shadow-lg group-hover:block">
        {content}
      </span>
    </span>
  );
}