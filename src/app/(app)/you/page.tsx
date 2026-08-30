import { ScreenTitle } from "@/components/ScreenTitle";
import { SignOutButton } from "@/components/SignOutButton";

/**
 * You.
 *
 * Sign out is the only thing here that works, and it is not what the screen is
 * for, so it is not gold. The rest is stated rather than left blank.
 */
export default function YouPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <ScreenTitle>You</ScreenTitle>
        <p className="text-body text-muted">
          Units, rest timer length and your split live here once there is
          something worth changing about them.
        </p>
      </div>
      <SignOutButton />
    </div>
  );
}
