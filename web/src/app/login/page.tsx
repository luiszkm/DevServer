import { LoginScreen } from "@/components/LoginScreen";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string | string[] }> }) {
  const { error } = await searchParams;
  return <LoginScreen error={typeof error === "string" ? error : undefined} />;
}
