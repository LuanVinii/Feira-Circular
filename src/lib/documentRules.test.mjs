import test from "node:test";
import assert from "node:assert/strict";
import { isValidCpf, isValidCnpj } from "./documentRules.mjs";

test("validates CPF check digits and rejects repeated digits", () => {
  assert.equal(isValidCpf("529.982.247-25"), true);
  assert.equal(isValidCpf("111.111.111-11"), false);
  assert.equal(isValidCpf("529.982.247-24"), false);
});

test("validates numeric and Receita Federal alphanumeric CNPJ values", () => {
  assert.equal(isValidCnpj("04.252.011/0001-10"), true);
  assert.equal(isValidCnpj("00.000.000/E08G-12"), true);
  assert.equal(isValidCnpj("00.000.000/E08G-13"), false);
});
