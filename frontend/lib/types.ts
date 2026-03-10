/**
 * Shared TypeScript types matching backend Pydantic schemas.
 */

// ── Auth ───────────────────────────────────────────
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string | null;
  createdAt: string;
}

// ── Trip ───────────────────────────────────────────
export type TripStatus = "upcoming" | "ongoing" | "completed";
export type MemberRole = "owner" | "editor" | "viewer";

export interface TripMember {
  userId: string;
  name: string;
  email: string;
  role: MemberRole;
  avatar?: string | null;
}

export interface TripSummary {
  id: string;
  title: string;
  destination: string;
  coverPhoto?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status: TripStatus;
  ownerId: string;
  memberCount: number;
  memoryCount: number;
  totalExpenses: number;
}

export interface TripDetail extends TripSummary {
  description: string;
  members: TripMember[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTripPayload {
  title: string;
  destination?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  coverPhoto?: string;
}

// ── Memory ─────────────────────────────────────────
export type MemoryType = "photo" | "video" | "note";

export interface Memory {
  id: string;
  tripId: string;
  userId: string;
  type: MemoryType;
  fileUrl?: string | null;
  thumbnailUrl?: string | null;
  caption: string;
  location: string;
  tags: string[];
  date?: string | null;
  createdAt: string;
}

export interface CreateMemoryPayload {
  type?: MemoryType;
  fileUrl?: string;
  caption?: string;
  location?: string;
  tags?: string[];
  date?: string;
}

// ── Expense ────────────────────────────────────────
export type ExpenseCategory =
  | "food"
  | "transport"
  | "accommodation"
  | "sightseeing"
  | "shopping"
  | "misc";

export interface SplitEntry {
  userId: string;
  share: number;
}

export interface Expense {
  id: string;
  tripId: string;
  userId: string;
  category: ExpenseCategory;
  amount: number;
  currency: string;
  amountBase?: number | null;
  baseCurrency: string;
  description: string;
  paidBy: string;
  splitWith: SplitEntry[];
  date?: string | null;
  createdAt: string;
}

export interface ExpenseSummary {
  totalBase: number;
  baseCurrency: string;
  byCategory: Record<string, number>;
  byPerson: Record<string, number>;
}

// ── Itinerary ──────────────────────────────────────
export interface ItineraryItem {
  id: string;
  tripId: string;
  day: number;
  title: string;
  time?: string | null;
  notes: string;
  location: string;
  isVisited: boolean;
  memoryIds: string[];
  createdAt: string;
}

// ── Food Log ───────────────────────────────────────
export interface FoodLog {
  id: string;
  tripId: string;
  userId: string;
  name: string;
  location: string;
  rating?: number | null;
  photos: string[];
  notes: string;
  date?: string | null;
  createdAt: string;
}

// ── Ticket ─────────────────────────────────────────
export type TicketType = "flight" | "hotel" | "event";

export interface Ticket {
  id: string;
  tripId: string;
  userId: string;
  type: TicketType;
  title: string;
  fileUrl?: string | null;
  date?: string | null;
  notes: string;
  createdAt: string;
}

// ── Upload ─────────────────────────────────────────
export interface SASResponse {
  uploadUrl: string;
  blobName: string;
  expiresAt: string;
}
