export function isValidCpf(value) {
  const cpf = value.replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const check = length => {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += Number(cpf[i]) * (length + 1 - i);
    const digit = (sum * 10) % 11;
    return digit === 10 ? 0 : digit;
  };
  return check(9) === Number(cpf[9]) && check(10) === Number(cpf[10]);
}

export function isValidCnpj(value) {
  const cnpj = value.replace(/[^a-z0-9]/gi, "").toUpperCase();
  if (!/^\d{8}[A-Z0-9]{4}\d{2}$/.test(cnpj) || /^(.)\1{13}$/.test(cnpj)) return false;
  const check = (base, weights) => {
    const sum = [...base].reduce((total, char, index) => total + (char.charCodeAt(0) - 48) * weights[index], 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  const first = check(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = check(cnpj.slice(0, 12) + first, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return first === Number(cnpj[12]) && second === Number(cnpj[13]);
}

export function formatCnpj(value) {
  const raw = value.replace(/[^a-z0-9]/gi, "").toUpperCase();
  let cnpj = "";
  for (const char of raw) {
    const position = cnpj.length;
    if (position < 8 && /\d/.test(char)) cnpj += char;
    else if (position >= 8 && position < 12 && /[A-Z0-9]/.test(char)) cnpj += char;
    else if (position >= 12 && position < 14 && /\d/.test(char)) cnpj += char;
  }
  if (cnpj.length <= 2) return cnpj;
  if (cnpj.length <= 5) return `${cnpj.slice(0, 2)}.${cnpj.slice(2)}`;
  if (cnpj.length <= 8) return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5)}`;
  if (cnpj.length <= 12) return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8)}`;
  return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`;
}
