// components/swaps/RequestSwapModal.tsx
"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import styles from "./RequestSwapModal.module.css";
import { requestSwap } from "@/actions/swaps/requestSwap";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  shiftId: string;
  shiftDateLabel: string; // e.g. "Saturday, May 1"
  otherHelperCount: number;
};

export default function RequestSwapModal({
  isOpen,
  onClose,
  onSuccess,
  shiftId,
  shiftDateLabel,
  otherHelperCount,
}: Props) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setSubmitting(true);

    const result = await requestSwap({
      shiftId,
      reason: reason.trim() || undefined,
    });

    if (result.success) {
      const count = result.recipientsNotified;
      toast.success(
        count > 0
          ? `Request sent to ${count} ${count === 1 ? "helper" : "helpers"}`
          : "Request created",
      );
      setReason("");
      onSuccess();
    } else {
      toast.error(result.error);
    }

    setSubmitting(false);
  };

  const handleClose = () => {
    if (submitting) return;
    setReason("");
    onClose();
  };

  return (
    <div
      className={styles.overlay}
      onClick={handleClose}
      role='dialog'
      aria-modal='true'
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>Ask someone to cover</h2>
        <p className={styles.subtitle}>
          This sends an email to the other {otherHelperCount}{" "}
          {otherHelperCount === 1 ? "helper" : "helpers"} in the rotation. The
          first person to claim it takes over your shift on{" "}
          <strong>{shiftDateLabel}</strong>.
        </p>

        <div className={styles.field}>
          <label className={styles.label} htmlFor='swap-reason'>
            Anything to add? (optional)
          </label>
          <textarea
            id='swap-reason'
            className={styles.textarea}
            placeholder='e.g. "Out of town for a wedding, sorry for the short notice!"'
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            rows={3}
          />
          <p className={styles.hint}>
            {reason.length > 0 && `${reason.length}/500 · `}
            Helps people understand the context, but not required.
          </p>
        </div>

        <div className={styles.actions}>
          <button
            type='button'
            className={styles.cancelBtn}
            onClick={handleClose}
            disabled={submitting}
          >
            Never mind
          </button>
          <button
            type='button'
            className={styles.submitBtn}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "Sending..." : "Send request"}
          </button>
        </div>
      </div>
    </div>
  );
}
