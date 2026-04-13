import { redirect } from "next/navigation";
import { acceptInvite } from "@/lib/actions/tappers";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ code: string }>;
};

export default async function TapperJoinPage({ params }: PageProps) {
  const { code } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/tappers/join/${code}`)}`);
  }

  const result = await acceptInvite(code);

  if (result.success) {
    redirect("/dashboard/tappers?linked=1");
  }

  const message = result.error;
  if (message.includes("Cannot link with yourself")) {
    redirect("/dashboard/tappers?error=self");
  }
  if (message.includes("Invalid or expired")) {
    redirect("/dashboard/tappers?error=invalid");
  }

  redirect("/dashboard/tappers?error=unknown");
}
