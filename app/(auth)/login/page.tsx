import { redirect } from "next/navigation";
import { getOwnerSession } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/server";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
  if (await getOwnerSession()) redirect("/");
  const { dictionary } = await getDictionary();
  return <main className="login-shell"><LoginForm dictionary={dictionary} /></main>;
}
