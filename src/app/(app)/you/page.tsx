import { Lockup } from "@/components/Lockup";
import { ScreenTitle } from "@/components/ScreenTitle";
import { SignOutButton } from "@/components/SignOutButton";

/**
 * You.
 *
 * Sign out is the only thing here that works, and it is not what the screen is
 * for, so it is not gold. The rest is stated rather than left blank.
 *
 * The lockup sits at the foot, which is the only place in the app it can go
 * without getting in the way. Every other screen is answering a question mid
 * workout — what did I lift, what is next, how many reps — and a logo on any
 * of them is a logo between the owner and the answer. This screen asks nothing
 * of anyone, so the space below the last control is genuinely spare.
 *
 * Left aligned, on the app's own background, with no box around it. Everything
 * in REIGN starts at the same left edge, and centring the mark would make it
 * the one thing on the screen arranged to a different rule. It is not the
 * screen's action either: sign out is, so the lockup is set below it and left
 * quiet.
 *
 * Set against the bottom of the screen rather than trailing the last control.
 * There is almost nothing on this screen yet, so a mark that follows the copy
 * lands a third of the way down with a field of black under it, which reads as
 * a page that was cut off. At the bottom it reads as a signature. When settings
 * do arrive and the content grows past the screen, the margin stops pushing and
 * the mark simply follows them.
 */
export default function YouPage() {
  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="flex flex-col gap-3">
        <ScreenTitle>You</ScreenTitle>
        <p className="text-body text-muted">
          Units, rest timer length and your split live here once there is
          something worth changing about them.
        </p>
      </div>
      <SignOutButton />
      <div className="mt-auto pt-16">
        <Lockup />
      </div>
    </div>
  );
}
