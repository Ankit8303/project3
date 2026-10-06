export const ORDER_STATUSES = [
  "placed",
  "accepted",
  "preparing",
  "ready_for_rider",
  "rider_assigned",
  "picked_up",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

const transitions: Record<OrderStatus, readonly OrderStatus[]> = {
  placed: ["accepted", "cancelled"],
  accepted: ["preparing"],
  preparing: ["ready_for_rider"],
  ready_for_rider: ["rider_assigned"],
  rider_assigned: ["picked_up"],
  picked_up: ["delivered"],
  delivered: [],
  cancelled: [],
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return transitions[from]?.includes(to) ?? false;
}

export function assertOrderTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransitionOrder(from, to)) {
    throw new Error(`Invalid order transition: ${from} -> ${to}`);
  }
}

export function allowedNextStatuses(from: OrderStatus): readonly OrderStatus[] {
  return transitions[from] ?? [];
}
