import { AuthGate } from "@/components/AuthGate";
import { TabBar } from "@/components/TabBar";

/**
 * The signed-in shell.
 *
 * Everything behind the tab bar requires an account. The sign-in screen sits
 * outside this group so it has no tab bar and no gate of its own.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <AuthGate>
      <main className="px-gutter pt-safe flex-1">{children}</main>
      <TabBar />
    </AuthGate>
  );
}
