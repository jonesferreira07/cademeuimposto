import { Dashboard } from "@/components/dashboard";
import { brazilDate } from "@/lib/finance";
export const dynamic = "force-dynamic";
export default function Home() {
  const now = brazilDate();
  return <Dashboard initialMonth={now.year === 2026 ? Math.max(1, now.month - 1) : 12} />;
}
