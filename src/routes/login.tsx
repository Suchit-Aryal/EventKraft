import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Log in — EventKraft" }] }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Welcome back!");
    navigate({ to: "/dashboard/customer" });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:block bg-gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 p-12 flex flex-col justify-between text-primary-foreground">
          <Link to="/" className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-gold" />
            <span className="font-display text-2xl font-semibold">EventKraft</span>
          </Link>
          <div>
            <h2 className="font-display text-4xl font-semibold leading-tight">
              Welcome back to <span className="text-gradient-gold">EventKraft</span>
            </h2>
            <p className="mt-4 text-primary-foreground/80 max-w-md">
              Continue planning unforgettable events with Nepal's most trusted
              network of creative professionals.
            </p>
          </div>
          <p className="text-sm text-primary-foreground/60">© EventKraft · Nepal</p>
        </div>
      </div>

      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <Link to="/" className="flex items-center gap-2 lg:hidden mb-8">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="font-display text-xl font-semibold">EventKraft</span>
          </Link>

          <h1 className="font-display text-3xl font-semibold">Log in</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back — let's get you signed in.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <Label htmlFor="email">Email or phone</Label>
              <Input id="email" type="email" required placeholder="you@example.com" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="pw">Password</Label>
                <a href="#" className="text-xs text-primary hover:underline">Forgot?</a>
              </div>
              <Input id="pw" type="password" required placeholder="••••••••" />
            </div>
            <Button type="submit" className="w-full bg-gradient-hero text-primary-foreground" size="lg">
              Log in
            </Button>
          </form>

          <p className="mt-6 text-sm text-muted-foreground text-center">
            New to EventKraft?{" "}
            <Link to="/signup" className="text-primary font-medium hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
