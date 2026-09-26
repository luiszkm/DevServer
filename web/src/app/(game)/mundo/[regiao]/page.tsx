import { RegionScene } from "@/components/RegionScene";

export default async function RegionPage({ params }: { params: Promise<{ regiao: string }> }) {
  const { regiao } = await params;
  return <RegionScene regionId={regiao} />;
}
