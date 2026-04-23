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
import { sendTestReminder } from "@/actions/shifts/sendTestReminder";
import { cancelSwap } from "@/actions/swaps/cancelSwap";
import { claimSwap } from "@/actions/swaps/claimSwap";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import ConfirmDialog from "@/components/shared/ConfirmDialog/ConfirmDialog";
import RequestSwapModal from "@/components/swaps/RequestSwapModal";

// ——— Helpers for the notifications section ———

function labelForTemplate(template: string): string {
  if (template === "shift_reminder_t7") return "7-day reminder";
  if (template === "shift_reminder_t2") return "2-day reminder";
  if (template === "shift_reminder_t1") return "Day-before reminder";
  if (template.startsWith("swap_request_")) return "Swap request sent";
  if (template.startsWith("swap_claimed_requester_"))
    return "Swap confirmed (to requester)";
  if (template.startsWith("swap_claimed_claimer_"))
    return "Swap confirmed (to claimer)";
  return template;
}

function formatNotificationDate(date: Date): string {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  if (isToday) return `today at ${timeStr}`;
  if (isYesterday) return `yesterday at ${timeStr}`;

  return (
    date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    }) + ` at ${timeStr}`
  );
}

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

type NotificationEntry = {
  id: string;
  template: string;
  channel: string;
  status: string;
  sentAt: string | null;
  createdAt: string;
  error: string | null;
};

type OpenSwapRequest = {
  id: string;
  reason: string | null;
  createdAt: string;
  requestedBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
};

type Props = {
  currentUserId: string;
  currentUserName: string;
  currentUserEmail: string;
  isAssignedHelper: boolean;
  isEligibleClaimer: boolean;
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
  notifications: NotificationEntry[];
  otherHelperCount: number;
  openSwapRequest: OpenSwapRequest | null;
};

