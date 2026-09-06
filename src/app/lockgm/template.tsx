import { LockgmAnalyticsTracker } from "./components/analytics-tracker";

export default function LockgmTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <LockgmAnalyticsTracker />
      {children}
    </>
  );
}
