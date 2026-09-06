import { LockgmAnalyticsTracker } from "@/app/lockgm/components/analytics-tracker";

export default function LoginTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <LockgmAnalyticsTracker forcedEvent="signup_started" surface="default" />
      {children}
    </>
  );
}
