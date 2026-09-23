export function ComingSoon({ scene }: { scene: string }) {
  return (
    <section className="scene coming-soon" aria-label={scene}>
      <span className="pixel">{scene}</span>
      <span className="pixel coming-soon-tag">EM BREVE</span>
    </section>
  );
}
