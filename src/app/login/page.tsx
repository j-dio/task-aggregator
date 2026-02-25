import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginCard } from "./login-card";

export const metadata = {
  title: "Sign In",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If already authenticated, redirect to dashboard
  if (user) {
    redirect("/dashboard");
  }

  const params = await searchParams;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <LoginCard error={params.error} />
    </div>
  );
}
