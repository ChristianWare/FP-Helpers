// app/(protected)/find/FindPage.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import styles from "./FindPage.module.css";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import { dateKeyToNoonUtc } from "@/lib/shifts/scheduleDates";

export type DirectoryCircle = {
  id: string;
  name: string;
  circleType: "STANDARD" | "MEAL_TRAIN";
  recipientName: string | null;
  scheduleLabel: string;
  endDateKey: string | null; // "2026-10-14" | null = ongoing
  openDays: number; // meal trains only
  nextOpenDayKey: string | null; // meal trains only
  helperCount: number;
  isMember: boolean;
  isRecipient: boolean;
  joinToken: string | null;
};

type Props = {
  viewerSignedIn: boolean;
  circles: DirectoryCircle[];
};

type TypeFilter = "ALL" | "MEAL_TRAIN" | "STANDARD";

function fmtDateKey(key: string): string {
  return dateKeyToNoonUtc(key).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Trains that need someone soonest first, then the rest, newest listing last. */
function byUrgency(a: DirectoryCircle, b: DirectoryCircle): number {
  const aKey = a.nextOpenDayKey ?? "9999-99-99";
  const bKey = b.nextOpenDayKey ?? "9999-99-99";
  if (aKey !== bKey) return aKey < bKey ? -1 : 1;
  return 0;
}

export default function FindPage({ viewerSignedIn, circles }: Props) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return circles
      .filter((c) => typeFilter === "ALL" || c.circleType === typeFilter)
      .filter(
        (c) =>
          q === "" ||
          c.name.toLowerCase().includes(q) ||
          (c.recipientName ?? "").toLowerCase().includes(q),
      )
      .sort(byUrgency);
  }, [circles, query, typeFilter]);

  const hasMealTrains = circles.some((c) => c.circleType === "MEAL_TRAIN");
  const hasStandard = circles.some((c) => c.circleType === "STANDARD");

  return (
    <section className={styles.container}>
      <div className={styles.content}>
        <LayoutWrapper>
          <div className={styles.top}>
            <SectionHeading
              title='congregation'
              color='black'
              dotColor='purpleDot'
            />
            <h1 className={styles.title}>Find a Circle or Meal Train</h1>
            <p className={styles.subtitle}>
              Meal trains and care circles in the congregation that could use
              another pair of hands.
            </p>
          </div>

          {/* ——— Signed out: the prompt, nothing else ——— */}
          {!viewerSignedIn ? (
            <div className={styles.gate}>
              <div className={styles.gateIcon}>🔒</div>
              <h2 className={styles.gateHeading}>
                You need to be signed in to see this information
              </h2>
              <p className={styles.gateText}>
                These circles are for friends in the congregation, so we only
                show them to signed-in members. Sign in and you&apos;ll come
                right back here.
              </p>
              <Link href='/login?next=%2Ffind' className={styles.gateBtn}>
                Sign in
              </Link>
            </div>
          ) : (
            <>
              {/* ——— Search + type filter ——— */}
              <div className={styles.controls}>
                <input
                  type='search'
                  className={styles.search}
                  placeholder='Search by circle or family name...'
                  aria-label='Search circles'
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {hasMealTrains && hasStandard && (
                  <div
                    className={styles.filters}
                    role='group'
                    aria-label='Filter by kind'
                  >
                    {(
                      [
                        ["ALL", "All"],
                        ["MEAL_TRAIN", "Meal trains"],
                        ["STANDARD", "Standard circles"],
                      ] as [TypeFilter, string][]
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type='button'
                        className={`${styles.filterBtn} ${typeFilter === value ? styles.filterBtnActive : ""}`}
                        aria-pressed={typeFilter === value}
                        onClick={() => setTypeFilter(value)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* ——— The cards ——— */}
              {circles.length === 0 ? (
                <div className={styles.empty}>
                  <p className={styles.emptyHeading}>Nothing listed yet</p>
                  <p className={styles.emptyText}>
                    When an organizer lists a circle in the directory, it shows
                    up here. Organizing one yourself? Turn on &ldquo;List in the
                    directory&rdquo; on your circle&apos;s page.
                  </p>
                </div>
              ) : visible.length === 0 ? (
                <div className={styles.empty}>
                  <p className={styles.emptyHeading}>No matches</p>
                  <p className={styles.emptyText}>
                    Nothing matches that search. Try a shorter part of the name.
                  </p>
                </div>
              ) : (
                <div className={styles.grid}>
                  {visible.map((c) => {
                    const isMealTrain = c.circleType === "MEAL_TRAIN";
                    // Members open their circle; everyone else browses the
                    // read-only preview and can enroll from there.
                    const openHref = c.isRecipient
                      ? `/my-circle?circle=${c.id}`
                      : `/circles/${c.id}`;

                    return (
                      <div
                        key={c.id}
                        className={`${styles.card} ${c.isMember ? styles.cardMine : ""}`}
                      >
                        {c.isMember && (
                          <span className={styles.mineBadge}>
                            {c.isRecipient ? "✓ For you" : "✓ You're in this"}
                          </span>
                        )}

                        <span
                          className={`${styles.typeBadge} ${isMealTrain ? styles.typeBadgeMealTrain : styles.typeBadgeStandard}`}
                        >
                          {isMealTrain ? "Meal train" : "Standard circle"}
                        </span>

                        <h3 className={styles.cardName}>{c.name}</h3>
                        {c.recipientName && (
                          <p className={styles.cardRecipient}>
                            {isMealTrain ? "Meals for" : "Helping"}{" "}
                            {c.recipientName}
                          </p>
                        )}

                        <div className={styles.cardMeta}>
                          <span>{c.scheduleLabel}</span>
                          <span>
                            {c.endDateKey
                              ? `Through ${fmtDateKey(c.endDateKey)}`
                              : "Ongoing"}
                          </span>
                          <span>
                            {c.helperCount}{" "}
                            {c.helperCount === 1 ? "helper" : "helpers"}
                          </span>
                        </div>

                        {isMealTrain && (
                          <p
                            className={
                              c.openDays > 0
                                ? styles.openLine
                                : styles.coveredLine
                            }
                          >
                            {c.openDays > 0
                              ? `${c.openDays} ${c.openDays === 1 ? "day needs" : "days need"} someone${c.nextOpenDayKey ? ` — soonest ${fmtDateKey(c.nextOpenDayKey)}` : ""}`
                              : "Every day is covered right now"}
                          </p>
                        )}

                        <Link href={openHref} className={styles.cardBtn}>
                          {c.isRecipient
                            ? "Open my page"
                            : c.isMember
                              ? "Open circle"
                              : isMealTrain
                                ? "View meal train"
                                : "View circle"}
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </LayoutWrapper>
      </div>
    </section>
  );
}
