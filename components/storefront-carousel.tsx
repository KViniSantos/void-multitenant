"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export function HeroCarousel({ images, title }: { images: string[]; title: string }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (images.length < 2) return;
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % images.length), 6000);
    return () => window.clearInterval(timer);
  }, [images.length]);
  return <div className="sf-hero-image sf-hero-carousel" aria-label="Imagens em destaque">
    {images.map((src, current) => <Image key={`${src}-${current}`} src={src} alt={current === index ? title : ""} fill priority={current === 0} sizes="(max-width: 760px) 100vw, 50vw" className={current === index ? "is-current" : ""} />)}
    {images.length > 1 ? <div className="sf-carousel-controls"><button type="button" onClick={() => setIndex((index + images.length - 1) % images.length)} aria-label="Imagem anterior">←</button><span>{index + 1} / {images.length}</span><button type="button" onClick={() => setIndex((index + 1) % images.length)} aria-label="Próxima imagem">→</button></div> : null}
  </div>;
}

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [selected, setSelected] = useState(0);
  const actualImages = images.length ? images : [];
  if (!actualImages.length) return <div className="sf-detail-main-image sf-image-placeholder">{name.slice(0, 1)}</div>;
  return <div className="sf-gallery"><div className="sf-gallery-thumbs" role="group" aria-label="Fotos do produto">{actualImages.map((src, index) => <button type="button" key={`${src}-${index}`} onClick={() => setSelected(index)} className={selected === index ? "is-selected" : ""} aria-label={`Ver foto ${index + 1} de ${actualImages.length}`} aria-pressed={selected === index}><Image src={src} alt="" fill sizes="72px" /></button>)}</div><div className="sf-detail-main-image"> <Image src={actualImages[selected]} alt={`${name}, foto ${selected + 1}`} fill priority sizes="(max-width: 760px) 100vw, 52vw" /></div></div>;
}
