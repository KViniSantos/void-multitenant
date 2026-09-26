import Link from "next/link";

export default function NotFound() {
  return <main className="not-found"><span className="brand-mark">v.</span><span className="eyebrow eyebrow-dark">ESTA VITRINE NÃO ESTÁ DISPONÍVEL</span><h1>Não encontramos<br />essa loja.</h1><p>Confira o endereço ou volte para começar de novo.</p><Link href="/" className="button button-dark">Voltar ao início <span>↗</span></Link></main>;
}
