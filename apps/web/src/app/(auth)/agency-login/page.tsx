import { redirect } from "next/navigation";

export default function AgencyLoginPage() {
  redirect("/login?role=agency");
}

