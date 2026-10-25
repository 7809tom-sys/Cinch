/**
 * Hometown Runner is in testing until the master admin turns it off.
 * A kitchen can also be marked testing on its own, and that stays on
 * after the site goes live.
 */

export function hometownSiteTesting(ops: { hometownTesting?: boolean } | null | undefined): boolean {
  return ops?.hometownTesting !== false;
}

export function kitchenIsTesting(
  restaurant: { testing?: boolean } | null | undefined,
): boolean {
  return restaurant?.testing === true;
}

/** A row written during testing keeps the mark after the site switch is turned off. */
export function recordIsTest(
  ops: { hometownTesting?: boolean } | null | undefined,
  restaurant: { testing?: boolean } | null | undefined,
  row?: { test?: boolean } | null,
): boolean {
  return Boolean(row?.test) || hometownSiteTesting(ops) || kitchenIsTesting(restaurant);
}

export function shouldStampTest(
  ops: { hometownTesting?: boolean },
  restaurant: { testing?: boolean } | null | undefined,
): boolean {
  return hometownSiteTesting(ops) || kitchenIsTesting(restaurant);
}

type TestMarked = { test?: boolean };

function freezeTestingRows<R extends TestMarked>(rows: R[] | undefined): R[] {
  return (rows ?? []).map((row) =>
    row.test === false ? row : { ...row, test: true },
  );
}

/**
 * Turning Testing off freezes every row that is not already a live record.
 * Rows written after go-live keep test: false. Turning Testing back on does
 * not relabel those live rows.
 */
export function setHometownTesting<
  T extends {
    hometownTesting?: boolean;
    ledger?: TestMarked[];
    tickets?: TestMarked[];
    runs?: TestMarked[];
  },
>(ops: T, on: boolean): T {
  if (on) return { ...ops, hometownTesting: true };
  return {
    ...ops,
    hometownTesting: false,
    ledger: freezeTestingRows(ops.ledger),
    tickets: freezeTestingRows(ops.tickets),
    runs: freezeTestingRows(ops.runs),
  };
}

export function setKitchenTesting<
  T extends { restaurants: Array<{ id: string; testing?: boolean }> },
>(ops: T, restaurantId: string, on: boolean): T {
  return {
    ...ops,
    restaurants: ops.restaurants.map((row) =>
      row.id === restaurantId ? { ...row, testing: on } : row,
    ),
  };
}
