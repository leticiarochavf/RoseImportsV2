import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AdminUser = {
  id: string;
  email: string;
  name: string;
};

/**
 * Quem é administrador de verdade: além de ter sessão, precisa ter perfil.
 * É a mesma regra que as policies aplicam em is_admin(), agora disponível
 * para o servidor decidir o que renderizar. (§43)
 *
 * Retorna null para visitante, para sessão sem perfil e para erro de
 * leitura — na dúvida, não é admin.
 *
 * cache() por requisição: o header do site e o layout do painel perguntam
 * a mesma coisa na mesma renderização e só uma consulta acontece.
 */
export const getAdminUser = cache(async (): Promise<AdminUser | null> => {
  // Visitante não tem cookie de sessão. Sem isso, nem falamos com o
  // Supabase — é o caminho de 99% das visitas à loja. (perf)
  const cookieStore = await cookies();
  const hasSession = cookieStore
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));

  if (!hasSession) return null;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return null;

  return {
    id: user.id,
    email: user.email ?? "",
    name: profile.full_name || user.email || "Administrador",
  };
});

/**
 * Igual ao anterior, mas corta a renderização de quem não pode estar ali.
 * Usado em cada página do painel e nas server actions — menu escondido
 * nunca é a única barreira. (§34)
 */
export async function requireAdminUser(): Promise<AdminUser> {
  const admin = await getAdminUser();
  if (!admin) redirect("/admin/login");
  return admin;
}