export default function ShiftDetailPage({
  currentUserId,
  currentUserName,
  currentUserEmail,
  isAssignedHelper,
  isEligibleClaimer,
  shift,
  circle,
  recipient,
  groceryItems,
  prescriptions,
  notifications,
  otherHelperCount,
  openSwapRequest,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [tickingItemIds, setTickingItemIds] = useState<Set<string>>(new Set());
  const [showConfirmComplete, setShowConfirmComplete] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [cancellingSwap, setCancellingSwap] = useState(false);
  const [showConfirmClaim, setShowConfirmClaim] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const isComplete = shift.status === "COMPLETED";
  const purchasedItems = groceryItems.filter((i) => i.status === "PURCHASED");
  const pendingItems = groceryItems.filter(
    (i) => i.status === "PENDING" || i.status === "ASSIGNED",
  );
  const allDone = groceryItems.length > 0 && pendingItems.length === 0;

  const mapsUrl = circle.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(circle.address)}`
    : null;

  // Swap states
  const hasOpenSwap = !!openSwapRequest;
  const swapIsMine = openSwapRequest?.requestedBy.id === currentUserId;
  const canClaimSwap =
    hasOpenSwap && isEligibleClaimer && !swapIsMine && !isComplete;

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

  // ——— Test reminder ———

  const handleSendTestReminder = async (daysBefore: 7 | 2 | 1) => {
    setSendingTest(true);
    const result = await sendTestReminder({ shiftId: shift.id, daysBefore });

    if (result.success) {
      toast.success("Test reminder sent — check your inbox");
      startTransition(() => router.refresh());
    } else if (result.error) {
      toast.error(result.error);
    }

    setSendingTest(false);
  };

  // ——— Cancel swap ———

  const handleCancelSwap = async () => {
    if (!openSwapRequest) return;
    setCancellingSwap(true);

    const result = await cancelSwap({ swapRequestId: openSwapRequest.id });

    if (result.success) {
      toast.success("Swap request cancelled");
      startTransition(() => router.refresh());
    } else if (result.error) {
      toast.error(result.error);
    }

    setCancellingSwap(false);
  };

  // ——— Claim swap ———

  const handleClaimSwap = async () => {
    if (!openSwapRequest) return;
    setClaiming(true);

    const result = await claimSwap({ swapRequestId: openSwapRequest.id });

    if (result.success) {
      toast.success("Shift claimed — check your email for details");
      setShowConfirmClaim(false);
      startTransition(() => router.refresh());
    } else {
      toast.error(result.error);
      setShowConfirmClaim(false);
      // If it was already claimed, refresh so UI updates
      if (result.alreadyClaimed) {
        startTransition(() => router.refresh());
      }
    }

    setClaiming(false);
  };

  return (
    <section className={styles.container}>
      <div className={styles.content}>
        <LayoutWrapper>
          <header className={styles.header}>
            <div>
              <Link href={`/circles/${circle.id}`} className={styles.backLink}>
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

          {/* Shift banner */}
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

          {/* Swap banner — variant 1: the requester's own view */}
          {hasOpenSwap && swapIsMine && (
            <section className={styles.swapBanner}>
              <div className={styles.swapBannerHeader}>
                <span className={styles.swapBannerIcon}>🔄</span>
                <div>
                  <p className={styles.swapBannerTitle}>
                    Looking for someone to cover
                  </p>
                  <p className={styles.swapBannerSubtitle}>
                    Your request is out to the rest of the rotation. You&apos;ll
                    get an email when someone takes it.
                  </p>
                </div>
              </div>
              {openSwapRequest.reason && (
                <p className={styles.swapBannerReason}>
                  <em>&ldquo;{openSwapRequest.reason}&rdquo;</em>
                </p>
              )}
              <button
                type='button'
                className={styles.swapCancelBtn}
                onClick={handleCancelSwap}
                disabled={cancellingSwap}
              >
                {cancellingSwap ? "Cancelling..." : "Cancel swap request"}
              </button>
            </section>
          )}

          {/* Swap banner — variant 2: someone else needs cover, current user can claim */}
          {hasOpenSwap && canClaimSwap && (
            <section className={styles.swapBannerClaim}>
              <div className={styles.swapBannerHeader}>
                <span className={styles.swapBannerIcon}>🤝</span>
                <div>
                  <p className={styles.swapBannerTitle}>
                    {openSwapRequest!.requestedBy.firstName} needs someone to
                    cover
                  </p>
                  <p className={styles.swapBannerSubtitle}>
                    If you can take this shift, tap below. First to claim it
                    gets it.
                  </p>
                </div>
              </div>
              {openSwapRequest!.reason && (
                <p className={styles.swapBannerReason}>
                  <em>&ldquo;{openSwapRequest!.reason}&rdquo;</em>
                </p>
              )}
              <button
                type='button'
                className={styles.swapClaimBtn}
                onClick={() => setShowConfirmClaim(true)}
                disabled={claiming}
              >
                {claiming ? "Claiming..." : "Take this shift →"}
              </button>
            </section>
          )}

          {/* Swap banner — variant 3: open swap but current user can't claim (e.g. admin not in rotation) */}
          {hasOpenSwap && !swapIsMine && !canClaimSwap && !isAssignedHelper && (
            <section className={styles.swapBannerInfo}>
              <div className={styles.swapBannerHeader}>
                <span className={styles.swapBannerIcon}>🔄</span>
                <div>
                  <p className={styles.swapBannerTitle}>
                    {openSwapRequest!.requestedBy.firstName} needs someone to
                    cover
                  </p>
                  <p className={styles.swapBannerSubtitle}>
                    The other helpers in the rotation have been notified.
                  </p>
                </div>
              </div>
            </section>
          )}

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

          {/* Grocery list */}
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
                Nothing on the list yet.{" "}
                {recipient?.firstName ?? "The recipient"} hasn&apos;t added
                anything for this shift.
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

            {isAssignedHelper && !isComplete && !hasOpenSwap && (
              <button
                type='button'
                className={styles.swapRequestBtn}
                onClick={() => setShowSwapModal(true)}
              >
                Can&apos;t make this shift? Ask someone to cover
              </button>
            )}

            {isComplete && shift.completedAt && (
              <p className={styles.completedNote}>
                Completed on {formatShiftFullDate(new Date(shift.completedAt))}.
              </p>
            )}
          </section>

          {/* Prescriptions */}
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

          {/* Reminders — only shown to the assigned helper */}
          {isAssignedHelper && (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Reminders</h2>
              </div>

              {notifications.length === 0 ? (
                <p className={styles.emptyText}>
                  No reminders sent yet. You&apos;ll get emails 7 days, 2 days,
                  and 1 day before your shift.
                </p>
              ) : (
                <div className={styles.notificationList}>
                  {notifications.map((n) => {
                    const label = labelForTemplate(n.template);
                    const iconEmoji = n.status === "FAILED" ? "⚠️" : "📧";
                    return (
                      <div
                        key={n.id}
                        className={`${styles.notificationRow} ${n.status === "FAILED" ? styles.notificationRowFailed : ""}`}
                      >
                        <span className={styles.notificationIcon}>
                          {iconEmoji}
                        </span>
                        <div className={styles.notificationBody}>
                          <p className={styles.notificationLabel}>{label}</p>
                          <p className={styles.notificationMeta}>
                            {n.status === "SENT" && n.sentAt
                              ? `Sent ${formatNotificationDate(new Date(n.sentAt))}`
                              : n.status === "FAILED"
                                ? `Failed — ${n.error ?? "unknown error"}`
                                : n.status}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {!isComplete && (
                <div className={styles.testReminderBlock}>
                  <p className={styles.testReminderLabel}>
                    Want to see what the email looks like?
                  </p>
                  <div className={styles.testReminderButtons}>
                    <button
                      type='button'
                      className={styles.testReminderBtn}
                      onClick={() => handleSendTestReminder(7)}
                      disabled={sendingTest}
                    >
                      7-day version
                    </button>
                    <button
                      type='button'
                      className={styles.testReminderBtn}
                      onClick={() => handleSendTestReminder(2)}
                      disabled={sendingTest}
                    >
                      2-day version
                    </button>
                    <button
                      type='button'
                      className={styles.testReminderBtn}
                      onClick={() => handleSendTestReminder(1)}
                      disabled={sendingTest}
                    >
                      1-day version
                    </button>
                  </div>
                </div>
              )}
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

      <ConfirmDialog
        isOpen={showConfirmClaim}
        onClose={() => setShowConfirmClaim(false)}
        onConfirm={handleClaimSwap}
        title='Take this shift?'
        message={
          openSwapRequest
            ? `You'll be shopping for ${recipient?.firstName ?? "the recipient"} on ${formatShiftFullDate(new Date(shift.scheduledDate))}${circle.typicalArrivalTime ? ` at ${circle.typicalArrivalTime}` : ""}. You'll get an email with all the details.`
            : ""
        }
        confirmText='Yes, I&rsquo;ll take it'
        variant='default'
        confirming={claiming}
      />

      <RequestSwapModal
        isOpen={showSwapModal}
        onClose={() => setShowSwapModal(false)}
        onSuccess={() => {
          setShowSwapModal(false);
          startTransition(() => router.refresh());
        }}
        shiftId={shift.id}
        shiftDateLabel={formatShiftFullDate(new Date(shift.scheduledDate))}
        otherHelperCount={otherHelperCount}
      />
    </section>
  );
}
