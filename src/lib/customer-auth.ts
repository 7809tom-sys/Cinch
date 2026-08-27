import { cookies } from "next/headers";
import {
  createCustomerSession,
  destroyCustomerSession,
  getCustomerFromSessionToken,
  type CustomerAccount,
} from "./customers";

export const CUSTOMER_SESSION_COOKIE = "cinch_customer_session";

export function customerSessionCookieOptions(maxAge = 30 * 24 * 60 * 60) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export async function getCurrentCustomer(): Promise<CustomerAccount | null> {
  const jar = await cookies();
  const token = jar.get(CUSTOMER_SESSION_COOKIE)?.value;
  return getCustomerFromSessionToken(token);
}

export async function establishCustomerSession(
  customerId: string,
): Promise<void> {
  const { token } = await createCustomerSession(customerId);
  const jar = await cookies();
  jar.set(CUSTOMER_SESSION_COOKIE, token, customerSessionCookieOptions());
}

/**
 * For Route Handlers. Sets the cookie directly via next/headers `cookies()`
 * (supported in Route Handlers, not just Server Actions/Components) rather
 * than `NextResponse.cookies.set()`, matching the primitive every other
 * working login path in this app already uses.
 */
export async function establishCustomerSessionCookie(customerId: string) {
  const { token } = await createCustomerSession(customerId);
  const jar = await cookies();
  jar.set(CUSTOMER_SESSION_COOKIE, token, customerSessionCookieOptions());
  return { token, cookieOptions: customerSessionCookieOptions() };
}

export async function clearCustomerSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(CUSTOMER_SESSION_COOKIE)?.value;
  await destroyCustomerSession(token);
  jar.delete(CUSTOMER_SESSION_COOKIE);
}

export function customerOwnsProject(
  customer: CustomerAccount,
  projectId: string,
): boolean {
  return customer.projectIds.includes(projectId);
}
