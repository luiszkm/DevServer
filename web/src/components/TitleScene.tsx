import Link from "next/link";

// Hotspots over the key art, positioned as in the prototype (percent of the 1200×960 image).
const SIGNS = [
  { label: "DEPLOY", href: "/deploy", style: { left: "17.1%", top: "53.8%", width: "14.6%", height: "5.2%" }, chip: false },
  { label: "MUNDO", href: "/mundo", style: { left: "17.1%", top: "60.9%", width: "14.6%", height: "5.2%" }, chip: false },
  { label: "SKILLS", href: "/skills", style: { left: "43.2%", top: "49.5%", width: "13.2%", height: "28%" }, chip: true },
  { label: "BUG", href: "/bug-fight", style: { left: "6.4%", top: "66.5%", width: "9%", height: "11.5%" }, chip: true },
];

export function TitleScene() {
  return (
    <section className="scene title-scene" aria-label="TÍTULO">
      <div className="title-art">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/keyart.png" alt="DevServer key art" className="pixelated" />
        {SIGNS.map((s) => (
          <Link key={s.label} href={s.href} aria-label={s.label} className="hotspot" style={s.style}>
            {s.chip && <span className="pixel hotspot-chip">{s.label}</span>}
          </Link>
        ))}
      </div>
      <div className="pixel title-hint">CLIQUE NAS PLACAS PARA NAVEGAR</div>
    </section>
  );
}
