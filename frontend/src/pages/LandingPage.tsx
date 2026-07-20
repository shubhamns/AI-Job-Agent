import { toast } from "sonner";
import { CtaSection } from "@/features/landing/CtaSection";
import { FeaturesSection } from "@/features/landing/FeaturesSection";
import { HeroSection } from "@/features/landing/HeroSection";
import { LandingNav } from "@/features/landing/LandingNav";
import { useDemoLogin } from "@/hooks/useAuthLogin";

export function LandingPage() {
  const demoLogin = useDemoLogin();

  function handleDemoLogin() {
    void toast.promise(demoLogin.mutateAsync(), {
      loading: "Starting demo session...",
      success: "Welcome to the demo workspace",
      error: (error) => (error instanceof Error ? error.message : "Demo login failed"),
    });
  }

  return (
    <div className="min-h-dvh">
      <LandingNav onDemoLogin={handleDemoLogin} demoLoading={demoLogin.isPending} />
      <main>
        <HeroSection onDemoLogin={handleDemoLogin} demoLoading={demoLogin.isPending} />
        <FeaturesSection />
        <CtaSection onDemoLogin={handleDemoLogin} demoLoading={demoLogin.isPending} />
      </main>
      <footer className="py-10 text-center text-sm text-muted-foreground">
        <p>AI Job Agent — focused job search for India</p>
      </footer>
    </div>
  );
}
