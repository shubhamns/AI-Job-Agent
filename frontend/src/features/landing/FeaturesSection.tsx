import { motion } from "framer-motion";
import {
  BarChart3,
  Briefcase,
  FileText,
  Lightbulb,
  Sparkles,
  Target,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: FileText,
    title: "Resume → Profile",
    description: "Upload PDF or DOCX and get a structured profile you can refine before searching.",
    color: "from-teal-500/25 to-teal-500/8 text-teal-300",
  },
  {
    icon: Target,
    title: "Smart matching",
    description: "Deterministic scoring plus optional AI fit scores, filters, and exclusion rules.",
    color: "from-cyan-500/25 to-cyan-500/8 text-cyan-300",
  },
  {
    icon: Briefcase,
    title: "Pipeline tracker",
    description: "Move jobs through saved, applied, interview, offer, and follow-up stages.",
    color: "from-emerald-500/25 to-emerald-500/8 text-emerald-300",
  },
  {
    icon: BarChart3,
    title: "Outcome intelligence",
    description: "See which roles, skills, and sources actually lead to interviews.",
    color: "from-sky-500/25 to-sky-500/8 text-sky-300",
  },
  {
    icon: Lightbulb,
    title: "Strategy agent",
    description: "Evidence-backed recommendations separated from AI suggestions.",
    color: "from-blue-500/25 to-blue-500/8 text-blue-300",
  },
  {
    icon: Sparkles,
    title: "Application packs",
    description: "Tailored CV tweaks, cover letters, and ATS checks for each role.",
    color: "from-teal-400/25 to-teal-400/8 text-teal-200",
  },
];

export function FeaturesSection() {
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4">
        <motion.div
          className="mx-auto max-w-2xl text-center"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Everything in one workflow</h2>
          <p className="mt-4 text-muted-foreground">
            Five product phases — from profile to application packs — built for focused job search in India.
          </p>
        </motion.div>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description, color }, index) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 48 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: index * 0.08, ease: "easeOut" }}
            >
              <Card className="h-full">
                <CardHeader className="space-y-4">
                  <div className={`flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br ${color}`}>
                    <Icon className="size-5" />
                  </div>
                  <CardTitle className="text-lg">{title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">{description}</CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
