import { cookies } from "next/headers";
import {
  createCustomerSession,
  destroyCustomerSession,
  getCustomerFromSessionToken,
  type CustomerAccount,
} from "./customers";

export const CUSTOMER_SESSION_COOKIE = "cinch_customer_session";

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
  jar.set(CUSTOMER_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
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
