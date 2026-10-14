import test from "node:test";
import assert from "node:assert/strict";
import { isValidCpf, isValidCnpj, formatCnpj } from "./documentRules.mjs";

test("validates CPF check digits and rejects repeated digits", () => {
  assert.equal(isValidCpf("529.982.247-25"), true);
  assert.equal(isValidCpf("111.111.111-11"), false);
  assert.equal(isValidCpf("529.982.247-24"), false);
});

test("validates numeric and Receita Federal alphanumeric CNPJ values", () => {
  assert.equal(isValidCnpj("04.252.011/0001-10"), true);
  assert.equal(isValidCnpj("11.222.333/0001-81"), true);
  assert.equal(isValidCnpj("00.000.000/E08G-12"), true);
  assert.equal(isValidCnpj("00.000.000/E08G-13"), false);
  assert.equal(isValidCnpj("0A.000.000/E08G-12"), false);
});

test("formats traditional and alphanumeric CNPJ in the registration input", () => {
  assert.equal(formatCnpj("04252011000110"), "04.252.011/0001-10");
  assert.equal(formatCnpj("00000000E08G12"), "00.000.000/E08G-12");
  assert.equal(formatCnpj("00.000.000/E08G-12"), "00.000.000/E08G-12");
});
