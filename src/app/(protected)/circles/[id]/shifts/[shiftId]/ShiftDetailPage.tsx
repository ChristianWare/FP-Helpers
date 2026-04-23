/* eslint-disable @typescript-eslint/no-unused-vars */
// app/(protected)/circles/[id]/shifts/[shiftId]/ShiftDetailPage.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import Link from "next/link";
import toast from "react-hot-toast";
import styles from "./ShiftDetailPage.module.css";
import { formatPhone } from "@/lib/format";
import { formatShiftFullDate } from "@/lib/shifts/formatShift";
import { togglePurchased } from "@/actions/shifts/togglePurchased";
import { markShiftComplete } from "@/actions/shifts/markShiftComplete";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import ConfirmDialog from "@/components/shared/ConfirmDialog/ConfirmDialog";

type GroceryItem = {
  id: string;
  name: string;
  quantity: string | null;
  notes: string | null;
  status: string;
  addedBy: string | null;
};

type Prescription = {
  id: string;
  medicationName: string;
  pharmacyName: string | null;
  pharmacyPhone: string | null;
  pharmacyAddress: string | null;
  notes: string | null;
};

type Props = {
  currentUserName: string;
  currentUserEmail: string;
  isAssignedHelper: boolean;
  shift: {
    id: string;
    scheduledDate: string;
    status: string;
    completedAt: string | null;
    assignedUser: {
      id: string;
      firstName: string;
      lastName: string;
      phone: string;
    } | null;
  };
  circle: {
    id: string;
    name: string;
    address: string | null;
    accessNotes: string | null;
    typicalArrivalTime: string | null;
    emergencyContact: string | null;
    emergencyPhone: string | null;
  };
  recipient: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
  } | null;
  groceryItems: GroceryItem[];
  prescriptions: Prescription[];
};

