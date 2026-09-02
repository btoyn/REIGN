/**
 * Sending a finished session to Apple Health.
 *
 * FIRST, WHAT THIS IS NOT, because it explains the shape of everything below.
 *
 * REIGN cannot write to Apple Health. HealthKit is a native iOS framework and
 * there is no browser API for it — not a restricted one, not one behind a
 * permission prompt, none. A web page on a home screen has no route to it. No
 * package, bridge, wrapper or native shell is used here, and none would be
 * honest to add to something that is deliberately a web app.
 *
 * What iOS does allow is opening a Shortcut by URL. So REIGN hands the session
 * to a Shortcut the owner builds on their own phone, and the Shortcut — which
 * is native, and does have HealthKit — writes it.
 *
 * THAT MAKES THE EXPORT A ONE-WAY DOOR. iOS opens the link and tells the page
 * nothing about what happened afterwards: no callback, no error, no result. A
 * Shortcut that does not exist, or is named something else, fails exactly as
 * silently as one that worked. Nothing here may therefore report success, and
 * everything here is built for the failure being invisible:
 *
 *   * the card stays on screen after the button is tapped, because there is no
 *     "done" to move on from;
 *   * the same details are shown in words underneath, always, so the session
 *     can be typed into Health by hand when the link does nothing;
 *   * whether it arrived is recorded only when the owner says it did.
 *
 * NOTHING IS INVENTED. No calories, no heart rate. The owner does not measure
 * them and a plausible number in Health is worse than no number, because
 * nothing downstream can tell it was guessed.
 */

/**
 * What Health is told the session was.
 *
 * Two values, because the Shortcut is built to handle two. A strength session
 * is REIGN's workouts — sets of an exercise — and a cycling session is a ride.
 *
 * Program day kinds map onto these: strength stays strength, and both zone 2
 * and VO2 max are cycling, since both are done on the bike. That mapping lives
 * where the session is read rather than here, because what actually decides the
 * type is what was recorded: a workout holds sets, and sets are strength, on
 * whichever day they happened.
 */
export type HealthType = "strength" | "cycling";

/** A session ready to be handed over. */
export type HealthSession = {
  type: HealthType;
  start: Date;
  end: Date;
};

/** The Shortcut's name if the owner has not set one. */
export const DEFAULT_SHORTCUT_NAME = "LogREIGN";

/**
 * How long the session took, in whole minutes.
 *
 * Measured from the two instants that were recorded as they happened, never
 * from what a program planned. A workout that was meant to take an hour and
 * took ninety minutes took ninety minutes.
 */
export function durationMinutes(session: HealthSession): number {
  return Math.round((session.end.getTime() - session.start.getTime()) / 60000);
}

/**
 * Sessions too short to be worth sending.
 *
 * A workout started and finished by mistake is nought minutes long, and a
 * nought-minute workout in Health is a wrong entry to find and delete later
 * rather than a record of anything. Same argument as not writing calories.
 */
export function isTooShort(session: HealthSession): boolean {
  return durationMinutes(session) < 1;
}

/**
 * An instant as ISO 8601 with the offset it happened at, e.g.
 * "2026-09-02T17:52:00-07:00".
 *
 * Not toISOString(), which is also ISO 8601 but always in UTC with a Z. Both
 * name the same instant, and Health would accept either, but the offset says
 * which evening this was where the owner was standing. A ride at 6pm in
 * California reads as 01:00 the following day in UTC, and a session that lands
 * in Health on the wrong side of midnight is a session on the wrong day.
 */
export function isoWithOffset(when: Date): string {
  const pad = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, "0");

  // getTimezoneOffset is minutes to ADD to local to reach UTC, so it runs
  // backwards from the sign an ISO offset uses: UTC-7 reports +420.
  const offset = -when.getTimezoneOffset();
  const sign = offset < 0 ? "-" : "+";

  const date = `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())}`;
  const time = `${pad(when.getHours())}:${pad(when.getMinutes())}:${pad(when.getSeconds())}`;
  return `${date}T${time}${sign}${pad(offset / 60)}:${pad(offset % 60)}`;
}

/**
 * The payload, before it is encoded.
 *
 * Four fields, comma separated, in this order and no other:
 *
 *     workoutType,durationMinutes,startISO,endISO
 *
 * The order is the contract with the Shortcut, which splits on commas and
 * reads by position. Nothing here may be reordered, and nothing may be added in
 * the middle, without the Shortcut being changed to match.
 *
 * No field can itself contain a comma: the type is one of two fixed words, the
 * duration is an integer, and an ISO instant has none. That is what makes
 * splitting on commas safe rather than lucky.
 */
export function payload(session: HealthSession): string {
  return [
    session.type,
    String(durationMinutes(session)),
    isoWithOffset(session.start),
    isoWithOffset(session.end),
  ].join(",");
}

/**
 * The link that opens the Shortcut.
 *
 * Both the name and the payload are percent-encoded, and both need it. The
 * payload carries colons, plus signs and commas, all of which mean something in
 * a query string: an unencoded "+" in an offset would arrive as a space and the
 * Shortcut would read a broken timestamp. The name needs it because a Shortcut
 * may be called "Log REIGN" and an unencoded space ends the URL early.
 */
export function shortcutLink(session: HealthSession, name: string): string {
  const shortcut = encodeURIComponent(name.trim() || DEFAULT_SHORTCUT_NAME);
  return `shortcuts://run-shortcut?name=${shortcut}&input=text&text=${encodeURIComponent(payload(session))}`;
}

/**
 * The same session in words, for typing into Health by hand.
 *
 * Always shown, never behind a toggle. The deep link can fail without saying
 * so, and a fallback hidden behind "show details" is a fallback that is not
 * there at the moment it is needed — standing in a gym, having tapped a button
 * that appeared to do nothing.
 *
 * Labelled pairs rather than a sentence, because Health's own manual entry asks
 * for exactly these four things in this order.
 */
export function readableLines(session: HealthSession): [string, string][] {
  return [
    ["Type", session.type === "cycling" ? "Cycling" : "Strength training"],
    ["Start", readableInstant(session.start)],
    ["End", readableInstant(session.end)],
    ["Duration", describeMinutes(durationMinutes(session))],
  ];
}

/** The fallback block as one block of text, for the copy button. */
export function readableText(session: HealthSession): string {
  return readableLines(session)
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n");
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/**
 * "Wednesday 2 September 2026, 5:52 pm".
 *
 * Written out rather than left to toLocaleString, so what is on screen is what
 * the code says it is. This is the text the owner reads off and types into
 * another app, so an ambiguous 09/02 that could be either month is the one
 * thing it must never be.
 */
export function readableInstant(when: Date): string {
  const day = `${DAYS[when.getDay()]} ${when.getDate()} ${MONTHS[when.getMonth()]} ${when.getFullYear()}`;

  const hours = when.getHours();
  const suffix = hours < 12 ? "am" : "pm";
  // Midnight and noon are both 12, not 0.
  const twelve = hours % 12 === 0 ? 12 : hours % 12;
  const minutes = String(when.getMinutes()).padStart(2, "0");

  return `${day}, ${twelve}:${minutes} ${suffix}`;
}

/** "52 minutes", and "1 minute" when it is one. */
export function describeMinutes(minutes: number): string {
  return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
}
