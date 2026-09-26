import Link from "next/link";
import { LoginForm } from "@/components/login-form";

export const metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <main className="login-shell">
      <section className="login-card">
        <Link className="brand-lockup" href="/">
          <span className="brand-mark">v.</span>
          <span>vitrine<span className="brand-dot">.</span></span>
        </Link>
        <span className="eyebrow eyebrow-dark">ACESSO À PLATAFORMA</span>
        <h1>Entre na sua<br /><em>conta.</em></h1>
        <p>Acesse o painel da sua loja ou da plataforma.</p>
        <LoginForm />
      </section>
      <div className="login-art">
        <div className="login-art-shape" />
        <span>Seu espaço<br />já está pronto.</span>
        <b>v.</b>
      </div>
    </main>
  );
}
