const foods = [
  ["Manga", "Frutas", "madura"], ["Banana-da-terra", "Frutas", "no ponto"], ["Tomate italiano", "Legumes", "verde"], ["Couve manteiga", "Verduras", "fresca"], ["Abóbora", "Legumes", "madura"], ["Mamão formosa", "Frutas", "maduro"], ["Cenoura", "Legumes", "fresca"], ["Alface crespa", "Verduras", "fresca"], ["Melancia", "Frutas", "no ponto"], ["Pimentão verde", "Legumes", "fresco"], ["Laranja pera", "Frutas", "madura"], ["Coentro", "Verduras", "fresco"], ["Batata-doce", "Legumes", "fresca"], ["Abacaxi pérola", "Frutas", "maduro"], ["Repolho", "Verduras", "fresco"], ["Cebola roxa", "Legumes", "fresca"], ["Goiaba", "Frutas", "madura"], ["Chuchu", "Legumes", "fresco"], ["Rúcula", "Verduras", "fresca"], ["Limão tahiti", "Frutas", "fresco"], ["Beterraba", "Legumes", "fresca"], ["Pepino", "Legumes", "fresco"], ["Maracujá", "Frutas", "maduro"], ["Espinafre", "Verduras", "fresco"], ["Milho verde", "Legumes", "fresco"], ["Acerola", "Frutas", "madura"], ["Vagem", "Legumes", "fresca"], ["Caju", "Frutas", "maduro"], ["Salsa", "Verduras", "fresca"], ["Inhame", "Legumes", "fresco"], ["Uva Vitória", "Frutas", "madura"], ["Quiabo", "Legumes", "fresco"], ["Acerola", "Frutas", "madura"], ["Jiló", "Legumes", "fresco"], ["Banana prata", "Frutas", "no ponto"], ["Aipim", "Legumes", "fresco"], ["Alface americana", "Verduras", "fresca"], ["Abacate", "Frutas", "maduro"], ["Couve-flor", "Verduras", "fresca"], ["Gengibre", "Legumes", "fresco"],
];
const neighborhoods = ["Feira de Santana", "Região do Centro", "Entorno do entreposto", "Feira de Santana"];
const profiles = ["comerciante", "restaurante", "admin"];

/** Returns a deterministic offer weight within five percent of the requested amount. */
export function makeEquivalentDemoWeight(quantityG, index) {
  const factors = [1, 0.98, 1.02, 0.96, 1.04, 0.95, 1.05];
  return Math.round(quantityG * factors[Math.abs(index) % factors.length]);
}

/** Apply a meeting and its negotiation status as one deterministic demo transition. */
export function applyDemoMeetingTransition(state, { meetingId, proposalId, meetingValues, proposalStatus }) {
  const meetingExists = state.encontros.some((meeting) => meeting.id === meetingId);
  const proposalExists = state.propostas.some((proposal) => proposal.id === proposalId);
  if (!meetingExists || !proposalExists) return null;
  return {
    ...state,
    encontros: state.encontros.map((meeting) => meeting.id === meetingId
      ? { ...meeting, ...meetingValues }
      : meeting),
    propostas: state.propostas.map((proposal) => proposal.id === proposalId
      ? { ...proposal, status: proposalStatus }
      : proposal),
  };
}

/** Stable fictitious listings used only by the public demonstration. */
export function makeDemoListings(profile) {
  if (!profiles.includes(profile)) throw new Error("Unknown demo profile");
  return foods.map(([food, category, maturity], i) => ({
    id: `${profile}-${i}`,
    kind: i < 2 ? "Oferta" : i % 4 === 0 || i % 7 === 0 ? "Pedido" : "Oferta",
    food, category,
    amount: 8 + ((i * 13) % 85),
    unit: i % 6 === 0 ? "caixas" : "kg",
    maturity,
    neighborhood: neighborhoods[(i + (profile === "restaurante" ? 1 : 0)) % neighborhoods.length],
    day: i % 17,
    status: i < 2 ? "Disponível" : ["Disponível", "Em negociação", "Disponível", "Disponível", "Recente"][i % 5],
  }));
}
