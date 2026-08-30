"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";

import { ExercisePicker } from "@/components/ExercisePicker";
import { ScreenTitle } from "@/components/ScreenTitle";
import { quiet } from "@/components/controls";
import { Exercise } from "@/lib/exercises";
import { addExerciseToWorkout } from "@/lib/workouts";

/**
 * Add an exercise to the workout.
 *
 * The picker only ever appears with somewhere to put its answer, so a tap does
 * something. There is no browse-only version of this screen: one that recorded
 * nothing was worse than not having it.
 */
export default function AddExercisePage({
  params,
}: PageProps<"/workout/[id]/add">) {
  const { id } = use(params);
  const router = useRouter();
  const [picking, setPicking] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  async function pick(exercise: Exercise) {
    setPicking(exercise.id);
    setFailed(false);
    try {
      await addExerciseToWorkout(id, exercise.id);
      router.push(`/workout/${id}`);
    } catch (e) {
      console.error("addExerciseToWorkout failed", e);
      setFailed(true);
      setPicking(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <ScreenTitle>Add exercise</ScreenTitle>
        {failed ? (
          <p role="alert" className="text-body text-ink">
            Could not add that exercise. Check your connection and try again.
          </p>
        ) : null}
      </div>

      <ExercisePicker onPick={pick} picking={picking} />

      <Link href={`/workout/${id}`} className={`${quiet} self-start`}>
        Cancel
      </Link>
    </div>
  );
}
