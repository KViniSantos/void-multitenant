import Link from "next/link";

export function LandingPage() {
  return (
    <main className="landing-page">
      <header className="landing-nav"><Link className="brand-lockup" href="/"><span className="brand-mark">v.</span><span>vitrine<span className="brand-dot">.</span></span></Link><div><Link className="nav-text-link" href="/login">Entrar</Link><Link className="button button-lime nav-cta" href="/login">Acessar minha loja <span>↗</span></Link></div></header>
      <section className="landing-hero">
        <div className="landing-copy"><span className="eyebrow"><span className="eyebrow-dot" /> SUA LOJA, MAIS PERTO DAS PESSOAS</span><h1>Sua vitrine.<br />Seu jeito de <em>vender.</em></h1><p>Mostre seus produtos, crie sua identidade e feche a venda com uma conversa no WhatsApp.</p><div className="landing-actions"><Link className="button button-lime" href="/login">Acessar meu painel <span>↗</span></Link><a className="landing-secondary" href="#como-funciona">Como funciona <span>↓</span></a></div><div className="landing-proof"><span className="proof-avatars"><i>J</i><i>M</i><i>A</i></span><span>Feito para negócios<br />que crescem de perto.</span></div></div>
        <div className="landing-art" aria-hidden="true"><div className="landing-art-grid" /><div className="landing-art-circle circle-back" /><div className="landing-art-circle circle-front" /><div className="landing-product-card"><div className="demo-product-image"><span>✳</span><b>boa escolha</b></div><div className="demo-product-copy"><span>EDIÇÃO ESPECIAL</span><strong>Peças que contam<br />uma história.</strong><div><b>R$ 189,00</b><i>+</i></div></div></div><div className="floating-chip chip-one">✦&nbsp; SUA IDENTIDADE</div><div className="floating-chip chip-two">↗&nbsp; VENDA NO WHATSAPP</div><div className="art-caption">uma loja pronta<br />para ser sua.</div></div>
      </section>
      <section className="landing-strip" id="como-funciona"><span>SEM COMPLICAÇÃO</span><b>Uma vitrine bonita.</b><i>×</i><b>Seus produtos em destaque.</b><i>×</i><b>Uma conversa que vende.</b></section>
      <footer className="landing-footer"><span>vitrine<span className="brand-dot">.</span></span><span>Mais perto de quem compra.</span><Link href="/login">Área do lojista →</Link></footer>
    </main>
  );
}
