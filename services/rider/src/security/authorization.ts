export type RiderIdentity = {
  _id: string;
  role: string | null;
};

export function isRider(user: RiderIdentity | null | undefined): boolean {
  return user?.role === "rider";
}
