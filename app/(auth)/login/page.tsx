import { redirect } from "next/navigation";
import { getOwnerSession } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/server";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reset?: string }> }) {
  if (await getOwnerSession()) redirect("/");
  const { dictionary } = await getDictionary();
  const resetComplete = (await searchParams).reset === "success";
  return <main className="login-shell"><LoginForm dictionary={dictionary} notice={resetComplete ? dictionary.credentialUpdated : undefined} /></main>;
}
