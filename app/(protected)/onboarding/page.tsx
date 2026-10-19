import { redirect } from "next/navigation";
import { getSettings } from "@/lib/data";
import { getDictionary } from "@/lib/i18n/server";
import { OnboardingForm } from "@/components/onboarding-form";

export default async function OnboardingPage() {
  const [{ dictionary }, settings] = await Promise.all([getDictionary(), getSettings()]);
  if (settings?.onboarding_complete) redirect("/");
  return <main className="page" style={{ maxWidth: "760px" }}><div className="page-header"><div><p className="eyebrow">Saldo</p><h1>{dictionary.onboardingTitle}</h1></div></div><OnboardingForm dictionary={dictionary} /></main>;
}
