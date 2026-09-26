import Link from "next/link";
import { UpdatePasswordForm } from "@/components/update-password-form";

export const metadata = { title: "Definir senha" };

export default function UpdatePasswordPage() {
  return <main className="login-shell"><section className="login-card"><Link className="brand-lockup" href="/"><span className="brand-mark">v.</span><span>vitrine<span className="brand-dot">.</span></span></Link><span className="eyebrow eyebrow-dark">PRIMEIRO ACESSO</span><h1>Crie sua<br /><em>senha.</em></h1><p>Defina uma senha segura para entrar no painel da sua loja.</p><UpdatePasswordForm /></section><div className="login-art"><div className="login-art-shape" /><span>Seu espaço<br />já está pronto.</span><b>v.</b></div></main>;
}
