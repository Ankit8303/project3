export type AuthorizationUser = {
  _id: string;
  role: string | null;
};

export type OrderOwnership = {
  userId: string;
  restaurantId: string;
  status?: string;
};

export function canViewCustomerOrder(user: AuthorizationUser, order: OrderOwnership): boolean {
  return user.role === "customer" && order.userId === user._id;
}

export function canManageRestaurantOrder(
  user: AuthorizationUser,
  order: OrderOwnership,
  restaurantOwnerId: string,
): boolean {
  return user.role === "seller" && order.restaurantId === restaurantOwnerId;
}

export function canCancelCustomerOrder(user: AuthorizationUser, order: OrderOwnership): boolean {
  return user.role === "customer" && order.userId === user._id && order.status === "placed";
}

export function canReviewDeliveredOrder(user: AuthorizationUser, order: OrderOwnership): boolean {
  return user.role === "customer" && order.userId === user._id && order.status === "delivered";
}
