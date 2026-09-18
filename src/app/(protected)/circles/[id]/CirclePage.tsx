/* eslint-disable @typescript-eslint/no-unused-vars */
// app/(protected)/circles/[id]/CirclePage.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import styles from "./CirclePage.module.css";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import { formatPhone } from "@/lib/format";
import { formatRotationInterval } from "@/lib/shifts/rotationInterval";
import { formatShiftDate, formatShiftFullDate } from "@/lib/shifts/formatShift";
import DeleteCircleButton from "@/components/circles/DeleteCircleButton";
import Confetti from "@/components/shared/Confetti/Confetti";
import { formatCircleDuration } from "@/lib/circles/formatDuration";
import RecipientSection from "./RecipientSection";
import ScheduleSection from "./ScheduleSection";
import RotationEditor from "./RotationEditor";
import MealCalendar, {
  type MealSlot,
} from "@/components/meals/MealCalendar/MealCalendar";
import MealDetailsSection from "@/components/meals/MealDetailsSection/MealDetailsSection";
import DirectoryToggle from "@/components/circles/DirectoryToggle/DirectoryToggle";
import { joinCircleAsExistingUser } from "@/actions/circles/joinCircleAsExistingUser";

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
  circle: {
    id: string;
    name: string;
    status: string;
    address: string | null;
    addressCity: string | null;
    addressState: string | null;
    addressZip: string | null;
    accessNotes: string | null;
    circleType: "STANDARD" | "MEAL_TRAIN";
    listedInDirectory: boolean;
    rotationDaysOfWeek: number[];
    rotationCadence: string;
    typicalArrivalTime: string | null;
    durationType: string;
    startDate: string | null;
    endDate: string | null;
    mealHouseholdSize: string | null;
    mealAllergies: string | null;
    mealPreferences: string | null;
  };
  recipient: {
    id: string;
    firstName: string;
    lastName: string;
    /** Null when the viewer is only previewing — contact info stays private. */
    email: string | null;
    phone: string | null;
  } | null;
  memberships: {
    id: string;
    role: string;
    inRotation: boolean;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string | null;
      phone: string | null;
    };
  }[];
  myNextShift: {
    id: string;
    scheduledDate: string;
  } | null;
  currentUserId: string;
  currentUserRole: string | null;
  /** False when a signed-in non-member is previewing a listed circle. */
  isMember: boolean;
  /** Active invite token — powers the Join button on the preview. */
  joinToken: string | null;
  joinUrl: string | null;
  justCreated: boolean;
  /** The recipient's email already had an account, so no password was set. */
  recipientHadAccount: boolean;
  /** Arrived here straight from the invite page. */
  justJoined: boolean;
  /** How many of the days they picked were taken before they submitted. */
  takenCount: number;
  nextShiftByHelper: Record<string, string>;
  rotationShifts: RotationShift[];
  /** Meal trains only — the full calendar of days. */
  mealSlots: MealSlot[];
};

