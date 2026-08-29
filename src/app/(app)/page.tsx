import Link from "next/link";

import { BrandHeader } from "@/components/BrandHeader";
import { ScreenTitle } from "@/components/ScreenTitle";

/**
 * Today.
 *
 * The screen answers one question: what am I doing today?
 *
 * Nothing has been logged, so this is the honest empty state and the only
 * state Today can currently be in. No placeholder workout, no invented split,
 * no fake history.
 *
 * LAST WORKOUT and CARDIO are deliberately absent. Both would read "nothing"
 * on top of the empty state above them, and the spec calls for Today to stay
 * sparse. They appear once they have something real to hold.
 */
export default function TodayPage() {
  return (
    <>
      <BrandHeader />
      <ScreenTitle>Today</ScreenTitle>

      <section className="mt-3">
        <h2 className="text-hero text-ink">No workouts yet</h2>
        <p className="text-body text-muted mt-2">
          Your first one will show up here.
        </p>
      </section>

      {/*
        Gold now, because the button does something: it opens the exercise
        library. It still does not create a workout, which the destination
        screen states rather than leaving to be assumed.
      */}
      <Link
        href="/exercises"
        className="text-button bg-accent text-bg active:bg-accent-pressed mt-8 flex h-14 w-full items-center justify-center rounded-md uppercase"
      >
        Start Workout
      </Link>
    </>
  );
}
