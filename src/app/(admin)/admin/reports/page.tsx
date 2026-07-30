import { redirect } from "next/navigation";

// No report-index UI exists yet — reports are opened per-lead from the
// Pipeline table ("Open Deck"). Redirect here rather than 404 so the
// command palette's "Reports" nav item resolves to something real.
export default function AdminReportsIndexPage() {
  redirect("/admin");
}
