import { PersonalRecord, describeRecord } from "@/lib/records";
import { shortDate } from "@/lib/progress";

/**
 * A list of personal records.
 *
 * Shared by the few on Progress and the full list behind them, so the two can
 * never drift into saying the same thing two ways.
 *
 * The rows do not link anywhere. One exercise's history over time is the next
 * part of M7, and a row that looks tappable and is not would be worse than a
 * row that plainly is not.
 */
export function RecordRows({ records }: { records: PersonalRecord[] }) {
  return (
    <ul>
      {records.map((record) => (
        <li
          key={record.exerciseId}
          className="border-border border-b py-4 last:border-b-0"
        >
          <p className="text-lead text-ink">{record.name}</p>
          {/*
            The lift and when it was set, on one line under the name rather
            than in a column on the right. Exercise names run long — "Barbell
            Bench Press - Medium Grip" — and a date in a right-hand column
            would push them into wrapping on a phone.
          */}
          <p className="text-body text-muted mt-1">
            {describeRecord(record)} · {shortDate(record.date)}
          </p>
        </li>
      ))}
    </ul>
  );
}
