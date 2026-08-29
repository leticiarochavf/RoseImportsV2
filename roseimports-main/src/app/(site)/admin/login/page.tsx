import type { Metadata } from "next";
import { LoginForm } from "@/features/admin/login-form";

export const metadata: Metadata = {
  title: "Entrar",
  robots: { index: false },
};

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center px-5 py-20">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <p className="eyebrow">Painel administrativo</p>
          <h1 className="mt-2 text-2xl">Entrar</h1>
          <div className="filete mx-auto mt-3 max-w-40" aria-hidden />
        </div>

        <div className="mt-8 border border-line bg-surface p-7">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
