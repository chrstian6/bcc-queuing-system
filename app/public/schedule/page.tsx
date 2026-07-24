// app/public/schedule/page.tsx
// The former standalone get-ticket form here was broken by design (registrar
// transaction types with no amount/campus, always rejected server-side). The
// working kiosk flow is the home page's TransactionModal, and document
// requests now live in the student portal.
import { redirect } from "next/navigation";

export default function SchedulePage() {
  redirect("/");
}
