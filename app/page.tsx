import Hero from "@/components/hero";
import ConnectSupabaseSteps from "@/components/tutorial/connect-supabase-steps";
import SignUpUserSteps from "@/components/tutorial/sign-up-user-steps";
import { hasEnvVars } from "@/utils/supabase/check-env-vars";
import Link from "next/link";

export default async function Home() {
  return (
    <>
      <Hero />
      <main className="flex-1 flex flex-col gap-6 px-4">
        <div className="flex justify-between items-center">
          <h2 className="font-medium text-xl">Next steps</h2>
          <div className="flex gap-2">
            <Link 
              href="/blog"
              className="text-sm px-4 py-2 bg-foreground text-background rounded hover:bg-foreground/90 transition-colors"
            >
              Visit Blog
            </Link>
            <Link 
              href="/cms"
              className="text-sm px-4 py-2 bg-foreground text-background rounded hover:bg-foreground/90 transition-colors"
            >
              CMS
            </Link>
            <Link 
              href="/admin"
              className="text-sm px-4 py-2 bg-foreground text-background rounded hover:bg-foreground/90 transition-colors"
            >
              Admin
            </Link>
          </div>
        </div>
        {hasEnvVars ? <SignUpUserSteps /> : <ConnectSupabaseSteps />}
      </main>
    </>
  );
}
