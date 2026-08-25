import { redirect } from "next/navigation";
import { getMasterSession } from "@/lib/master-auth";

export const dynamic = "force-dynamic";

export default async function GatedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getMasterSession();
  if (!session) {
    redirect("/admin/login");
  }

  return <>{children}</>;
}
