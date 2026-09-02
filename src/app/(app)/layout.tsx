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
      {/*
        The column fills the height it is given rather than stopping at the
        bottom of its content. Nothing that simply stacks downward notices,
        because they all still start at the top; it only means a screen that
        wants something set against the bottom edge has a bottom edge to set it
        against.
      */}
      <main className="px-gutter pt-safe flex flex-1 flex-col">
        <div className="flex flex-1 flex-col pt-6 pb-8">{children}</div>
      </main>
      <TabBar />
    </AuthGate>
  );
}
