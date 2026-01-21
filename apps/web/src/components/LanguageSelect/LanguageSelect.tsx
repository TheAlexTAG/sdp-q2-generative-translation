import { useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType, SVGProps } from "react";
import styles from "./LanguageSelect.module.css";
import {
  FlagChina,
  FlagFrance,
  FlagGermany,
  FlagItaly,
  FlagSaudi,
  FlagSpain,
  FlagUK,
} from "./flags";

export type LanguageCode = "it" | "en" | "fr" | "es" | "de" | "ar" | "zh";

type LangOption = {
  code: LanguageCode;
  label: string;
  secondary?: string;
  Flag: ComponentType<SVGProps<SVGSVGElement>>;
};

const OPTIONS: LangOption[] = [
  { code: "en", label: "English", secondary: "EN", Flag: FlagUK },
  { code: "it", label: "Italian", secondary: "Italiano", Flag: FlagItaly },
  { code: "fr", label: "French", secondary: "Français", Flag: FlagFrance },
  { code: "es", label: "Spanish", secondary: "Español", Flag: FlagSpain },
  { code: "de", label: "German", secondary: "Deutsch", Flag: FlagGermany },
  { code: "ar", label: "Arabic", secondary: "العربية", Flag: FlagSaudi },
  { code: "zh", label: "Chinese", secondary: "中文", Flag: FlagChina },
];

function CaretIcon() {
  return (
    <svg
      className={styles.caret}
      viewBox="0 0 10 10"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M2 3.5 5 6.6 8 3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LanguageSelect({
  value,
  onChange,
}: {
  value: LanguageCode;
  onChange: (next: LanguageCode) => void;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const selectedIndex = useMemo(() => {
    const idx = OPTIONS.findIndex((o) => o.code === value);
    return idx >= 0 ? idx : 0;
  }, [value]);

  const selected = OPTIONS[selectedIndex];

  useEffect(() => {
    if (!open) return;
    setActiveIndex(selectedIndex);
  }, [open, selectedIndex]);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      const t = e.target as Node | null;
      if (!t) return;
      if (!wrapRef.current?.contains(t)) setOpen(false);
    }

    function onDocKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onDocKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onDocKeyDown);
    };
  }, []);

  function selectIndex(idx: number) {
    const next = OPTIONS[idx];
    onChange(next.code);
    setOpen(false);
    buttonRef.current?.focus();
  }

  function onButtonKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
      return;
    }
  }

  function onMenuKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(OPTIONS.length - 1, i + 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
      return;
    }
    if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(OPTIONS.length - 1);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      selectIndex(activeIndex);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    }
  }

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.button}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onButtonKeyDown}
      >
        <selected.Flag />
        <span className={styles.currentText}>
          <span className={styles.currentName}>{selected.label}</span>
          <span className={styles.currentCode}>{selected.code.toUpperCase()}</span>
        </span>
        <CaretIcon />
      </button>

      {open ? (
        <div
          className={styles.menu}
          role="listbox"
          aria-label="Target language"
          tabIndex={-1}
          onKeyDown={onMenuKeyDown}
        >
          {OPTIONS.map((opt, idx) => (
            <button
              key={opt.code}
              type="button"
              className={styles.item}
              data-active={idx === activeIndex}
              data-selected={opt.code === value}
              onMouseEnter={() => setActiveIndex(idx)}
              onClick={() => selectIndex(idx)}
            >
              <opt.Flag />
              <div>
                <div>{opt.label}</div>
                <span className={styles.itemSmall}>{opt.code.toUpperCase()}</span>
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
