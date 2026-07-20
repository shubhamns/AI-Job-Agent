import { useForm } from "@tanstack/react-form";
import { Loader2, PlayCircle, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { useAuthLogin, useDemoLogin } from "@/hooks/useAuthLogin";
import { env } from "@/lib/env";
import { errorMessage } from "@/lib/errors";

type AuthMode = "login" | "register";

export function AuthPage() {
  const authLogin = useAuthLogin();
  const demoLogin = useDemoLogin();
  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
      mode: "login" as AuthMode,
    },
    onSubmit: async ({ value }) => {
      await toast.promise(
        authLogin.mutateAsync({
          email: value.email,
          password: value.password,
          register: value.mode === "register",
        }),
        {
          loading: value.mode === "register" ? "Creating account..." : "Signing in...",
          success: value.mode === "register" ? "Account created" : "Signed in successfully",
          error: (error) => errorMessage(error, "Authentication failed"),
        },
      );
    },
  });

  function handleDemoLogin() {
    void toast.promise(demoLogin.mutateAsync(), {
      loading: "Starting demo session...",
      success: "Welcome to the demo workspace",
      error: (error) => errorMessage(error, "Demo login failed"),
    });
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500 via-cyan-600 to-blue-700" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_40%)]" />
        <div className="relative flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
            <Sparkles className="size-6 text-white" />
          </div>
          <div>
            <p className="text-lg font-bold text-white">AI Job Agent</p>
            <p className="text-sm text-white/70">Your career command center</p>
          </div>
        </div>
        <div className="relative space-y-4">
          <h1 className="max-w-md text-4xl font-bold leading-tight text-white">
            Job search that feels designed, not like admin software.
          </h1>
          <p className="max-w-sm text-white/75">
            Track applications, score matches with AI, and move from saved roles to offers — beautifully.
          </p>
        </div>
        <p className="relative text-sm text-white/50">Built for focused job search in India</p>
      </div>

      <div className="flex items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md border-0 shadow-2xl shadow-primary/10">
          <CardHeader className="space-y-3 pb-2">
            <div className="flex items-center gap-2 lg:hidden">
              <div className="gradient-primary flex size-9 items-center justify-center rounded-xl">
                <Sparkles className="size-4 text-white" />
              </div>
              <span className="text-sm font-bold">AI Job Agent</span>
            </div>
            <form.Subscribe selector={(state) => state.values.mode}>
              {(mode) => (
                <>
                  <CardTitle className="text-2xl">
                    {mode === "login" ? "Welcome back" : "Create your account"}
                  </CardTitle>
                  <CardDescription>
                    Sign in to manage your profile, preferences, and job pipeline.
                  </CardDescription>
                </>
              )}
            </form.Subscribe>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void form.handleSubmit();
              }}
            >
              <form.Field name="email">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name={field.name}
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                    />
                  </div>
                )}
              </form.Field>
              <form.Field name="password">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <PasswordInput
                      id="password"
                      name={field.name}
                      required
                      minLength={8}
                      placeholder="Min 8 characters"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                    />
                  </div>
                )}
              </form.Field>
              <form.Subscribe selector={(state) => state.isSubmitting}>
                {(isSubmitting) => (
                  <form.Subscribe selector={(state) => state.values.mode}>
                    {(mode) => (
                      <Button className="w-full" disabled={authLogin.isPending || isSubmitting} type="submit">
                        {authLogin.isPending || isSubmitting ? (
                          <>
                            <Loader2 className="animate-spin" />
                            Please wait...
                          </>
                        ) : mode === "login" ? (
                          "Sign In"
                        ) : (
                          "Create Account"
                        )}
                      </Button>
                    )}
                  </form.Subscribe>
                )}
              </form.Subscribe>
            </form>
            {env.demoMode ? (
              <Button
                variant="secondary"
                className="mt-3 w-full"
                disabled={demoLogin.isPending}
                onClick={handleDemoLogin}
              >
                <PlayCircle className="size-4" />
                {demoLogin.isPending ? "Starting demo..." : "Continue with demo user"}
              </Button>
            ) : null}
            <form.Subscribe selector={(state) => state.values.mode}>
              {(mode) => (
                <Button
                  variant="ghost"
                  className="mt-3 w-full"
                  onClick={() => form.setFieldValue("mode", mode === "login" ? "register" : "login")}
                >
                  {mode === "login" ? "Need an account? Register" : "Already have an account? Sign in"}
                </Button>
              )}
            </form.Subscribe>
            <Button variant="ghost" className="mt-1 w-full text-primary" asChild>
              <Link to="/">Back to home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
