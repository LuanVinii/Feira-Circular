import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente antes de executar.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const users = [
  {
    email: "comerciante1@exemplo.com",
    password: "FeiraDemo#2026A",
    name: "Comerciante Demo 1",
    type: "comerciante",
    document: "12345678000195",
    address: "Centro de Abastecimento, Feira de Santana - BA",
    whatsapp: "75999990001",
    responsible: "Responsável Comerciante 1",
    interests: ["Banana", "Tomate", "Feijão"],
    opening_hours: "Segunda a sábado, 7h às 17h",
  },
  {
    email: "comerciante2@exemplo.com",
    password: "FeiraDemo#2026B",
    name: "Comerciante Demo 2",
    type: "comerciante",
    document: "23456789000106",
    address: "Centro de Abastecimento, Feira de Santana - BA",
    whatsapp: "75999990002",
    responsible: "Responsável Comerciante 2",
    interests: ["Abacaxi", "Cenoura", "Milho"],
    opening_hours: "Segunda a sábado, 7h às 17h",
  },
  {
    email: "restaurante1@exemplo.com",
    password: "FeiraDemo#2026C",
    name: "Restaurante Demo 1",
    type: "restaurante",
    document: "34567890000117",
    address: "Rua Demo 1, Feira de Santana - BA",
    whatsapp: "75999990003",
    responsible: "Responsável Restaurante 1",
    interests: ["Banana", "Tomate", "Feijão"],
    opening_hours: "Todos os dias, 11h às 22h",
  },
  {
    email: "restaurante2@exemplo.com",
    password: "FeiraDemo#2026D",
    name: "Restaurante Demo 2",
    type: "restaurante",
    document: "45678901000128",
    address: "Rua Demo 2, Feira de Santana - BA",
    whatsapp: "75999990004",
    responsible: "Responsável Restaurante 2",
    interests: ["Abacaxi", "Cenoura", "Milho"],
    opening_hours: "Todos os dias, 11h às 22h",
  },
];

async function findUserByEmail(email) {
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const found = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < 1000) return null;
  }
}

for (const user of users) {
  let authUser = await findUserByEmail(user.email);
  if (!authUser) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: {
        name: user.name,
        type: user.type,
        document: user.document,
        document_type: "cnpj",
        address: user.address,
        whatsapp: user.whatsapp,
        responsible: user.responsible,
        interests: user.interests,
        opening_hours: user.opening_hours,
      },
    });
    if (error) throw new Error(`${user.email}: ${error.message}`);
    authUser = data.user;
  } else {
    const { data, error } = await supabase.auth.admin.updateUserById(authUser.id, {
      password: user.password,
      email_confirm: true,
      user_metadata: {
        name: user.name,
        type: user.type,
        document: user.document,
        document_type: "cnpj",
        address: user.address,
        whatsapp: user.whatsapp,
        responsible: user.responsible,
        interests: user.interests,
        opening_hours: user.opening_hours,
      },
    });
    if (error) throw new Error(`${user.email}: ${error.message}`);
    authUser = data.user;
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      name: user.name,
      type: user.type,
      document_type: "cnpj",
      document: user.document,
      email: user.email,
      address: user.address,
      whatsapp: user.whatsapp,
      responsible: user.responsible,
      interests: user.interests,
      opening_hours: user.opening_hours,
      status: "aprovado",
    })
    .eq("id", authUser.id);
  if (profileError) throw new Error(`${user.email}: perfil não criado/atualizado: ${profileError.message}`);

  console.log(`${user.type}\t${user.email}\t${user.password}\t${authUser.id}`);
}