export default function ShiftDetailPage({
  currentUserName,
  currentUserEmail,
  isAssignedHelper,
  shift,
  circle,
  recipient,
  groceryItems,
  prescriptions,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Optimistic tick state — keeps checkboxes snappy
  const [tickingItemIds, setTickingItemIds] = useState<Set<string>>(new Set());
  const [showConfirmComplete, setShowConfirmComplete] = useState(false);
  const [completing, setCompleting] = useState(false);

  const isComplete = shift.status === "COMPLETED";
  const purchasedItems = groceryItems.filter((i) => i.status === "PURCHASED");
  const pendingItems = groceryItems.filter(
    (i) => i.status === "PENDING" || i.status === "ASSIGNED",
  );
  const allDone = groceryItems.length > 0 && pendingItems.length === 0;

  const mapsUrl = circle.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(circle.address)}`
    : null;

  // ——— Toggle item ———

  const handleToggle = async (itemId: string) => {
    if (!isAssignedHelper || isComplete) return;

    setTickingItemIds((prev) => new Set(prev).add(itemId));

    const result = await togglePurchased(itemId);

    if (!result.success && result.error) {
      toast.error(result.error);
    }

    setTickingItemIds((prev) => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });

    startTransition(() => router.refresh());
  };

  // ——— Mark all complete ———

  const handleMarkComplete = async () => {
    setCompleting(true);

    const result = await markShiftComplete(shift.id);

    if (result.success) {
      toast.success("Shift complete — nice work!");
      setShowConfirmComplete(false);
      startTransition(() => router.refresh());
    } else if (result.error) {
      toast.error(result.error);
    }

    setCompleting(false);
  };

  return (
    <section className={styles.container}>
      <div className={styles.content}>
        <LayoutWrapper>
          <header className={styles.header}>
            <div>
              <Link
                href={`/circles/${circle.id}`}
                className={styles.backLink}
              >
                ← {circle.name}
              </Link>
              <h1 className={styles.title}>Hi {currentUserName}</h1>
            </div>
            <div className={styles.accountInfo}>
              <button
                type='button'
                className={styles.signOutBtn}
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                Sign out
              </button>
              <p className={styles.userEmail}>{currentUserEmail}</p>
            </div>
          </header>

          <div className={styles.subtitle}>
            <SectionHeading
              title={`Your shift${recipient ? ` for ${recipient.firstName} ${recipient.lastName}` : ""}`}
              color='black'
              dotColor='purpleDot'
            />
          </div>

          {/* Shift banner — purple, matches Harold's "This Week" banner */}
          <section className={styles.shiftBanner}>
            <h2 className={styles.shiftBannerTitle}>
              {isComplete
                ? "Shift complete"
                : isAssignedHelper
                  ? "You're shopping"
                  : `${shift.assignedUser?.firstName ?? "Someone"} is shopping`}
            </h2>
            <p className={styles.shiftBannerDate}>
              {formatShiftFullDate(new Date(shift.scheduledDate))}
              {circle.typicalArrivalTime && ` · ${circle.typicalArrivalTime}`}
            </p>
            {recipient && (
              <a
                href={`tel:${recipient.phone}`}
                className={styles.shiftBannerPhone}
              >
                Call {recipient.firstName}: {formatPhone(recipient.phone)}
              </a>
            )}
          </section>

          {/* Address + access info */}
          {(circle.address || circle.accessNotes) && (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Where to drop off</h2>
              </div>
              {circle.address && (
                <div className={styles.addressBlock}>
                  <p className={styles.addressText}>{circle.address}</p>
                  {mapsUrl && (
                    <a
                      href={mapsUrl}
                      target='_blank'
                      rel='noopener noreferrer'
                      className={styles.mapsLink}
                    >
                      Open in Maps →
                    </a>
                  )}
                </div>
              )}
              {circle.accessNotes && (
                <div className={styles.notesBlock}>
                  <p className={styles.notesLabel}>Notes</p>
                  <p className={styles.notesText}>{circle.accessNotes}</p>
                </div>
              )}
            </section>
          )}

          {/* Grocery list with checkboxes */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>The list</h2>
              <span className={styles.itemCount}>
                {purchasedItems.length} / {groceryItems.length}{" "}
                {groceryItems.length === 1 ? "item" : "items"}
              </span>
            </div>

            {groceryItems.length === 0 ? (
              <p className={styles.emptyText}>
                Nothing on the list yet. {recipient?.firstName ?? "The recipient"}{" "}
                hasn&apos;t added anything for this shift.
              </p>
            ) : (
              <div className={styles.itemList}>
                {groceryItems.map((item) => {
                  const isPurchased = item.status === "PURCHASED";
                  const isTicking = tickingItemIds.has(item.id);
                  return (
                    <label
                      key={item.id}
                      className={`${styles.itemRow} ${isPurchased ? styles.itemRowPurchased : ""} ${!isAssignedHelper || isComplete ? styles.itemRowReadonly : ""}`}
                    >
                      <input
                        type='checkbox'
                        className={styles.checkbox}
                        checked={isPurchased}
                        disabled={!isAssignedHelper || isComplete || isTicking}
                        onChange={() => handleToggle(item.id)}
                      />
                      <div className={styles.itemInfo}>
                        <p
                          className={`${styles.itemName} ${isPurchased ? styles.struck : ""}`}
                        >
                          {item.name}
                          {item.quantity && (
                            <span className={styles.itemQty}>
                              {" "}
                              × {item.quantity}
                            </span>
                          )}
                        </p>
                        {item.notes && (
                          <p
                            className={`${styles.itemMeta} ${isPurchased ? styles.struck : ""}`}
                          >
                            {item.notes}
                          </p>
                        )}
                        {item.addedBy && (
                          <p className={styles.itemAddedBy}>
                            Added by {item.addedBy}
                          </p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            {/* Mark complete button — only for the assigned helper, only if not already done */}
            {isAssignedHelper && !isComplete && groceryItems.length > 0 && (
              <button
                type='button'
                className={styles.completeBtn}
                onClick={() => setShowConfirmComplete(true)}
                disabled={completing}
              >
                {allDone ? "Mark shift complete" : "Mark all as picked up"}
              </button>
            )}

            {isComplete && shift.completedAt && (
              <p className={styles.completedNote}>
                Completed on {formatShiftFullDate(new Date(shift.completedAt))}.
              </p>
            )}
          </section>

          {/* Prescriptions — reference only */}
          {prescriptions.length > 0 && (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                  Prescriptions (for reference)
                </h2>
              </div>
              <p className={styles.sectionSubtitle}>
                These are {recipient?.firstName ?? "the recipient"}&apos;s
                ongoing medications. Check with them before picking up — they
                may or may not need refills this week.
              </p>
              <div className={styles.rxList}>
                {prescriptions.map((rx) => (
                  <div key={rx.id} className={styles.rxCard}>
                    <p className={styles.rxName}>{rx.medicationName}</p>
                    {rx.pharmacyName && (
                      <p className={styles.rxPharmacy}>
                        {rx.pharmacyName}
                        {rx.pharmacyPhone && (
                          <>
                            {" · "}
                            <a
                              href={`tel:${rx.pharmacyPhone}`}
                              className={styles.rxPhone}
                            >
                              {formatPhone(rx.pharmacyPhone)}
                            </a>
                          </>
                        )}
                      </p>
                    )}
                    {rx.pharmacyAddress && (
                      <p className={styles.rxMeta}>{rx.pharmacyAddress}</p>
                    )}
                    {rx.notes && <p className={styles.rxMeta}>{rx.notes}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Emergency contact */}
          {(circle.emergencyContact || circle.emergencyPhone) && (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>In case of emergency</h2>
              </div>
              <div className={styles.emergencyBlock}>
                {circle.emergencyContact && (
                  <p className={styles.emergencyName}>
                    {circle.emergencyContact}
                  </p>
                )}
                {circle.emergencyPhone && (
                  <a
                    href={`tel:${circle.emergencyPhone}`}
                    className={styles.emergencyPhone}
                  >
                    {formatPhone(circle.emergencyPhone)}
                  </a>
                )}
              </div>
            </section>
          )}
        </LayoutWrapper>
      </div>

      <ConfirmDialog
        isOpen={showConfirmComplete}
        onClose={() => setShowConfirmComplete(false)}
        onConfirm={handleMarkComplete}
        title='Mark shift complete?'
        message={
          allDone
            ? `This will close out your shift for ${recipient?.firstName ?? "this circle"}. Nice work!`
            : `${pendingItems.length} ${pendingItems.length === 1 ? "item is" : "items are"} still unchecked. Marking complete will check them all off and close this shift.`
        }
        confirmText='Yes, mark complete'
        variant='default'
        confirming={completing}
      />
    </section>
  );
}