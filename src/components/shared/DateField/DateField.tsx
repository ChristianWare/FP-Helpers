// components/shared/DateField/DateField.tsx
//
// A date input that opens the site's own calendar instead of the browser's
// default picker. Values are plain "YYYY-MM-DD" strings — exactly what the
// native <input type="date"> produced — so schemas, actions and the database
// are untouched.
//
// The calendar renders in a portal at the end of <body>, positioned from the
// field's measured viewport rect. That's deliberate: the wizard animates its
// steps with transforms, and a transformed ancestor both clips absolutely
// positioned children and hijacks position:fixed. On phones (≤560px) it
// becomes a centered sheet over a backdrop.
"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./DateField.module.css";

type Props = {
  id: string;
  /** "YYYY-MM-DD" or "" for empty. */
  value: string;
  onChange: (value: string) => void;
  /** Earliest / latest selectable day, as "YYYY-MM-DD". */
  min?: string;
  max?: string;
  hasError?: boolean;
  placeholder?: string;
};

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const CALENDAR_WIDTH = 302;

const isKey = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);
const toKey = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const todayKey = () => {
  const n = new Date();
  return toKey(n.getFullYear(), n.getMonth(), n.getDate());
};
const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

/** "Sun, Sep 20, 2026" — noon avoids any DST edge cases. */
function formatKey(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 12).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function monthTitle(y: number, m: number): string {
  return new Date(y, m, 1, 12).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

type Cell = { key: string; day: number; inMonth: boolean };

/** Full weeks covering the given month, padded with adjacent-month days. */
function buildGrid(y: number, m: number): Cell[] {
  const lead = new Date(y, m, 1).getDay();
  const dim = daysInMonth(y, m);
  const dimPrev = daysInMonth(m === 0 ? y - 1 : y, m === 0 ? 11 : m - 1);
  const cells: Cell[] = [];

  for (let i = lead - 1; i >= 0; i--) {
    const d = dimPrev - i;
    const yy = m === 0 ? y - 1 : y;
    const mm = m === 0 ? 11 : m - 1;
    cells.push({ key: toKey(yy, mm, d), day: d, inMonth: false });
  }
  for (let d = 1; d <= dim; d++) {
    cells.push({ key: toKey(y, m, d), day: d, inMonth: true });
  }
  while (cells.length % 7 !== 0) {
    const d = cells.length - lead - dim + 1;
    const yy = m === 11 ? y + 1 : y;
    const mm = m === 11 ? 0 : m + 1;
    cells.push({ key: toKey(yy, mm, d), day: d, inMonth: false });
  }
  return cells;
}

export default function DateField({
  id,
  value,
  onChange,
  min,
  max,
  hasError,
  placeholder = "Select a date",
}: Props) {
  const [open, setOpen] = useState(false);
  // The month currently shown: [year, monthIndex]
  const [view, setView] = useState<[number, number]>([2026, 0]);
  // Where to place the popover (viewport coordinates; desktop only)
  const [pos, setPos] = useState({ top: 0, left: 0 });
  // Below 560px the calendar becomes a centered sheet with a backdrop
  const [isPhone, setIsPhone] = useState(false);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);

  const today = todayKey();

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 560px)");
    const update = () => setIsPhone(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const placePopover = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const left = Math.max(
      12,
      Math.min(rect.left, window.innerWidth - CALENDAR_WIDTH - 12),
    );
    setPos({ top: rect.bottom + 6, left });
  };

  const openPicker = () => {
    // Start on the chosen month, else the earliest allowed, else today
    const from = isKey(value) ? value : min && min > today ? min : today;
    const [y, m] = from.split("-").map(Number);
    setView([y, m - 1]);
    placePopover();
    setOpen(true);
  };

  // Follow the field on scroll/resize; close on outside press (outside BOTH
  // the field and the calendar, since the calendar lives in a portal); close
  // on Escape and hand focus back to the field.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (popRef.current?.contains(t) || triggerRef.current?.contains(t)) {
        return;
      }
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onMove = () => placePopover();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open]);

  const [viewY, viewM] = view;
  const cells = open ? buildGrid(viewY, viewM) : [];

  const isDisabled = (key: string) =>
    Boolean((min && key < min) || (max && key > max));

  const pick = (key: string) => {
    onChange(key);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const prevMonth = () =>
    setView(viewM === 0 ? [viewY - 1, 11] : [viewY, viewM - 1]);
  const nextMonth = () =>
    setView(viewM === 11 ? [viewY + 1, 0] : [viewY, viewM + 1]);

  const todayAllowed = !isDisabled(today);

  const calendar = (
    <>
      {/* Dims the page behind the calendar on phones only */}
      <div className={styles.backdrop} onClick={() => setOpen(false)} />

      <div
        ref={popRef}
        className={styles.popover}
        style={isPhone ? undefined : { top: pos.top, left: pos.left }}
        role='dialog'
        aria-label='Choose a date'
      >
        <div className={styles.header}>
          <button
            type='button'
            className={styles.navBtn}
            aria-label='Previous month'
            onClick={prevMonth}
          >
            ←
          </button>
          <span className={styles.monthLabel}>{monthTitle(viewY, viewM)}</span>
          <button
            type='button'
            className={styles.navBtn}
            aria-label='Next month'
            onClick={nextMonth}
          >
            →
          </button>
        </div>

        <div className={styles.weekdays} aria-hidden='true'>
          {WEEKDAYS.map((w) => (
            <span key={w} className={styles.weekday}>
              {w}
            </span>
          ))}
        </div>

        <div className={styles.grid}>
          {cells.map((cell) => {
            const selected = cell.key === value;
            const disabled = isDisabled(cell.key);
            return (
              <button
                key={cell.key}
                type='button'
                className={[
                  styles.day,
                  cell.inMonth ? "" : styles.dayMuted,
                  cell.key === today ? styles.dayToday : "",
                  selected ? styles.daySelected : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                disabled={disabled}
                aria-label={formatKey(cell.key)}
                aria-current={cell.key === today ? "date" : undefined}
                onClick={() => pick(cell.key)}
              >
                {cell.day}
              </button>
            );
          })}
        </div>

        <div className={styles.footer}>
          <button
            type='button'
            className={styles.footBtn}
            onClick={() => {
              onChange("");
              setOpen(false);
              triggerRef.current?.focus();
            }}
          >
            Clear
          </button>
          <button
            type='button'
            className={styles.footBtn}
            disabled={!todayAllowed}
            onClick={() => pick(today)}
          >
            Today
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className={styles.wrap}>
      <button
        ref={triggerRef}
        type='button'
        id={id}
        className={`${styles.trigger} ${hasError ? styles.triggerError : ""}`}
        aria-haspopup='dialog'
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openPicker())}
      >
        <span className={isKey(value) ? styles.value : styles.placeholder}>
          {isKey(value) ? formatKey(value) : placeholder}
        </span>
        <svg
          className={styles.icon}
          width='18'
          height='18'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          strokeLinecap='round'
          aria-hidden='true'
        >
          <rect x='3' y='5' width='18' height='16' rx='2.5' />
          <path d='M3 10h18M8 3v4M16 3v4' />
        </svg>
      </button>

      {open && createPortal(calendar, document.body)}
    </div>
  );
}
