/** The dev's sprite (door 9); a skin is a CSS filter over the same art. */
export function HeroSprite({ filter, className }: { filter: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a pixel sprite recoloured by a filter; no optimisation wanted
    <img src="/hero.png" alt="herói" className={`pixelated hero-sprite ${className ?? ""}`} style={{ filter }} />
  );
}
