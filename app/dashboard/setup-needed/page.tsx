import Link from "next/link";

export default function SetupNeededPage() {
  return <main className="dashboard-content"><div className="empty-state-card"><span className="empty-state-mark">v.</span><span className="eyebrow eyebrow-dark">QUASE LÁ</span><h1>Sua loja está sendo preparada.</h1><p>O administrador da plataforma vai associar uma loja à sua conta. Assim que chegar o convite, você poderá montar sua vitrine.</p><Link href="/login" className="button button-dark">Voltar ao início <span>↗</span></Link></div></main>;
}
