/* eslint-disable @typescript-eslint/no-unused-vars */
// app/(protected)/my-circle/MyCirclePage.tsx
"use client";

import styles from "./MyCirclePage.module.css";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import toast from "react-hot-toast";
import { formatPhone } from "@/lib/format";
import {
  formatShiftDate,
  formatShiftFullDate,
  formatRotationDay,
  formatCadence,
} from "@/lib/shifts/formatShift";
import { addGroceryItem } from "@/actions/grocery/addGroceryItem";
import { removeGroceryItem } from "@/actions/grocery/removeGroceryItem";
import { updateGroceryItem } from "@/actions/grocery/updateGroceryItem";
import { addPrescription } from "@/actions/prescriptions/addPrescription";
import { togglePickup } from "@/actions/prescriptions/togglePickup";
import { removePrescription } from "@/actions/prescriptions/removePrescription";
import { updatePrescription } from "@/actions/prescriptions/updatePrescription";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import ConfirmDialog from "@/components/shared/ConfirmDialog/ConfirmDialog";

function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);

  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

type GroceryItem = {
  id: string;
  name: string;
  quantity: string | null;
  notes: string | null;
  status: string;
  assignedShiftId: string | null;
  addedBy: string | null;
};

type Prescription = {
  id: string;
  medicationName: string;
  needsPickupThisWeek: boolean;
  pharmacyName: string | null;
  pharmacyPhone: string | null;
  notes: string | null;
};

type Helper = {
  firstName: string;
  lastName: string;
  phone: string;
};

type Shift = {
  id: string;
  scheduledDate: string;
  helper: {
    firstName: string;
    lastName: string;
    phone: string;
  } | null;
};

type Props = {
  circleId: string;
  circleName: string;
  userName: string;
  userEmail: string;
  rotationDayOfWeek: number;
  rotationCadence: "WEEKLY" | "BIWEEKLY" | "CUSTOM";
  typicalArrivalTime: string | null;
  upcomingShifts: Shift[];
  thisWeekItems: GroceryItem[];
  savedForLaterItems: GroceryItem[];
  prescriptions: Prescription[];
  helpers: Helper[];
};

type ConfirmState =
  | { type: "none" }
  | { type: "grocery"; itemId: string; itemName: string }
  | { type: "prescription"; prescriptionId: string; medicationName: string };

