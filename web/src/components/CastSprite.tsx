import { castBox, castById, castFxStyle } from "@/lib/cast";

type Props = { id: string; alt?: string; className?: string };

/**
 * A painted cast piece. A still is an img at the arena height; a 4-frame strip
 * plays with the same steps() motion as the battle fx. Reduced motion leaves frame 0.
 */
export function CastSprite({ id, alt = "", className }: Props) {
  const item = castById(id);
  if (item.frames === 1) {
    const box = castBox(item);
    return (
      // eslint-disable-next-line @next/next/no-img-element -- cast art is a fixed bitmap, same as GameArt
      <img src={item.src} alt={alt} width={box.width} height={box.height} className={`cast-sprite ${className ?? ""}`} />
    );
  }
  return (
    <span
      className={`cast-strip ${className ?? ""}`}
      data-frames={item.frames}
      style={castFxStyle(item)}
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
    />
  );
}
