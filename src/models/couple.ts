export type CoupleMember = {
  id: string;
  coupleId: string;
  userId: string;
  username: string;
  createdAt: string;
};

export type Couple = {
  id: string;
  inviteCode: string;
  createdBy: string;
  createdAt: string;
  members: CoupleMember[];
};

export type CoupleStore = {
  couples: Record<string, Couple>;
  userCoupleMap: Record<string, string>;
};
