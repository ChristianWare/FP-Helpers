// components/circles/DeleteCircleButton.tsx
"use client";

import styles from "./DeleteCircleButton.module.css";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteCircle } from "@/actions/circles/deleteCircle";
import Modal from "@/components/shared/Modal/Modal";
import toast from "react-hot-toast";

type Props = {
  circleId: string;
  circleName: string;
};

export default function DeleteCircleButton({ circleId, circleName }: Props) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);

    const result = await deleteCircle(circleId);

    if (result.error) {
      setError(result.error);
      toast.error(result.error);
      setDeleting(false);
      return;
    }

    toast.success(`${circleName} was deleted`);
    setShowConfirm(false);
    router.replace("/dashboard");
    router.refresh();
  };

  return (
    <>
      <button
        type='button'
        className={styles.deleteBtn}
        onClick={() => setShowConfirm(true)}
      >
        Delete this circle
      </button>

      <Modal isOpen={showConfirm} onClose={() => setShowConfirm(false)}>
        <div className={styles.modalContent}>
          <div className={styles.modalIcon}>⚠️</div>
          <h2 className={styles.modalTitle}>Delete {circleName}?</h2>
          <p className={styles.modalText}>
            This will permanently remove the circle, all grocery lists,
            prescriptions, shift history, and member connections. This cannot be
            undone.
          </p>

          {error && (
            <div className={styles.modalError}>
              <span>{error}</span>
            </div>
          )}

          <div className={styles.modalActions}>
            <button
              type='button'
              className={styles.modalCancel}
              onClick={() => setShowConfirm(false)}
              disabled={deleting}
            >
              Cancel
            </button>
            <button
              type='button'
              className={styles.modalConfirm}
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Yes, delete it"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
