export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}) {
  const centered = align === "center";

  return (
    <header className={centered ? "text-center" : ""}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2 className="mt-2 text-2xl sm:text-3xl">{title}</h2>
      <div
        className={`filete-left mt-3 ${centered ? "mx-auto" : ""}`}
        aria-hidden
      />
      {description && (
        <p
          className={`mt-3 max-w-prose text-sm text-muted ${centered ? "mx-auto" : ""}`}
        >
          {description}
        </p>
      )}
    </header>
  );
}
