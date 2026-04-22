/* eslint-disable @typescript-eslint/no-unused-vars */
// app/(protected)/my-circle/MyCirclePage.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import styles from "./MyCirclePage.module.css";
import { formatPhone } from "@/lib/format";
import { addGroceryItem } from "@/actions/grocery/addGroceryItem";
import { removeGroceryItem } from "@/actions/grocery/removeGroceryItem";
import { addPrescription } from "@/actions/prescriptions/addPrescription";
import { togglePickup } from "@/actions/prescriptions/togglePickup";
import { removePrescription } from "@/actions/prescriptions/removePrescription";

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

type Props = {
  circleId: string;
  circleName: string;
  userName: string;
  groceryItems: GroceryItem[];
  prescriptions: Prescription[];
  helpers: Helper[];
};

export default function MyCirclePage({
  circleId,
  circleName,
  userName,
  groceryItems: initialItems,
  prescriptions: initialPrescriptions,
  helpers,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Grocery state
  const [items, setItems] = useState(initialItems);
  const [itemName, setItemName] = useState("");
  const [itemQuantity, setItemQuantity] = useState("");
  const [itemNotes, setItemNotes] = useState("");
  const [addingItem, setAddingItem] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Prescription state
  const [prescriptions, setPrescriptions] = useState(initialPrescriptions);
  const [showAddRx, setShowAddRx] = useState(false);
  const [rxName, setRxName] = useState("");
  const [rxPharmacy, setRxPharmacy] = useState("");
  const [rxPharmacyPhone, setRxPharmacyPhone] = useState("");
  const [rxNotes, setRxNotes] = useState("");
  const [addingRx, setAddingRx] = useState(false);

  const pickupsNeeded = prescriptions.filter((p) => p.needsPickupThisWeek);

  // ——— Grocery handlers ———

  const handleAddItem = async () => {
    if (!itemName.trim()) return;
    setAddingItem(true);

    const result = await addGroceryItem({
      circleId,
      name: itemName.trim(),
      quantity: itemQuantity.trim() || undefined,
      notes: itemNotes.trim() || undefined,
    });

    if (result.success && result.item) {
      setItems((prev) => [
        {
          id: result.item!.id,
          name: result.item!.name,
          quantity: result.item!.quantity,
          notes: result.item!.notes,
          status: result.item!.status,
          addedBy: "You",
        },
        ...prev,
      ]);
      setItemName("");
      setItemQuantity("");
      setItemNotes("");
      setShowAddForm(false);
    }

    setAddingItem(false);
  };

  const handleRemoveItem = async (itemId: string) => {
    const result = await removeGroceryItem(itemId);
    if (result.success) {
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    }
  };

  // ——— Prescription handlers ———

  const handleTogglePickup = async (prescriptionId: string) => {
    // Optimistic update
    setPrescriptions((prev) =>
      prev.map((p) =>
        p.id === prescriptionId
          ? { ...p, needsPickupThisWeek: !p.needsPickupThisWeek }
          : p
      )
    );

    const result = await togglePickup(prescriptionId);
    if (!result.success) {
      // Revert on failure
      setPrescriptions((prev) =>
        prev.map((p) =>
          p.id === prescriptionId
            ? { ...p, needsPickupThisWeek: !p.needsPickupThisWeek }
            : p
        )
      );
    }
  };

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
      startTransition(() => router.refresh());
      setRxName("");
      setRxPharmacy("");
      setRxPharmacyPhone("");
      setRxNotes("");
      setShowAddRx(false);
    }

    setAddingRx(false);
  };

  const handleRemovePrescription = async (prescriptionId: string) => {
    const result = await removePrescription(prescriptionId);
    if (result.success) {
      setPrescriptions((prev) => prev.filter((p) => p.id !== prescriptionId));
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.wrapper}>
        {/* Header */}
        <header className={styles.header}>
          <h1 className={styles.greeting}>Hi {userName}</h1>
          <p className={styles.circleName}>{circleName}</p>
        </header>

        {/* Who's helping */}
        {helpers.length > 0 && (
          <section className={styles.helpersSection}>
            <h2 className={styles.sectionTitle}>Your helpers</h2>
            <div className={styles.helperList}>
              {helpers.map((h, i) => (
                <div key={i} className={styles.helperCard}>
                  <p className={styles.helperName}>
                    {h.firstName} {h.lastName}
                  </p>
                  <a
                    href={`tel:${h.phone}`}
                    className={styles.helperPhone}
                  >
                    {formatPhone(h.phone)}
                  </a>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Grocery List */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Grocery list</h2>
            <span className={styles.itemCount}>
              {items.length} {items.length === 1 ? "item" : "items"}
            </span>
          </div>

          {/* Add item */}
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
                <input
                  type='text'
                  className={styles.inputMedium}
                  placeholder='How many? (optional)'
                  value={itemQuantity}
                  onChange={(e) => setItemQuantity(e.target.value)}
                />
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

          {/* Item list */}
          {items.length === 0 ? (
            <p className={styles.emptyText}>
              Nothing on the list yet. Tap the button above to add what you
              need.
            </p>
          ) : (
            <div className={styles.itemList}>
              {items.map((item) => (
                <div key={item.id} className={styles.itemCard}>
                  <div className={styles.itemInfo}>
                    <p className={styles.itemName}>{item.name}</p>
                    {item.quantity && (
                      <p className={styles.itemMeta}>Qty: {item.quantity}</p>
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
                  <button
                    type='button'
                    className={styles.removeBtn}
                    onClick={() => handleRemoveItem(item.id)}
                    aria-label={`Remove ${item.name}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

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

          {prescriptions.length === 0 && !showAddRx ? (
            <p className={styles.emptyText}>
              No prescriptions set up yet. Add your medications so your helper
              knows what to pick up.
            </p>
          ) : (
            <div className={styles.rxList}>
              {prescriptions.map((rx) => (
                <div key={rx.id} className={styles.rxCard}>
                  <div className={styles.rxCheckbox}>
                    <input
                      type='checkbox'
                      id={`rx-${rx.id}`}
                      className={styles.checkbox}
                      checked={rx.needsPickupThisWeek}
                      onChange={() => handleTogglePickup(rx.id)}
                    />
                  </div>
                  <div className={styles.rxInfo}>
                    <label
                      htmlFor={`rx-${rx.id}`}
                      className={styles.rxName}
                    >
                      {rx.medicationName}
                    </label>
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
                  <button
                    type='button'
                    className={styles.removeBtn}
                    onClick={() => handleRemovePrescription(rx.id)}
                    aria-label={`Remove ${rx.medicationName}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add prescription form */}
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
                  className={styles.inputMedium}
                  placeholder='Pharmacy name (optional)'
                  value={rxPharmacy}
                  onChange={(e) => setRxPharmacy(e.target.value)}
                />
                <input
                  type='tel'
                  className={styles.inputMedium}
                  placeholder='Pharmacy phone (optional)'
                  value={rxPharmacyPhone}
                  onChange={(e) => setRxPharmacyPhone(e.target.value)}
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
      </div>
    </div>
  );
}