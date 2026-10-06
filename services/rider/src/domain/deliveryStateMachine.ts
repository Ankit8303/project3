export type RiderDeliveryStatus =
  | "available"
  | "reserved"
  | "assigned"
  | "picked_up"
  | "delivered";

const transitions: Record<RiderDeliveryStatus, readonly RiderDeliveryStatus[]> = {
  available: ["reserved"],
  reserved: ["assigned", "available"],
  assigned: ["picked_up"],
  picked_up: ["delivered"],
  delivered: ["available"],
};

export function canTransitionRiderDelivery(
  from: RiderDeliveryStatus,
  to: RiderDeliveryStatus,
): boolean {
  return transitions[from].includes(to);
}

export function assertRiderDeliveryTransition(
  from: RiderDeliveryStatus,
  to: RiderDeliveryStatus,
): void {
  if (!canTransitionRiderDelivery(from, to)) {
    throw new Error(`Invalid rider delivery transition: ${from} -> ${to}`);
  }
}
