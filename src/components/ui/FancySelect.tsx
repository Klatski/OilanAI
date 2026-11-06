import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export interface FancyOption<V extends string | number> {
  value: V;
  label: ReactNode;
  /** Цвет точки слева (роль варианта, акцент предмета). */
  dot?: string;
  /** Короткое пояснение под пунктом в раскрытом списке. */
  hint?: string;
}

interface Props<V extends string | number> {
  value: V;
  options: FancyOption<V>[];
  onChange: (v: V) => void;
  className?: string;
  ariaLabel?: string;
}

/**
 * Выпадающий список в стиле приложения (вместо системного <select>,
 * который на Windows рисуется белым и не красится CSS).
 * Клавиатура: ↑/↓, Home/End, Enter/Space — выбрать, Esc — закрыть.
 */
export function FancySelect<V extends string | number>({
  value,
  options,
  onChange,
  className = "",
  ariaLabel,
}: Props<V>) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value)
  );
  const selected = options[selectedIndex];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    rootRef.current
      ?.querySelector<HTMLElement>(`[data-idx="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const openList = () => {
    setActive(selectedIndex);
    setOpen(true);
  };

  const pick = (i: number) => {
    const o = options[i];
    if (o) onChange(o.value);
    setOpen(false);
  };

  const onKey = (e: KeyboardEvent) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(options.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(options.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pick(active);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={`fsel ${open ? "fsel--open" : ""} ${className}`}>
      <button
        type="button"
        className="fsel__button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKey}
      >
        {selected?.dot && <span className="fsel__dot" style={{ background: selected.dot }} />}
        <span className="fsel__value">{selected?.label}</span>
        <svg className="fsel__chevron" width="12" height="12" viewBox="0 0 12 12" aria-hidden>
          <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <ul className="fsel__list" role="listbox" id={listId}>
          {options.map((o, i) => (
            <li
              key={String(o.value)}
              data-idx={i}
              role="option"
              aria-selected={i === selectedIndex}
              className={`fsel__option ${i === active ? "is-active" : ""} ${
                i === selectedIndex ? "is-selected" : ""
              }`}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(i)}
            >
              {o.dot && <span className="fsel__dot" style={{ background: o.dot }} />}
              <span className="fsel__option-body">
                <span className="fsel__option-label">{o.label}</span>
                {o.hint && <span className="fsel__option-hint">{o.hint}</span>}
              </span>
              {i === selectedIndex && (
                <svg className="fsel__check" width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                  <path d="m3 7.5 2.6 2.5L11 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
