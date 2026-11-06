import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Кнопка «?» с всплывающим пояснением. Открывается по клику (работает и на
 * сенсорных экранах), закрывается кликом мимо или Esc.
 */
export function InfoTip({
  children,
  title,
  align = "left",
}: {
  children: ReactNode;
  title?: string;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: globalThis.KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={ref} className="infotip">
      <button
        type="button"
        className={`infotip__btn ${open ? "is-open" : ""}`}
        aria-label={title ? `Пояснение: ${title}` : "Пояснение"}
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        ?
      </button>
      {open && (
        <span className={`infotip__pop infotip__pop--${align}`} role="tooltip">
          {title && <span className="infotip__title">{title}</span>}
          <span className="infotip__body">{children}</span>
        </span>
      )}
    </span>
  );
}
