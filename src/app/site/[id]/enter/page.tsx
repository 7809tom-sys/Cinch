import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DriverDocumentDesk } from "@/components/delivery/driver-documents";
import { HometownRoleLogin } from "@/components/delivery/role-login";
import { prepareDriverAccount } from "@/lib/hometown-kitchen-session";
import { isMasterEmail } from "@/lib/master-auth";
import { getHometownRoleSession, isHometownRole } from "@/lib/hometown-role";
import { seedNeedsDeliveryOps } from "@/lib/seed-delivery-io";
import { getProject } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function HometownRoleLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ role?: string; r?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const project = await getProject(id);
  if (!project) notFound();
  if (!seedNeedsDeliveryOps(project.name, project.brief)) {
    redirect(`/site/${id}`);
  }
  const initialRole = query.role && isHometownRole(query.role) ? query.role : undefined;
  const session = await getHometownRoleSession(id);
  const driverAccount =
    session?.role === "driver"
      ? await prepareDriverAccount(id, session.email)
      : null;
  const signedInDriver =
    driverAccount && driverAccount.ok ? driverAccount.driver : null;

  return (
    <main className="min-h-dvh bg-background px-4 py-8 text-foreground sm:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-8">
          <p className="text-xs font-bold tracking-[0.14em] text-accent-deep uppercase">
            Hometown Runner
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-extrabold text-brand-deep">
            Role-based login
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Sign in as a customer, merchant, or driver. Guest diners can still{" "}
            <Link className="font-semibold text-brand-deep underline" href={`/site/${id}/shop`}>
              order without an account
            </Link>
            .{" "}
            <Link className="font-semibold text-brand-deep underline" href={`/hometown/account?market=${id}`}>
              Delete the login on this device
            </Link>
            .
          </p>
        </header>
        {signedInDriver ? (
          <div className="mb-8">
            <DriverDocumentDesk
              projectId={id}
              driverId={signedInDriver.id}
              documents={signedInDriver.documents}
              signature={signedInDriver.documentSignature}
              w9={signedInDriver.w9}
              packetRequired={signedInDriver.packetRequired === true}
              viewerIsMaster={isMasterEmail(session?.email)}
            />
          </div>
        ) : null}
        <HometownRoleLogin
          projectId={id}
          initialRole={initialRole}
          inviteId={query.r?.trim() || undefined}
        />
      </div>
    </main>
  );
}
