import test from "node:test";
import assert from "node:assert/strict";
import { applyDemoMeetingTransition, makeDemoListings, makeEquivalentDemoWeight } from "./demoSeed.mjs";

test("each demonstration profile has 40 stable, varied listings", () => {
  for (const profile of ["comerciante", "restaurante", "admin"]) {
    const first = makeDemoListings(profile);
    const second = makeDemoListings(profile);
    assert.equal(first.length, 40);
    assert.deepEqual(first, second);
    assert.ok(new Set(first.map(row => row.food)).size >= 30);
    assert.ok(new Set(first.map(row => row.category)).size >= 3);
    assert.ok(new Set(first.map(row => row.status)).size >= 3);
    assert.ok(first.every(row => row.id.startsWith(`${profile}-`)));
    assert.ok(first.slice(0, 2).every(row => row.kind === "Oferta" && row.status === "Disponível"));
  }
});

test("demo seed rejects unknown profile names", () => {
  assert.throws(() => makeDemoListings("real-admin"), /Unknown demo profile/);
});

test("demo food names use correctly encoded Portuguese characters", () => {
  const listings = makeDemoListings("comerciante");
  assert.ok(listings.some(row => row.food === "Ab\u00f3bora"));
  assert.ok(listings.every(row => !/[\u00c3\u00c2\ufffd]/.test(`${row.food} ${row.category} ${row.maturity} ${row.status}`)));
});

test("equivalent demo offers stay within five percent of the requested weight", () => {
  for (const quantityG of [600, 700, 1000, 2000, 7000, 20000]) {
    for (let i = 0; i < 20; i += 1) {
      const offeredG = makeEquivalentDemoWeight(quantityG, i);
      assert.ok(Math.abs(offeredG - quantityG) / quantityG <= 0.05);
    }
  }
});

test("meeting decisions update one meeting and its proposal for every demo profile", () => {
  for (const profile of ["comerciante", "restaurante", "admin"]) {
    const state = {
      encontros: [{ id: `${profile}-meeting`, propostaId: `${profile}-proposal`, status: "proposto", data: "2026-10-20" }],
      propostas: [{ id: `${profile}-proposal`, status: "aceito" }],
    };
    const accepted = applyDemoMeetingTransition(state, {
      meetingId: `${profile}-meeting`,
      proposalId: `${profile}-proposal`,
      meetingValues: { status: "aceito" },
      proposalStatus: "encontro-agendado",
    });
    assert.equal(accepted.encontros.length, 1);
    assert.equal(accepted.encontros[0].status, "aceito");
    assert.equal(accepted.propostas[0].status, "encontro-agendado");
    assert.equal(state.encontros[0].status, "proposto", "the original fixture is not mutated");

    const counterproposal = applyDemoMeetingTransition(accepted, {
      meetingId: `${profile}-meeting`,
      proposalId: `${profile}-proposal`,
      meetingValues: { status: "proposto", data: "2026-10-22" },
      proposalStatus: "aceito",
    });
    assert.equal(counterproposal.encontros[0].data, "2026-10-22");
    assert.equal(counterproposal.propostas[0].status, "aceito");

    const declined = applyDemoMeetingTransition(counterproposal, {
      meetingId: `${profile}-meeting`,
      proposalId: `${profile}-proposal`,
      meetingValues: { status: "recusado" },
      proposalStatus: "aceito",
    });
    assert.equal(declined.encontros[0].status, "recusado");
    assert.equal(declined.propostas[0].status, "aceito");
  }
});

test("meeting transition refuses to update mismatched or missing records", () => {
  const state = { encontros: [{ id: "meeting-1" }], propostas: [{ id: "proposal-1", status: "aceito" }] };
  assert.equal(applyDemoMeetingTransition(state, {
    meetingId: "meeting-missing", proposalId: "proposal-1", meetingValues: { status: "aceito" }, proposalStatus: "encontro-agendado",
  }), null);
  assert.equal(applyDemoMeetingTransition(state, {
    meetingId: "meeting-1", proposalId: "proposal-missing", meetingValues: { status: "aceito" }, proposalStatus: "encontro-agendado",
  }), null);
});
