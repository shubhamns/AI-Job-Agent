import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { env } from "@/lib/env";

export function CtaSection({
  onDemoLogin,
  demoLoading,
}: {
  onDemoLogin?: () => void;
  demoLoading?: boolean;
}) {
  return (
    <section className="pb-24 pt-8">
      <motion.div
        className="mx-auto max-w-6xl px-4"
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-teal-500 via-cyan-600 to-blue-700 px-6 py-12 text-center text-white shadow-2xl shadow-teal-500/20 md:px-12 md:py-16">
          <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-white/10 blur-3xl" />
          <h2 className="relative text-3xl font-bold tracking-tight md:text-4xl">Ready to run your job search?</h2>
          <p className="relative mx-auto mt-4 max-w-xl text-white/80">
            {env.demoMode
              ? "Jump into the demo workspace instantly — no signup required — or create your own account."
              : "Create an account, upload your resume, and start tracking matches today."}
          </p>
          <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
            {env.demoMode && onDemoLogin ? (
              <Button size="lg" variant="secondary" disabled={demoLoading} onClick={onDemoLogin}>
                <PlayCircle className="size-4" />
                {demoLoading ? "Starting demo..." : "Try demo workspace"}
              </Button>
            ) : null}
            <Button
              size="lg"
              className="bg-white text-teal-700 hover:bg-white/90"
              variant={env.demoMode ? "secondary" : "default"}
              asChild
            >
              <Link to="/login">
                Create account
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
