import { CAST_HEIGHT, castBox, castById, castFxStyle } from "@/lib/cast";

type Props = { id: string; alt?: string; className?: string; height?: number; anim?: string };

/**
 * A painted cast piece. A still is an img; a 4-frame strip plays with steps().
 * Reduced motion leaves frame 0. `height` overrides the arena default.
 */
export function CastSprite({ id, alt = "", className, height = CAST_HEIGHT, anim }: Props) {
  const item = castById(id);
  const box = castBox(item, height);
  if (item.frames === 1) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- cast art is a fixed bitmap, same as GameArt
      <img
        src={item.src}
        alt={alt}
        width={box.width}
        height={box.height}
        data-anim={anim}
        className={`cast-sprite ${className ?? ""}`}
        style={{ height: box.height, width: box.width }}
      />
    );
  }
  return (
    <span
      className={`cast-strip ${className ?? ""}`}
      data-frames={item.frames}
      data-anim={anim}
      style={{ ...castFxStyle(item, height), height: box.height, width: box.width }}
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
    />
  );
}
