/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useLayoutEffect, useRef, MouseEvent } from "react";
// import Close from "../icons/Close/Close";
import styles from "./Modal.module.css";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, children }: Props) {
  const scrollRef = useRef(0);
  const htmlPrev = useRef<string>("");
  const removeTouchBlockRef = useRef<() => void>(() => {});

  useLayoutEffect(() => {
    if (!isOpen) return;

    const html = document.documentElement;
    const root = document.scrollingElement || document.documentElement;

    // Save current scroll and previous inline styles (so we can restore exactly)
    scrollRef.current = root.scrollTop;
    htmlPrev.current = html.getAttribute("style") ?? "";

    // Lock page scroll WITHOUT using position:fixed (prevents jump-to-top)
    // Also keep layout stable when scrollbar disappears
    html.style.overflow = "hidden";
    (html.style as any).scrollbarGutter = "stable";

    // Extra safety on mobile: block touchmove on background
    const blockTouch = (e: TouchEvent) => {
      // allow scrolling inside the modal dialog itself
      const target = e.target as HTMLElement | null;
      const dialog = document.getElementById("app-modal-dialog");
      if (dialog && target && dialog.contains(target)) return;
      e.preventDefault();
    };
    document.addEventListener("touchmove", blockTouch, { passive: false });
    removeTouchBlockRef.current = () => {
      document.removeEventListener("touchmove", blockTouch as any);
    };

    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onEsc);

    return () => {
      window.removeEventListener("keydown", onEsc);
      removeTouchBlockRef.current?.();

      // Restore styles
      html.setAttribute("style", htmlPrev.current);
      // Restore scroll exactly where it was (paranoia guard)
      root.scrollTo({ top: scrollRef.current });
    };
  }, [isOpen, onClose]);

  const stop = (e: MouseEvent) => e.stopPropagation();

  return (
    <div
      className={`${styles.backdrop} ${isOpen ? styles.open : styles.closed}`}
      onClick={onClose}
      aria-hidden={!isOpen}
    >
      <div
        id='app-modal-dialog'
        className={`${styles.dialog} ${isOpen ? styles.open : styles.closed}`}
        onClick={stop}
        role='dialog'
        aria-modal='true'
      >
        <button
          onClick={onClose}
          className={styles.closeBtn}
          aria-label='Close modal'
        >
          {/* <Close className={styles.icon} /> */}
        </button>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
