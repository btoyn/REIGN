import { BrandHeader } from "@/components/BrandHeader";
import { ScreenTitle } from "@/components/ScreenTitle";

/**
 * Today.
 *
 * The screen answers one question: what am I doing today?
 *
 * There is no database yet and nothing has been logged, so this is the honest
 * empty state and the only state Today can currently be in. No placeholder
 * workout, no invented split, no fake history.
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
        The primary action is deliberately not gold. Gold marks the live
        primary action, and logging does not exist yet. It becomes a working
        gold button when the logging engine lands.
      */}
      <div className="mt-8">
        <button
          type="button"
          disabled
          className="text-button bg-surface text-muted border-border rounded-md h-14 w-full cursor-not-allowed border uppercase"
        >
          Start Workout
        </button>
        <p className="text-body text-muted mt-3 text-center">
          Logging arrives next.
        </p>
      </div>
    </>
  );
}
