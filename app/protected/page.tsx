import FetchDataSteps from "@/components/tutorial/fetch-data-steps";
import { createClient } from "@/utils/supabase/server";
import { InfoIcon } from "lucide-react";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ProtectedPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-12">
      <div className="w-full">
        <div className="bg-accent text-sm p-3 px-5 rounded-md text-foreground flex gap-3 items-center">
          <InfoIcon size="16" strokeWidth={2} />
          This is a protected page that you can only see as an authenticated
          user
        </div>
      </div>
      <div className="flex flex-col gap-2 items-start">
        <h2 className="font-bold text-2xl mb-4">Your user details</h2>
        <pre className="text-xs font-mono p-3 rounded border max-h-32 overflow-auto">
          {JSON.stringify(user, null, 2)}
        </pre>
      </div>
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-2xl">Next steps</h2>
          <div className="flex gap-4">
            <Link
              href="/cms"
              className="text-sm px-4 py-2 bg-foreground text-background rounded hover:bg-foreground/90 transition-colors"
            >
              Go to CMS
            </Link>
            <Link
              href="/admin"
              className="text-sm px-4 py-2 bg-foreground text-background rounded hover:bg-foreground/90 transition-colors"
            >
              Go to Admin
            </Link>
          </div>
        </div>
        <FetchDataSteps />
      </div>
    </div>
  );
}
