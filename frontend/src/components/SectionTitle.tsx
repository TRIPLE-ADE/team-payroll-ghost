export function SectionTitle({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow ? (
          <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-lg font-semibold tracking-tight text-zinc-50">
          {title}
        </h1>
      </div>
      {children}
    </div>
  );
}
