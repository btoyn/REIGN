import Link from "next/link";

import { PersonalRecord, describeRecord } from "@/lib/records";
import { shortDate } from "@/lib/progress";

/**
 * A list of personal records.
 *
 * Shared by the few on Progress and the full list behind them, so the two can
 * never drift into saying the same thing two ways.
 *
 * A row opens that lift's history over time, which is the third part of
 * Progress. Until that existed the rows deliberately went nowhere, because a
 * row that looks tappable and is not is worse than one that plainly is not.
 */
export function RecordRows({ records }: { records: PersonalRecord[] }) {
  return (
    <ul>
      {records.map((record) => (
        <li
          key={record.exerciseId}
          className="border-border border-b last:border-b-0"
        >
          <Link
            href={`/progress/exercise/${encodeURIComponent(record.exerciseId)}`}
            className="block py-4"
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
          </Link>
        </li>
      ))}
    </ul>
  );
}
