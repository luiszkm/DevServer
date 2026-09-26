/** The DevServer logotype (160x64) at a whole-number scale; the one image that carries text. */
export function Logo({ scale }: { scale: number }) {
  // eslint-disable-next-line @next/next/no-img-element -- pixel art at a fixed integer scale; no optimisation wanted
  return <img src="/art/sprite/logo.png" alt="DevServer" width={160 * scale} height={64 * scale} className="pixelated" />;
}
