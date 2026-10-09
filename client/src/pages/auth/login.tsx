import { useState, useEffect, useContext } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation, Link } from "wouter";
import { ChevronLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { AuthContext } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function Login() {
  const authContext = useContext(AuthContext);
  const { loginMutation } = authContext || { 
    user: null, 
    isLoading: true, 
    error: null, 
    loginMutation: { mutateAsync: async () => {}, isPending: false } as any, 
    logoutMutation: {} as any, 
    registerMutation: {} as any 
  };
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginValues) => {
    try {
      await loginMutation.mutateAsync(values);
      setLocation("/dashboard");
    } catch (error) {
      // Error handled by toast in use-auth
    }
  };

  return (
    <div className="container relative flex flex-col items-center justify-center min-h-[80vh] px-4">
      <Link href="/welcome" className="absolute left-0 top-0 mt-4 ml-4">
        <Button variant="ghost" size="sm" className="gap-1" data-testid="button-back">
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
      </Link>

      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Login</CardTitle>
          <CardDescription>
            Enter your username and password to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" {...field} data-testid="input-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative" style={{ position: "relative" }}>
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          autoComplete="current-password"
                          className="pr-10"
                          {...field}
                          data-testid="input-password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          style={{
                            position: "absolute",
                            right: "0.25rem",
                            top: "50%",
                            transform: "translateY(-50%)",
                          }}
                          onClick={() => setShowPassword((visible) => !visible)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          aria-pressed={showPassword}
                          data-testid="button-toggle-password"
                        >
                          {showPassword
                            ? <EyeOff className="h-4 w-4" />
                            : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loginMutation.isPending}
                data-testid="button-login"
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  "Login"
                )}
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/auth/signup" className="underline hover:text-primary" data-testid="link-signup">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