export default function MyCirclePage({
  circleId,
  circleName,
  userName,
  userEmail,
  rotationDayOfWeek,
  rotationCadence,
  typicalArrivalTime,
  upcomingShifts,
  thisWeekItems,
  savedForLaterItems,
  prescriptions: initialPrescriptions,
  helpers,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Grocery state
  const [itemName, setItemName] = useState("");
  const [itemQuantity, setItemQuantity] = useState("");
  const [itemNotes, setItemNotes] = useState("");
  const [addingItem, setAddingItem] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Grocery edit state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemName, setEditItemName] = useState("");
  const [editItemQuantity, setEditItemQuantity] = useState("");
  const [editItemNotes, setEditItemNotes] = useState("");
  const [savingItem, setSavingItem] = useState(false);

  // Prescription state
  const [showAddRx, setShowAddRx] = useState(false);
  const [rxName, setRxName] = useState("");
  const [rxPharmacy, setRxPharmacy] = useState("");
  const [rxPharmacyPhone, setRxPharmacyPhone] = useState("");
  const [rxNotes, setRxNotes] = useState("");
  const [addingRx, setAddingRx] = useState(false);

  // Prescription edit state
  const [editingRxId, setEditingRxId] = useState<string | null>(null);
  const [editRxName, setEditRxName] = useState("");
  const [editRxPharmacy, setEditRxPharmacy] = useState("");
  const [editRxPharmacyPhone, setEditRxPharmacyPhone] = useState("");
  const [editRxNotes, setEditRxNotes] = useState("");
  const [savingRx, setSavingRx] = useState(false);

  // Confirm dialog
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    type: "none",
  });
  const [confirming, setConfirming] = useState(false);

  const pickupsNeeded = initialPrescriptions.filter(
    (p) => p.needsPickupThisWeek,
  );

  // Shift data
  const thisWeekShift = upcomingShifts[0] ?? null;
  const remainingShifts = upcomingShifts.slice(1);

  // ——— Grocery add ———

  const handleAddItem = async () => {
    if (!itemName.trim()) return;
    setAddingItem(true);

    const result = await addGroceryItem({
      circleId,
      name: itemName.trim(),
      quantity: itemQuantity.trim() || undefined,
      notes: itemNotes.trim() || undefined,
    });

    if (result.success) {
      toast.success("Added to list");
      setItemName("");
      setItemQuantity("");
      setItemNotes("");
      setShowAddForm(false);
      startTransition(() => router.refresh());
    } else if (result.error) {
      toast.error(result.error);
    }

    setAddingItem(false);
  };

  // ——— Grocery edit ———

  const startEditItem = (item: GroceryItem) => {
    setEditingItemId(item.id);
    setEditItemName(item.name);
    setEditItemQuantity(item.quantity ?? "");
    setEditItemNotes(item.notes ?? "");
  };

  const cancelEditItem = () => {
    setEditingItemId(null);
    setEditItemName("");
    setEditItemQuantity("");
    setEditItemNotes("");
  };

  const saveEditItem = async () => {
    if (!editingItemId || !editItemName.trim()) return;
    setSavingItem(true);

    const result = await updateGroceryItem({
      itemId: editingItemId,
      name: editItemName.trim(),
      quantity: editItemQuantity.trim() || undefined,
      notes: editItemNotes.trim() || undefined,
    });

    if (result.success) {
      toast.success("Updated");
      cancelEditItem();
      startTransition(() => router.refresh());
    } else if (result.error) {
      toast.error(result.error);
    }

    setSavingItem(false);
  };

  // ——— Grocery remove ———

  const requestRemoveItem = (item: GroceryItem) => {
    setConfirmState({ type: "grocery", itemId: item.id, itemName: item.name });
  };

  // ——— Prescription add ———

  const handleAddPrescription = async () => {
    if (!rxName.trim()) return;
    setAddingRx(true);

    const result = await addPrescription({
      circleId,
      medicationName: rxName.trim(),
      pharmacyName: rxPharmacy.trim() || undefined,
      pharmacyPhone: rxPharmacyPhone.trim() || undefined,
      notes: rxNotes.trim() || undefined,
    });

    if (result.success) {
      toast.success("Prescription added");
      setRxName("");
      setRxPharmacy("");
      setRxPharmacyPhone("");
      setRxNotes("");
      setShowAddRx(false);
      startTransition(() => router.refresh());
    } else if (result.error) {
      toast.error(result.error);
    }

    setAddingRx(false);
  };

  // ——— Prescription edit ———

  const startEditRx = (rx: Prescription) => {
    setEditingRxId(rx.id);
    setEditRxName(rx.medicationName);
    setEditRxPharmacy(rx.pharmacyName ?? "");
    setEditRxPharmacyPhone(formatPhoneNumber(rx.pharmacyPhone ?? ""));
    setEditRxNotes(rx.notes ?? "");
  };

  const cancelEditRx = () => {
    setEditingRxId(null);
    setEditRxName("");
    setEditRxPharmacy("");
    setEditRxPharmacyPhone("");
    setEditRxNotes("");
  };

  const saveEditRx = async () => {
    if (!editingRxId || !editRxName.trim()) return;
    setSavingRx(true);

    const result = await updatePrescription({
      prescriptionId: editingRxId,
      medicationName: editRxName.trim(),
      pharmacyName: editRxPharmacy.trim() || undefined,
      pharmacyPhone: editRxPharmacyPhone.trim() || undefined,
      notes: editRxNotes.trim() || undefined,
    });

    if (result.success) {
      toast.success("Updated");
      cancelEditRx();
      startTransition(() => router.refresh());
    } else if (result.error) {
      toast.error(result.error);
    }

    setSavingRx(false);
  };

  // ——— Prescription toggle ———

  const handleTogglePickup = async (prescriptionId: string) => {
    const result = await togglePickup(prescriptionId);
    if (result.success) {
      startTransition(() => router.refresh());
    } else if (result.error) {
      toast.error(result.error);
    }
  };

  // ——— Prescription remove ———

  const requestRemoveRx = (rx: Prescription) => {
    setConfirmState({
      type: "prescription",
      prescriptionId: rx.id,
      medicationName: rx.medicationName,
    });
  };

  // ——— Confirm handler ———

  const handleConfirm = async () => {
    if (confirmState.type === "none") return;

    setConfirming(true);

    if (confirmState.type === "grocery") {
      const result = await removeGroceryItem(confirmState.itemId);
      if (result.success) {
        toast.success("Removed");
        setConfirmState({ type: "none" });
        startTransition(() => router.refresh());
      } else if (result.error) {
        toast.error(result.error);
      }
    } else if (confirmState.type === "prescription") {
      const result = await removePrescription(confirmState.prescriptionId);
      if (result.success) {
        toast.success("Removed");
        setConfirmState({ type: "none" });
        startTransition(() => router.refresh());
      } else if (result.error) {
        toast.error(result.error);
      }
    }

    setConfirming(false);
  };

  return (
    <section className={styles.container}>
      <div className={styles.content}>
        <LayoutWrapper>
          <header className={styles.header}>
            <div>
              <h1 className={styles.title}>Hi {userName}</h1>
            </div>
            <div className={styles.accountInfo}>
              <button
                type='button'
                className={styles.signOutBtn}
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                Sign out
              </button>
              <p className={styles.userEmail}>{userEmail}</p>
            </div>
          </header>

          <div className={styles.subtitle}>
            <SectionHeading
              title={`${circleName} — here to help with groceries and errands.`}
              color='black'
              dotColor='purpleDot'
            />
          </div>

          {/* This week's helper */}
          {thisWeekShift && thisWeekShift.helper && (
            <section className={styles.thisWeekBanner}>
              {/* <p className={styles.thisWeekLabel}>This Week:</p> */}
              <h2 className={styles.thisWeekHelper}>
                {thisWeekShift.helper.firstName} {thisWeekShift.helper.lastName}{" "}
                will be assisting this week
              </h2>
              <p className={styles.thisWeekDate}>
                {formatShiftFullDate(new Date(thisWeekShift.scheduledDate))}
              </p>
              <a
                href={`tel:${thisWeekShift.helper.phone}`}
                className={styles.thisWeekPhone}
              >
                {formatPhone(thisWeekShift.helper.phone)}
              </a>
            </section>
          )}

          {/* Upcoming shifts */}
          {remainingShifts.length > 0 && (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Coming up</h2>
                <span className={styles.itemCount}>
                  {formatCadence(rotationCadence)} ·{" "}
                  {formatRotationDay(rotationDayOfWeek)}
                </span>
              </div>
              <div className={styles.shiftList}>
                {remainingShifts.map((shift) => (
                  <div key={shift.id} className={styles.shiftRow}>
                    <div className={styles.shiftDate}>
                      {formatShiftDate(new Date(shift.scheduledDate))}
                    </div>
                    <div className={styles.shiftHelper}>
                      {shift.helper
                        ? `${shift.helper.firstName} ${shift.helper.lastName}`
                        : "Not yet assigned"}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Fallback when no shifts exist yet */}
          {upcomingShifts.length === 0 && (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Coming up</h2>
              </div>
              <p className={styles.emptyText}>
                No visits scheduled yet. Once helpers join the circle, the
                rotation will appear here.
              </p>
            </section>
          )}

          {/* Who's helping */}
          {helpers.length > 0 && (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Your helpers</h2>
              </div>
              <div className={styles.helperList}>
                {helpers.map((h, i) => (
                  <div key={i} className={styles.helperCard}>
                    <p className={styles.helperName}>
                      {h.firstName} {h.lastName}
                    </p>
                    <a href={`tel:${h.phone}`} className={styles.helperPhone}>
                      {formatPhone(h.phone)}
                    </a>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Grocery List — This Week */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>This week&apos;s list</h2>
              <span className={styles.itemCount}>
                {thisWeekItems.length}{" "}
                {thisWeekItems.length === 1 ? "item" : "items"}
              </span>
            </div>

            {thisWeekShift && thisWeekShift.helper && (
              <p className={styles.listContext}>
                {thisWeekShift.helper.firstName} will pick these up{" "}
                {formatShiftDate(
                  new Date(thisWeekShift.scheduledDate),
                ).toLowerCase()}
                .
              </p>
            )}

            {showAddForm ? (
              <div className={styles.addForm}>
                <input
                  type='text'
                  className={styles.inputLarge}
                  placeholder='What do you need?'
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && itemName.trim()) handleAddItem();
                  }}
                />
                <div className={styles.addFormRow}>
                  <select
                    className={styles.inputLarge}
                    value={itemQuantity}
                    onChange={(e) => setItemQuantity(e.target.value)}
                  >
                    <option value=''>How many?</option>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={String(n)}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <textarea
                  className={styles.textareaMedium}
                  placeholder='Any notes? e.g. "the big box, not the small one" (optional)'
                  value={itemNotes}
                  onChange={(e) => setItemNotes(e.target.value)}
                  rows={2}
                />
                <div className={styles.addFormActions}>
                  <button
                    type='button'
                    className={styles.cancelBtn}
                    onClick={() => {
                      setShowAddForm(false);
                      setItemName("");
                      setItemQuantity("");
                      setItemNotes("");
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type='button'
                    className={styles.addBtn}
                    onClick={handleAddItem}
                    disabled={addingItem || !itemName.trim()}
                  >
                    {addingItem ? "Adding..." : "Add to list"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type='button'
                className={styles.addItemTrigger}
                onClick={() => setShowAddForm(true)}
              >
                + Add something to the list
              </button>
            )}

            {thisWeekItems.length === 0 ? (
              <p className={styles.emptyText}>
                Nothing on this week&apos;s list yet. Tap the button above to
                add what you need.
              </p>
            ) : (
              <div className={styles.itemList}>
                {thisWeekItems.map((item) =>
                  editingItemId === item.id ? (
                    <div key={item.id} className={styles.addForm}>
                      <input
                        type='text'
                        className={styles.inputLarge}
                        placeholder='Item name'
                        value={editItemName}
                        onChange={(e) => setEditItemName(e.target.value)}
                        autoFocus
                      />
                      <div className={styles.addFormRow}>
                        <select
                          className={styles.inputLarge}
                          value={editItemQuantity}
                          onChange={(e) => setEditItemQuantity(e.target.value)}
                        >
                          <option value=''>How many?</option>
                          {Array.from({ length: 10 }, (_, i) => i + 1).map(
                            (n) => (
                              <option key={n} value={String(n)}>
                                {n}
                              </option>
                            ),
                          )}
                        </select>
                      </div>
                      <textarea
                        className={styles.textareaMedium}
                        placeholder='Notes (optional)'
                        value={editItemNotes}
                        onChange={(e) => setEditItemNotes(e.target.value)}
                        rows={2}
                      />
                      <div className={styles.addFormActions}>
                        <button
                          type='button'
                          className={styles.cancelBtn}
                          onClick={cancelEditItem}
                          disabled={savingItem}
                        >
                          Cancel
                        </button>
                        <button
                          type='button'
                          className={styles.addBtn}
                          onClick={saveEditItem}
                          disabled={savingItem || !editItemName.trim()}
                        >
                          {savingItem ? "Saving..." : "Save"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div key={item.id} className={styles.itemCard}>
                      <div className={styles.itemInfo}>
                        <p className={styles.itemName}>{item.name}</p>
                        {item.quantity && (
                          <p className={styles.itemMeta}>
                            Qty: {item.quantity}
                          </p>
                        )}
                        {item.notes && (
                          <p className={styles.itemMeta}>{item.notes}</p>
                        )}
                        {item.addedBy && (
                          <p className={styles.itemAddedBy}>
                            Added by {item.addedBy}
                          </p>
                        )}
                      </div>
                      <div className={styles.itemActions}>
                        <button
                          type='button'
                          className={styles.editBtn}
                          onClick={() => startEditItem(item)}
                          aria-label={`Edit ${item.name}`}
                        >
                          Edit
                        </button>
                        <button
                          type='button'
                          className={styles.removeBtn}
                          onClick={() => requestRemoveItem(item)}
                          aria-label={`Remove ${item.name}`}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </section>

          {/* Saved for later */}
          {savedForLaterItems.length > 0 && (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Saved for later</h2>
                <span className={styles.itemCount}>
                  {savedForLaterItems.length}{" "}
                  {savedForLaterItems.length === 1 ? "item" : "items"}
                </span>
              </div>

              <p className={styles.listContext}>
                Added before the list was finalized — we&apos;ll roll these over
                to the next shop.
              </p>

              <div className={styles.itemList}>
                {savedForLaterItems.map((item) =>
                  editingItemId === item.id ? (
                    <div key={item.id} className={styles.addForm}>
                      <input
                        type='text'
                        className={styles.inputLarge}
                        placeholder='Item name'
                        value={editItemName}
                        onChange={(e) => setEditItemName(e.target.value)}
                        autoFocus
                      />
                      <div className={styles.addFormRow}>
                        <input
                          type='text'
                          className={styles.inputLarge}
                          placeholder='Quantity (optional)'
                          value={editItemQuantity}
                          onChange={(e) => setEditItemQuantity(e.target.value)}
                        />
                      </div>
                      <textarea
                        className={styles.textareaMedium}
                        placeholder='Notes (optional)'
                        value={editItemNotes}
                        onChange={(e) => setEditItemNotes(e.target.value)}
                        rows={2}
                      />
                      <div className={styles.addFormActions}>
                        <button
                          type='button'
                          className={styles.cancelBtn}
                          onClick={cancelEditItem}
                          disabled={savingItem}
                        >
                          Cancel
                        </button>
                        <button
                          type='button'
                          className={styles.addBtn}
                          onClick={saveEditItem}
                          disabled={savingItem || !editItemName.trim()}
                        >
                          {savingItem ? "Saving..." : "Save"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div key={item.id} className={styles.itemCard}>
                      <div className={styles.itemInfo}>
                        <p className={styles.itemName}>{item.name}</p>
                        {item.quantity && (
                          <p className={styles.itemMeta}>
                            Qty: {item.quantity}
                          </p>
                        )}
                        {item.notes && (
                          <p className={styles.itemMeta}>{item.notes}</p>
                        )}
                        {item.addedBy && (
                          <p className={styles.itemAddedBy}>
                            Added by {item.addedBy}
                          </p>
                        )}
                      </div>
                      <div className={styles.itemActions}>
                        <button
                          type='button'
                          className={styles.editBtn}
                          onClick={() => startEditItem(item)}
                          aria-label={`Edit ${item.name}`}
                        >
                          Edit
                        </button>
                        <button
                          type='button'
                          className={styles.removeBtn}
                          onClick={() => requestRemoveItem(item)}
                          aria-label={`Remove ${item.name}`}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </section>
          )}

          {/* Prescription Pickups */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Prescription pickups</h2>
              {pickupsNeeded.length > 0 && (
                <span className={styles.pickupBadge}>
                  {pickupsNeeded.length} needed
                </span>
              )}
            </div>

            {initialPrescriptions.length === 0 && !showAddRx ? (
              <p className={styles.emptyText}>
                No prescriptions set up yet. Add your medications so your helper
                knows what to pick up.
              </p>
            ) : (
              <div className={styles.rxList}>
                {initialPrescriptions.map((rx) =>
                  editingRxId === rx.id ? (
                    <div key={rx.id} className={styles.addForm}>
                      <input
                        type='text'
                        className={styles.inputLarge}
                        placeholder='Medication name'
                        value={editRxName}
                        onChange={(e) => setEditRxName(e.target.value)}
                        autoFocus
                      />
                      <div className={styles.addFormRow}>
                        <input
                          type='text'
                          className={styles.inputLarge}
                          placeholder='Pharmacy name (optional)'
                          value={editRxPharmacy}
                          onChange={(e) => setEditRxPharmacy(e.target.value)}
                        />
                        <input
                          type='tel'
                          className={styles.inputLarge}
                          placeholder='Pharmacy phone (optional)'
                          value={editRxPharmacyPhone}
                          onChange={(e) =>
                            setEditRxPharmacyPhone(
                              formatPhoneNumber(e.target.value),
                            )
                          }
                        />
                      </div>
                      <textarea
                        className={styles.textareaMedium}
                        placeholder='Notes (optional)'
                        value={editRxNotes}
                        onChange={(e) => setEditRxNotes(e.target.value)}
                        rows={2}
                      />
                      <div className={styles.addFormActions}>
                        <button
                          type='button'
                          className={styles.cancelBtn}
                          onClick={cancelEditRx}
                          disabled={savingRx}
                        >
                          Cancel
                        </button>
                        <button
                          type='button'
                          className={styles.addBtn}
                          onClick={saveEditRx}
                          disabled={savingRx || !editRxName.trim()}
                        >
                          {savingRx ? "Saving..." : "Save"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div key={rx.id} className={styles.rxCard}>
                      <div className={styles.rxInfo}>
                        <p className={styles.rxName}>{rx.medicationName}</p>
                        {rx.pharmacyName && (
                          <p className={styles.rxPharmacy}>
                            {rx.pharmacyName}
                            {rx.pharmacyPhone &&
                              ` · ${formatPhone(rx.pharmacyPhone)}`}
                          </p>
                        )}
                        {rx.notes && (
                          <p className={styles.rxNotes}>{rx.notes}</p>
                        )}
                        {rx.needsPickupThisWeek && (
                          <p className={styles.rxPickupFlag}>
                            Needs pickup this week
                          </p>
                        )}
                      </div>
                      <div className={styles.itemActions}>
                        <button
                          type='button'
                          className={styles.editBtn}
                          onClick={() => startEditRx(rx)}
                          aria-label={`Edit ${rx.medicationName}`}
                        >
                          Edit
                        </button>
                        <button
                          type='button'
                          className={styles.removeBtn}
                          onClick={() => requestRemoveRx(rx)}
                          aria-label={`Remove ${rx.medicationName}`}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}

            {showAddRx ? (
              <div className={styles.addForm}>
                <input
                  type='text'
                  className={styles.inputLarge}
                  placeholder='Medication name'
                  value={rxName}
                  onChange={(e) => setRxName(e.target.value)}
                  autoFocus
                />
                <div className={styles.addFormRow}>
                  <input
                    type='text'
                    className={styles.inputLarge}
                    placeholder='Pharmacy name (optional)'
                    value={rxPharmacy}
                    onChange={(e) => setRxPharmacy(e.target.value)}
                  />
                  <input
                    type='tel'
                    className={styles.inputLarge}
                    placeholder='Pharmacy phone (optional)'
                    value={rxPharmacyPhone}
                    onChange={(e) =>
                      setRxPharmacyPhone(formatPhoneNumber(e.target.value))
                    }
                  />
                </div>
                <textarea
                  className={styles.textareaMedium}
                  placeholder='Any notes? (optional)'
                  value={rxNotes}
                  onChange={(e) => setRxNotes(e.target.value)}
                  rows={2}
                />
                <div className={styles.addFormActions}>
                  <button
                    type='button'
                    className={styles.cancelBtn}
                    onClick={() => {
                      setShowAddRx(false);
                      setRxName("");
                      setRxPharmacy("");
                      setRxPharmacyPhone("");
                      setRxNotes("");
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type='button'
                    className={styles.addBtn}
                    onClick={handleAddPrescription}
                    disabled={addingRx || !rxName.trim()}
                  >
                    {addingRx ? "Adding..." : "Add prescription"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type='button'
                className={styles.addItemTrigger}
                onClick={() => setShowAddRx(true)}
              >
                + Add a prescription
              </button>
            )}
          </section>
        </LayoutWrapper>
      </div>

      {/* Confirm remove dialog */}
      <ConfirmDialog
        isOpen={confirmState.type !== "none"}
        onClose={() => setConfirmState({ type: "none" })}
        onConfirm={handleConfirm}
        title={
          confirmState.type === "grocery"
            ? `Remove ${confirmState.itemName}?`
            : confirmState.type === "prescription"
              ? `Remove ${confirmState.medicationName}?`
              : ""
        }
        message={
          confirmState.type === "grocery"
            ? "This will remove the item from your grocery list."
            : confirmState.type === "prescription"
              ? "This will remove the prescription from your list. You can always add it back later."
              : ""
        }
        confirmText='Yes, remove it'
        confirming={confirming}
      />
    </section>
  );
}