export default function CirclePage({
  circle,
  recipient,
  memberships,
  currentUserId,
  currentUserRole,
  isMember,
  joinToken,
  joinUrl,
  justCreated,
  recipientHadAccount,
  justJoined,
  takenCount,
  nextShiftByHelper,
  rotationShifts,
  mealSlots,
  myNextShift,
}: Props) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [joining, setJoining] = useState(false);

  const helpers = memberships.filter((m) => m.role !== "RECIPIENT");
  const isAdmin = currentUserRole === "ADMIN";
  const isMealTrain = circle.circleType === "MEAL_TRAIN";
  const canSignUp = currentUserRole === "ADMIN" || currentUserRole === "HELPER";

  // Meal train: how many days each person has taken
  const daysByHelper: Record<string, number> = {};
  for (const slot of mealSlots) {
    if (slot.assignedUser) {
      daysByHelper[slot.assignedUser.id] =
        (daysByHelper[slot.assignedUser.id] ?? 0) + 1;
    }
  }

  const helpersInRotation = memberships.filter(
    (m) => m.inRotation && m.role !== "RECIPIENT",
  ).length;

  const rotationIntervalLabel = formatRotationInterval(
    helpersInRotation,
    circle.rotationCadence as "WEEKLY" | "BIWEEKLY" | "CUSTOM",
    circle.rotationDaysOfWeek.length,
  );

  const copyJoinLink = async () => {
    if (!joinUrl) return;
    await navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ——— Preview mode: signed-in non-member browsing from the directory ———

  const joinFromPreview = async () => {
    if (!joinToken || joining) return;
    setJoining(true);
    const result = await joinCircleAsExistingUser(joinToken);
    if (result.success) {
      toast.success(
        isMealTrain ? "You're in — pick your days below" : "Welcome aboard!",
      );
      router.push(result.redirectTo);
      router.refresh();
    } else {
      toast.error(result.error);
      setJoining(false);
    }
  };

  const previewBanner = !isMember ? (
    <div className={styles.previewBanner}>
      <div>
        <p className={styles.previewTitle}>
          {"You're browsing — you haven't joined yet"}
        </p>
        <p className={styles.previewText}>
          {isMealTrain
            ? `Have a look around. Joining lets you claim open days on the calendar below${recipient ? ` and bring ${recipient.firstName} a meal` : ""} — you won't be committed to anything until you pick a day.`
            : `Have a look around. Joining adds you to the rotation${recipient ? ` helping ${recipient.firstName}` : ""}, taking turns with the helpers below.`}{" "}
          Addresses and contact details stay hidden until you join.
        </p>
      </div>
      {joinToken ? (
        <button
          type='button'
          className={styles.previewJoinBtn}
          onClick={joinFromPreview}
          disabled={joining}
        >
          {joining
            ? "Joining..."
            : isMealTrain
              ? "Join this meal train"
              : "Join this circle"}
        </button>
      ) : (
        <p className={styles.previewNoLink}>
          Ask the organizer for an invite link to join.
        </p>
      )}
    </div>
  ) : null;

  // ——— Two blocks that are laid out differently per circle type ———

  const nextShiftBanner = myNextShift ? (
    <div className={styles.myShiftBanner}>
      <p className={styles.myShiftLabel}>
        {isMealTrain ? "Your next meal" : "Your next shift"}
      </p>
      <h2 className={styles.myShiftDate}>
        {formatShiftFullDate(new Date(myNextShift.scheduledDate))}
      </h2>
      {circle.typicalArrivalTime && (
        <p className={styles.myShiftTime}>
          {isMealTrain ? "Drop off around" : "Arriving around"}{" "}
          {circle.typicalArrivalTime}
        </p>
      )}
      <Link
        href={`/circles/${circle.id}/shifts/${myNextShift.id}`}
        className={styles.myShiftCta}
      >
        {isMealTrain ? "Open your day →" : "Open shift details →"}
      </Link>
    </div>
  ) : null;

  const scheduleSection = (
    <ScheduleSection
      circleId={circle.id}
      schedule={{
        circleType: circle.circleType,
        rotationDaysOfWeek: circle.rotationDaysOfWeek,
        rotationCadence: circle.rotationCadence,
        typicalArrivalTime: circle.typicalArrivalTime,
        address: circle.address,
        addressCity: circle.addressCity,
        addressState: circle.addressState,
        addressZip: circle.addressZip,
        accessNotes: circle.accessNotes,
        durationType: circle.durationType,
        startDate: circle.startDate,
        endDate: circle.endDate,
      }}
      isAdmin={isAdmin}
    />
  );

  return (
    <section className={styles.container}>
      <div className={styles.content}>
        <LayoutWrapper>
          <header className={styles.header}>
            <div>
              <Link href='/dashboard' className={styles.backLink}>
                ← Dashboard
              </Link>
              <h1 className={styles.title}>{circle.name}</h1>
            </div>
          </header>

          <div className={styles.subtitle}>
            <SectionHeading
              title={
                recipient
                  ? `${isMealTrain ? "Meals for" : "Helping"} ${recipient.firstName} ${recipient.lastName}`
                  : isMealTrain
                    ? "Your meal train"
                    : "Your care circle"
              }
              color='black'
              dotColor='purpleDot'
            />
          </div>

          {previewBanner}

          {justCreated && (
            <>
              <Confetti />
              <div className={styles.successBanner}>
                <div className={styles.successIcon}>🎉</div>
                <div>
                  <h2 className={styles.successTitle}>
                    {isMealTrain
                      ? "Your meal train is ready"
                      : "Your circle is ready"}
                  </h2>
                  <p className={styles.successText}>
                    {recipientHadAccount
                      ? `${recipient?.firstName} already had an account, so the password you typed wasn't used — we've emailed them to sign in the way they normally do.`
                      : `We've sent ${recipient?.firstName} their sign-in details by email.`}{" "}
                    {isMealTrain
                      ? "Now share the link below — everyone who opens it can pick a day."
                      : "Now invite your friends by sharing the link below."}
                  </p>
                </div>
              </div>
            </>
          )}

          {justJoined && !justCreated && (
            <div className={styles.successBanner}>
              <div className={styles.successIcon}>🎉</div>
              <div>
                <h2 className={styles.successTitle}>You&apos;re in</h2>
                <p className={styles.successText}>
                  {isMealTrain
                    ? myNextShift
                      ? "Thank you. Your days are on the calendar below, and the details are in your email."
                      : "Thank you for joining. Pick a day below whenever you're ready."
                    : "Thank you for joining. You've been added to the rotation."}
                </p>
              </div>
            </div>
          )}

          {takenCount > 0 && (
            <div className={styles.noticeBanner} role='status'>
              <p className={styles.noticeText}>
                {takenCount === 1
                  ? "One of the days you picked was taken by someone else just before you signed up."
                  : `${takenCount} of the days you picked were taken by someone else just before you signed up.`}{" "}
                Here&apos;s what&apos;s still open.
              </p>
            </div>
          )}

          {/* Standard circle WITH an upcoming shift: banner and schedule sit
              side by side, exactly as before. */}
          {!isMealTrain && nextShiftBanner && (
            <section className={styles.helperList}>
              {nextShiftBanner}
              {scheduleSection}
            </section>
          )}

          {/* Meal train: full-width banner, then the calendar — it's why
              people are here. */}
          {isMealTrain && nextShiftBanner}

          {/* Meal train: the calendar comes first — it's why people are here */}
          {isMealTrain && (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Meal calendar</h2>
              </div>
              <MealCalendar
                circleId={circle.id}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                canSignUp={canSignUp}
                recipientFirstName={recipient?.firstName ?? null}
                slots={mealSlots}
              />
            </section>
          )}

          {isMealTrain && isMember && (
            <MealDetailsSection
              circleId={circle.id}
              details={{
                mealHouseholdSize: circle.mealHouseholdSize,
                mealAllergies: circle.mealAllergies,
                mealPreferences: circle.mealPreferences,
              }}
              canEdit={isAdmin}
              audience='helpers'
              recipientFirstName={recipient?.firstName ?? null}
            />
          )}

          {/* Everyone else still gets the schedule. (It used to exist ONLY
              inside the block above, so an organizer with no upcoming shift
              couldn't see or edit it.) */}
          {(isMealTrain || !nextShiftBanner) && scheduleSection}

          {/* Recipient — members only: it holds contact info and password reset */}
          {recipient && isMember && (
            <RecipientSection
              circleId={circle.id}
              recipient={{
                id: recipient.id,
                firstName: recipient.firstName,
                lastName: recipient.lastName,
                email: recipient.email ?? "",
                phone: recipient.phone ?? "",
              }}
              isAdmin={isAdmin}
            />
          )}

          {/* The rotation — current cycle only, with completion state per row */}
          {!isMealTrain && rotationShifts.length > 0 && (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>The rotation</h2>
                <span className={styles.itemCount}>
                  {helpersInRotation}{" "}
                  {helpersInRotation === 1 ? "helper" : "helpers"} in rotation
                </span>
              </div>

              <p className={styles.listContext}>
                {rotationIntervalLabel} per person · {helpersInRotation}{" "}
                {helpersInRotation === 1 ? "helper" : "helpers"} in rotation
              </p>

              <RotationEditor
                circleId={circle.id}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                rotationShifts={rotationShifts}
              />
            </section>
          )}

          {/* Share link — admin only */}
          {joinUrl && isAdmin && (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Invite helpers</h2>
              </div>
              <p className={styles.listContext}>
                {isMealTrain
                  ? "Share this link in your group chat. Anyone who taps it sees the open days and can sign up for the ones that work for them."
                  : "Share this link in your group chat. Anyone who taps it can sign up and join the rotation."}
              </p>
              <div className={styles.shareBox}>
                <code className={styles.shareUrl}>{joinUrl}</code>
                <button
                  type='button'
                  className={styles.copyBtn}
                  onClick={copyJoinLink}
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>

              <DirectoryToggle
                circleId={circle.id}
                listed={circle.listedInDirectory}
                isMealTrain={isMealTrain}
              />
            </section>
          )}

          {/* Helpers */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                Helpers ({helpers.length})
              </h2>
            </div>
            {helpers.length === 0 ? (
              <p className={styles.emptyText}>
                No helpers yet. Share the link above to invite people.
              </p>
            ) : (
              <div className={styles.helperList}>
                {helpers.map((m) => {
                  const isSelf = m.user.id === currentUserId;
                  const nextShiftDate = nextShiftByHelper[m.user.id];
                  return (
                    <div
                      key={m.id}
                      className={`${styles.helperCard} ${isSelf ? styles.helperCardSelf : ""}`}
                    >
                      {isSelf && (
                        <span className={styles.selfPill}>This is you</span>
                      )}
                      <p className={styles.helperName}>
                        {m.user.firstName} {m.user.lastName}
                      </p>
                      <div className={styles.helperBadges}>
                        <span className={styles.roleBadge}>{m.role}</span>
                        {!isMealTrain && m.inRotation && (
                          <span className={styles.rotationBadge}>
                            In rotation
                          </span>
                        )}
                        {isMealTrain && daysByHelper[m.user.id] > 0 && (
                          <span className={styles.rotationBadge}>
                            {daysByHelper[m.user.id]}{" "}
                            {daysByHelper[m.user.id] === 1 ? "day" : "days"}
                          </span>
                        )}
                      </div>
                      {m.user.phone && (
                        <a
                          href={`tel:${m.user.phone}`}
                          className={styles.helperPhone}
                        >
                          {formatPhone(m.user.phone)}
                        </a>
                      )}
                      {m.user.email && (
                        <p className={styles.helperEmail}>{m.user.email}</p>
                      )}

                      {!isMealTrain && m.inRotation && (
                        <div className={styles.helperRotation}>
                          <p className={styles.helperRotationLabel}>
                            {rotationIntervalLabel}
                          </p>
                          {nextShiftDate && (
                            <p className={styles.helperRotationNext}>
                              Next:{" "}
                              {formatShiftFullDate(new Date(nextShiftDate))}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Danger zone */}
          {isAdmin && (
            <section className={styles.dangerSection}>
              <h2 className={styles.dangerTitle}>Danger zone</h2>
              <DeleteCircleButton
                circleId={circle.id}
                circleName={circle.name}
              />
            </section>
          )}
        </LayoutWrapper>
      </div>
    </section>
  );
}