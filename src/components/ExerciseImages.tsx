"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * The movement, as two photographs alternating.
 *
 * Every exercise in the library has a start position and an end position, shot
 * from one fixed camera, so alternating them shows what the movement actually
 * is. That is the thing text cannot tell you, and it is why there are no muscle
 * diagrams here: the muscle is already written down.
 *
 * A hard cut with a hold on each frame, which is what the owner picked after
 * seeing the alternatives.
 *
 * The paths derive from the exercise id, so this needs no stored data.
 */

const HOST =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";

/** How long each frame is held. */
const HOLD_MS = 1400;

/**
 * How long to wait before giving up.
 *
 * An img element has no timeout of its own and will wait as long as the network
 * allows; that was measured at 29 seconds on a failing connection. A photograph
 * that arrives after the set is finished is worth nothing, so there is a
 * deadline.
 */
const DEADLINE_MS = 6000;

type Status = "loading" | "ready" | "failed";

export function ExerciseImages({
  exerciseId,
  exerciseName,
}: {
  exerciseId: string;
  exerciseName: string;
}) {
  const [status, setStatus] = useState<Status>("loading");
  const [phase, setPhase] = useState<0 | 1>(0);
  const [attempt, setAttempt] = useState(0);
  const loaded = useRef(0);

  /*
    The deadline. Cleared as soon as both frames are in.

    Nothing is reset here: retrying is a tap, which sets the state in its own
    handler, and a different exercise remounts this component because the caller
    keys it by exercise. Both keep the effect free of a synchronous setState,
    which is a cascading render.
  */
  useEffect(() => {
    const timer = setTimeout(() => {
      setStatus((current) => (current === "ready" ? current : "failed"));
    }, DEADLINE_MS);
    return () => clearTimeout(timer);
  }, [attempt]);

  useEffect(() => {
    if (status !== "ready") return;
    // Someone who has asked for less motion gets the start position, held.
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (still) return;
    const timer = setInterval(
      () => setPhase((p) => (p === 0 ? 1 : 0)),
      HOLD_MS,
    );
    return () => clearInterval(timer);
  }, [status]);

  function frameLoaded() {
    loaded.current += 1;
    if (loaded.current >= 2) setStatus("ready");
  }

  const common = "absolute inset-0 h-full w-full object-cover transition-none";

  return (
    <div
      /*
        The frame holds its shape from the first paint, so nothing on the screen
        moves when the photographs arrive and nothing moves when they fail.
      */
      className="bg-raised relative w-full overflow-hidden rounded-md"
      style={{ aspectRatio: "850 / 567" }}
    >
      {status !== "failed" ? (
        <>
          {[0, 1].map((n) => (
            <Image
              key={`${attempt}-${n}`}
              src={`${HOST}/${exerciseId}/${n}.jpg`}
              alt={
                n === 0
                  ? `${exerciseName}, start of the movement`
                  : `${exerciseName}, end of the movement`
              }
              fill
              sizes="(max-width: 480px) 100vw, 480px"
              priority={n === 0}
              onLoad={frameLoaded}
              onError={() => setStatus("failed")}
              className={`${common} ${phase === n ? "opacity-100" : "opacity-0"}`}
            />
          ))}
        </>
      ) : null}

      {/*
        A sentence, never a broken image icon, and the frame itself is the
        retry, so this adds no control to the screen.
      */}
      {status === "failed" ? (
        <button
          type="button"
          onClick={() => {
            loaded.current = 0;
            setStatus("loading");
            setAttempt((n) => n + 1);
          }}
          className="text-body text-muted absolute inset-0 flex items-center justify-center px-6 text-center"
        >
          Could not load the photographs. Tap to try again.
        </button>
      ) : null}
    </div>
  );
}
