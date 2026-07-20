import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { env } from "@/lib/env";

const stats = [
  { value: "5", label: "Product phases" },
  { value: "AI", label: "Fit scoring" },
  { value: "IN", label: "India-focused" },
];

const fadeUp = (delay = 0) => ({
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay, ease: "easeOut" as const },
  },
});

export function HeroSection({
  onDemoLogin,
  demoLoading,
}: {
  onDemoLogin?: () => void;
  demoLoading?: boolean;
}) {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-28">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 size-[600px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl"
      />
      <div className="relative mx-auto max-w-6xl px-4 text-center">
        <motion.div initial="hidden" animate="visible" variants={fadeUp(0)}>
          <Badge variant="outline" className="mb-6 border-primary/30 bg-muted/40 px-4 py-1.5 text-primary backdrop-blur-sm">
            Job search workspace for India
          </Badge>
        </motion.div>
        <motion.h1
          initial="hidden"
          animate="visible"
          variants={fadeUp(0.1)}
          className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight text-foreground md:text-6xl md:leading-[1.08]"
        >
          Find roles that fit.
          <span className="block gradient-text">Track every application.</span>
        </motion.h1>
        <motion.p
          initial="hidden"
          animate="visible"
          variants={fadeUp(0.2)}
          className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg"
        >
          A beautiful career workspace — upload your resume, score matches with AI, and run your entire pipeline in one
          place.
        </motion.p>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp(0.3)}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <Button size="lg" asChild>
            <Link to="/login">
              Start for free
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          {env.demoMode && onDemoLogin ? (
            <Button size="lg" variant="outline" disabled={demoLoading} onClick={onDemoLogin}>
              <PlayCircle className="size-4" />
              {demoLoading ? "Loading demo..." : "Explore demo"}
            </Button>
          ) : null}
        </motion.div>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp(0.4)}
          className="mt-14 grid grid-cols-3 gap-4 md:mx-auto md:max-w-lg"
        >
          {stats.map((stat) => (
            <motion.div
              key={stat.label}
              className="glass-card px-3 py-5"
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
            >
              <p className="text-2xl font-bold gradient-text md:text-3xl">{stat.value}</p>
              <p className="mt-1 text-xs text-muted-foreground md:text-sm">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
