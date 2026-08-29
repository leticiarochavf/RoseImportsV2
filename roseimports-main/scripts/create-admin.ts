/**
 * Cria um administrador: usuário no Supabase Auth + linha em profiles.
 *
 *   npm run create-admin -- rose@roseimports.com.br "Rose" senhaSegura123
 *
 * Ter linha em profiles é o que define ser admin (§43). Um usuário do Auth
 * sem profile passa pelo login mas não enxerga nada — as policies barram.
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const [email, fullName, password] = process.argv.slice(2);

if (!email || !fullName || !password) {
  console.error(
    'Uso: npm run create-admin -- <email> "<nome completo>" <senha>',
  );
  process.exit(1);
}

if (password.length < 8) {
  console.error("A senha precisa de pelo menos 8 caracteres.");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env.local",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function main() {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error || !data.user) {
    console.error("Falha ao criar usuário:", error?.message);
    process.exit(1);
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .insert({ id: data.user.id, full_name: fullName });

  if (profileError) {
    // Sem profile o login não serve para nada — desfaz para não deixar lixo.
    await supabase.auth.admin.deleteUser(data.user.id);
    console.error("Falha ao criar profile:", profileError.message);
    process.exit(1);
  }

  console.log(`Administrador criado: ${fullName} <${email}>`);
}

main();
