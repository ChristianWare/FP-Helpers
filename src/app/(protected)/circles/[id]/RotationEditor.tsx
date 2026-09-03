// app/(protected)/circles/[id]/RotationEditor.tsx
//
// Renders the rotation list. For admins, a "Change rotation" button turns
// on edit mode: drag one helper's row onto another date (or tap a row,
// then tap the destination — works on phones) to propose a swap of the
// two assignments. A confirmation modal spells out exactly who moves
// where before anything is saved. One change at a time by design.
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import styles from "./RotationEditor.module.css";
import Modal from "@/components/shared/Modal/Modal";
import { formatShiftDate } from "@/lib/shifts/formatShift";
import { swapRotationAssignments } from "@/actions/shifts/swapRotationAssignments";

type RotationShift = {
  id: string;
  scheduledDate: string;
  status: string;
  completedAt: string | null;
  assignedUser: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
};

type Props = {
  circleId: string;
  currentUserId: string;
  isAdmin: boolean;
  rotationShifts: RotationShift[];
};

function exactDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}

function friendlyDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function helperName(shift: RotationShift): string {
  if (!shift.assignedUser) return "Unassigned";
  return `${shift.assignedUser.firstName} ${shift.assignedUser.lastName}`;
}

export default function RotationEditor({
  circleId,
  currentUserId,
  isAdmin,
  rotationShifts,
}: Props) {
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Drag state (desktop)
  const [dragShiftId, setDragShiftId] = useState<string | null>(null);
  const [dragOverShiftId, setDragOverShiftId] = useState<string | null>(null);

  // Tap-to-select state (mobile fallback, also works with a mouse)
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);

  // The single proposed change awaiting confirmation
  const [pendingSwap, setPendingSwap] = useState<{
    source: RotationShift;
    target: RotationShift;
  } | null>(null);

  /** Only upcoming, untouched, assigned shifts can be moved. */
  const canMove = (shift: RotationShift) =>
    shift.status === "SCHEDULED" && !!shift.assignedUser;

  const byId = (id: string | null) =>
    rotationShifts.find((s) => s.id === id) ?? null;

  const clearDragState = () => {
    setDragShiftId(null);
    setDragOverShiftId(null);
  };

  const exitEditMode = () => {
    setEditing(false);
    setSelectedShiftId(null);
    clearDragState();
    setPendingSwap(null);
  };

  const proposeSwap = (sourceId: string, targetId: string) => {
    const source = byId(sourceId);
    const target = byId(targetId);
    if (!source || !target || source.id === target.id) return;
    if (!canMove(source) || !canMove(target)) return;
    if (source.assignedUser!.id === target.assignedUser!.id) {
      toast("Same helper on both dates — nothing to change", { icon: "🤷" });
      return;
    }
    setPendingSwap({ source, target });
  };

  // ——— Drag handlers ———

  const onDragStart = (e: React.DragEvent, shift: RotationShift) => {
    if (!canMove(shift)) {
      e.preventDefault();
      return;
    }
    setDragShiftId(shift.id);
    setSelectedShiftId(null);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", shift.id); // Firefox needs data set
  };

  const onDragOver = (e: React.DragEvent, shift: RotationShift) => {
    if (!dragShiftId || dragShiftId === shift.id || !canMove(shift)) return;
    e.preventDefault(); // required to allow dropping
    e.dataTransfer.dropEffect = "move";
    if (dragOverShiftId !== shift.id) setDragOverShiftId(shift.id);
  };

  const onDragLeave = (shift: RotationShift) => {
    if (dragOverShiftId === shift.id) setDragOverShiftId(null);
  };

  const onDrop = (e: React.DragEvent, shift: RotationShift) => {
    e.preventDefault();
    const sourceId = dragShiftId ?? e.dataTransfer.getData("text/plain");
    clearDragState();
    if (sourceId) proposeSwap(sourceId, shift.id);
  };

  // ——— Tap-to-select fallback ———

  const onRowTap = (shift: RotationShift) => {
    if (!canMove(shift)) return;

    if (!selectedShiftId) {
      setSelectedShiftId(shift.id);
      return;
    }
    if (selectedShiftId === shift.id) {
      setSelectedShiftId(null); // tap again to deselect
      return;
    }
    proposeSwap(selectedShiftId, shift.id);
  };

  // ——— Confirm / cancel ———

  const confirmSwap = async () => {
    if (!pendingSwap || saving) return;
    setSaving(true);

    const result = await swapRotationAssignments(
      circleId,
      pendingSwap.source.id,
      pendingSwap.target.id,
    );

    setSaving(false);

    if (result.success) {
      toast.success("Rotation updated");
      exitEditMode();
      router.refresh();
    } else {
      toast.error(result.error || "Failed to update the rotation");
      setPendingSwap(null); // stay in edit mode so they can retry
      setSelectedShiftId(null);
    }
  };

  const cancelSwap = () => {
    if (saving) return;
    setPendingSwap(null);
    setSelectedShiftId(null);
  };

  // ——— Render ———

  return (
    <div>
      {isAdmin && (
        <div className={styles.toolbar}>
          {editing ? (
            <>
              <p className={styles.hint}>
                Drag a helper onto another date — or tap one, then tap where
                they should go. You&apos;ll confirm before anything changes.
              </p>
              <button
                type='button'
                className={styles.doneBtn}
                onClick={exitEditMode}
              >
                Done
              </button>
            </>
          ) : (
            <button
              type='button'
              className={styles.changeBtn}
              onClick={() => setEditing(true)}
            >
              Change rotation
            </button>
          )}
        </div>
      )}

      <div className={styles.rotationList}>
        {rotationShifts.map((s) => {
          const isMine = s.assignedUser?.id === currentUserId;
          const isComplete = s.status === "COMPLETED";
          const movable = editing && canMove(s);
          const isDragging = dragShiftId === s.id;
          const isDropTarget = dragOverShiftId === s.id;
          const isSelected = selectedShiftId === s.id;

          const rowClass = [
            styles.rotationRow,
            isMine ? styles.rotationRowMine : "",
            isComplete ? styles.rotationRowCompleted : "",
            isComplete && isMine ? styles.rotationRowMineCompleted : "",
            movable ? styles.rowMovable : "",
            editing && !movable ? styles.rowLocked : "",
            isDragging ? styles.rowDragging : "",
            isDropTarget ? styles.rowDropTarget : "",
            isSelected ? styles.rowSelected : "",
          ]
            .filter(Boolean)
            .join(" ");

          const rowContent = (
            <>
              {movable && (
                <span className={styles.dragHandle} aria-hidden='true'>
                  ⠿
                </span>
              )}
              <div className={styles.rotationDate}>
                <span className={styles.rotationDateMain}>
                  {formatShiftDate(new Date(s.scheduledDate))}
                </span>
                <span className={styles.rotationDateFull}>
                  {exactDate(s.scheduledDate)}
                </span>
              </div>
              <div className={styles.rotationHelper}>
                {s.assignedUser ? (
                  <>
                    <span className={styles.rotationHelperName}>
                      {s.assignedUser.firstName} {s.assignedUser.lastName}
                    </span>
                    {isComplete ? (
                      <span className={styles.completedBadge}>✓ Complete</span>
                    ) : isMine ? (
                      <span className={styles.rotationMinePill}>You</span>
                    ) : null}
                  </>
                ) : (
                  <span className={styles.rotationUnassigned}>
                    Not yet assigned
                  </span>
                )}
              </div>
              {isSelected && (
                <span className={styles.selectedTag}>Moving — tap a date</span>
              )}
            </>
          );

          // View mode: rows stay links to the shift page, exactly as before
          if (!editing) {
            return (
              <Link
                key={s.id}
                href={`/circles/${circleId}/shifts/${s.id}`}
                className={rowClass}
              >
                {rowContent}
              </Link>
            );
          }

          // Edit mode: rows are drag/tap targets, not links
          return (
            <div
              key={s.id}
              className={rowClass}
              role='button'
              tabIndex={movable ? 0 : -1}
              aria-label={
                movable
                  ? `Move ${helperName(s)}, ${friendlyDate(s.scheduledDate)}`
                  : undefined
              }
              draggable={movable}
              onDragStart={(e) => onDragStart(e, s)}
              onDragOver={(e) => onDragOver(e, s)}
              onDragLeave={() => onDragLeave(s)}
              onDrop={(e) => onDrop(e, s)}
              onDragEnd={clearDragState}
              onClick={() => onRowTap(s)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onRowTap(s);
                }
              }}
            >
              {rowContent}
            </div>
          );
        })}
      </div>

      {/* Confirmation modal — one change at a time */}
      <Modal isOpen={pendingSwap !== null} onClose={cancelSwap}>
        {pendingSwap && (
          <div className={styles.modalContent}>
            <div className={styles.modalIcon}>🔁</div>
            <h2 className={styles.modalTitle}>Change the rotation?</h2>
            <p className={styles.modalMessage}>
              These two helpers will trade dates:
            </p>

            <div className={styles.swapPreview}>
              <div className={styles.swapRow}>
                <span className={styles.swapName}>
                  {helperName(pendingSwap.source)}
                </span>
                <span className={styles.swapDates}>
                  {friendlyDate(pendingSwap.source.scheduledDate)}
                  <span className={styles.swapArrow}>→</span>
                  {friendlyDate(pendingSwap.target.scheduledDate)}
                </span>
              </div>
              <div className={styles.swapRow}>
                <span className={styles.swapName}>
                  {helperName(pendingSwap.target)}
                </span>
                <span className={styles.swapDates}>
                  {friendlyDate(pendingSwap.target.scheduledDate)}
                  <span className={styles.swapArrow}>→</span>
                  {friendlyDate(pendingSwap.source.scheduledDate)}
                </span>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button
                type='button'
                className={styles.modalCancel}
                onClick={cancelSwap}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type='button'
                className={styles.modalConfirm}
                onClick={confirmSwap}
                disabled={saving}
              >
                {saving ? "Saving..." : "Yes, swap them"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
