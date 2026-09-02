import { DayCardio, cardioMinutes, describeCardioPlan } from "@/lib/programs";

/**
 * What a cardio day asks for.
 *
 * A zone 2 day has no exercises and no reps. It has a machine and a length of
 * time, and before this it rendered as an empty exercise list — a day that
 * looked like a day with nothing in it rather than a day with a bike ride in it.
 *
 * The structure is shown rather than summarised. "4 × 4 min hard / 4 min easy"
 * is the session; a total of 52 minutes is not enough to do it from.
 *
 * Every number here is assembled at render time from the stored integers. The
 * database holds minutes and rounds, never a sentence.
 */
export function CardioPlan({ cardio }: { cardio: DayCardio }) {
  const total = cardioMinutes(cardio);
  const intervals = cardio.warmup_min !== null;

  return (
    <div className="flex flex-col gap-1">
      <p className="text-lead text-ink">{cardio.machine}</p>
      <p className="text-body text-muted">{describeCardioPlan(cardio)}</p>
      {/*
        The total, only for the days whose length has to be added up. A steady
        45 to 55 minutes already says how long it takes, and repeating it as
        "55 min in total" would be the same fact twice.
      */}
      {intervals && total !== null ? (
        <p className="text-body text-muted tabular-nums">
          {total} min in total
        </p>
      ) : null}
    </div>
  );
}
