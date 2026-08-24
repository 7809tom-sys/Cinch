import Link from "next/link";
import Image from "next/image";
import { getSessionUser } from "@/lib/session";

/** Header account state: avatar + first name + sign out when signed in. */
export async function AccountChip() {
  const user = await getSessionUser();

  if (!user) {
    return (
      <Link href="/coupons" className="transition-colors hover:text-foam">
        Sign in
      </Link>
    );
  }

  const initial = user.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="flex items-center gap-3">
      <span className="flex items-center gap-2">
        {user.picture ? (
          <Image
            src={user.picture}
            alt=""
            width={28}
            height={28}
            className="rounded-full"
            unoptimized
          />
        ) : (
          <span className="grid h-7 w-7 place-items-center rounded-full bg-brand text-xs font-bold text-background">
            {initial}
          </span>
        )}
        <span className="hidden text-sm font-medium text-foam sm:inline">
          {user.name.split(" ")[0]}
        </span>
      </span>
      <form action="/api/auth/logout" method="post">
        <button
          type="submit"
          className="text-sm font-medium text-mist transition-colors hover:text-foam"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
