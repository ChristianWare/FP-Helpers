// components/shared/ConfirmDialog/ConfirmDialog.tsx
"use client";

import Modal from "@/components/shared/Modal/Modal";
import styles from "./ConfirmDialog.module.css";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirming?: boolean;
  icon?: string;
  variant?: "danger" | "default";
};

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Yes, remove it",
  cancelText = "Cancel",
  confirming = false,
  icon = "⚠️",
  variant = "danger",
}: Props) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className={styles.content}>
        <div className={styles.icon}>{icon}</div>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.message}>{message}</p>

        <div className={styles.actions}>
          <button
            type='button'
            className={styles.cancel}
            onClick={onClose}
            disabled={confirming}
          >
            {cancelText}
          </button>
          <button
            type='button'
            className={`${styles.confirm} ${variant === "danger" ? styles.danger : ""}`}
            onClick={onConfirm}
            disabled={confirming}
          >
            {confirming ? "Working..." : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
