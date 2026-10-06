const ALLOWED_ROLES = new Set(['customer', 'seller', 'rider']);
const ORDER_ID = /^[a-f0-9]{24}$/i;

export type SocketUser = {
  _id: string;
  name: string;
  role: 'customer' | 'seller' | 'rider';
  restaurantId?: string | null;
};

export function isValidSocketUser(value: unknown): value is SocketUser {
  if (!value || typeof value !== 'object') return false;
  const user = value as Record<string, unknown>;
  return typeof user._id === 'string' && user._id.length > 0 && user._id.length <= 128
    && typeof user.name === 'string' && user.name.length <= 200
    && typeof user.role === 'string' && ALLOWED_ROLES.has(user.role)
    && (user.restaurantId === undefined || user.restaurantId === null || typeof user.restaurantId === 'string');
}

export function isValidOrderId(value: unknown): value is string {
  return typeof value === 'string' && ORDER_ID.test(value);
}

export function normalizeLocationUpdate(data: unknown) {
  if (!data || typeof data !== 'object') return null;
  const input = data as Record<string, unknown>;
  if (!isValidOrderId(input.orderId)) return null;
  const latitude = Number(input.latitude);
  const longitude = Number(input.longitude);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return null;
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return null;
  return { orderId: input.orderId, latitude, longitude };
}

export function normalizeChatMessage(data: unknown) {
  if (!data || typeof data !== 'object') return null;
  const input = data as Record<string, unknown>;
  if (!isValidOrderId(input.orderId) || typeof input.message !== 'string') return null;
  const message = input.message.trim();
  if (!message || message.length > 2000) return null;
  return { orderId: input.orderId, message };
}

export function createEventRateLimiter({ maxEvents, windowMs, now = Date.now }: {
  maxEvents: number; windowMs: number; now?: () => number;
}) {
  let windowStart = now();
  let count = 0;
  return {
    allow() {
      const current = now();
      if (current - windowStart >= windowMs) {
        windowStart = current;
        count = 0;
      }
      if (count >= maxEvents) return false;
      count += 1;
      return true;
    },
  };
}
