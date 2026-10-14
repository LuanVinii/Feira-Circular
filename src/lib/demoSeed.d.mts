export type DemoSeedProfile = "comerciante" | "restaurante" | "admin";
export interface DemoSeedListing {
  id: string;
  kind: "Oferta" | "Pedido";
  food: string;
  category: string;
  amount: number;
  unit: string;
  maturity: string;
  neighborhood: string;
  day: number;
  status: string;
}
export function makeDemoListings(profile: DemoSeedProfile): DemoSeedListing[];
export function makeEquivalentDemoWeight(quantityG: number, index: number): number;
export function applyDemoMeetingTransition<T extends {
  encontros: Array<{ id: string; [key: string]: unknown }>;
  propostas: Array<{ id: string; status: string; [key: string]: unknown }>;
}>(state: T, transition: {
  meetingId: string;
  proposalId: string;
  meetingValues: Record<string, unknown>;
  proposalStatus: string;
}): T | null;
