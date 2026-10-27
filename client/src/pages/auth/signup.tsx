import { useState, useContext, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation, Link } from "wouter";
import { ChevronLeft, Eye, EyeOff, Loader2, Upload, X, User } from "lucide-react";
import { AuthContext } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { compressAvatarImage } from "@/lib/avatar-image";

const signupSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  avatarUrl: z.string().optional(),
});

type SignupValues = z.infer<typeof signupSchema>;

export default function Signup() {
  const { toast } = useToast();
  const authContext = useContext(AuthContext);
  const { registerMutation } = authContext || { 
    user: null, 
    isLoading: true, 
    error: null, 
    loginMutation: {} as any, 
    logoutMutation: {} as any, 
    registerMutation: { mutateAsync: async () => {}, isPending: false } as any 
  };
  const [, setLocation] = useLocation();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessingAvatar, setIsProcessingAvatar] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      avatarUrl: "",
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    setIsProcessingAvatar(true);
    try {
      const compressedAvatar = await compressAvatarImage(file);
      setPreviewUrl(compressedAvatar);
      form.setValue("avatarUrl", compressedAvatar);
    } catch (error) {
      toast({
        title: "Could not use this photo",
        description: error instanceof Error ? error.message : "Choose a different image.",
        variant: "destructive",
      });
    } finally {
      input.value = "";
      setIsProcessingAvatar(false);
    }
  };

  const removeAvatar = () => {
    setPreviewUrl(null);
    form.setValue("avatarUrl", "");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = async (values: SignupValues) => {
    try {
      const user = await registerMutation.mutateAsync(values);
      if (user) setLocation("/dashboard");
    } catch (error) {
      // Error handled by toast in use-auth
    }
  };

  return (
    <div className="relative w-full flex-1 flex flex-col items-center justify-center px-4">
      <Link href="/welcome" className="absolute left-0 top-0 mt-4 ml-4">
        <Button variant="ghost" size="sm" className="gap-1" data-testid="button-back">
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
      </Link>

      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
          <CardDescription>
            Enter your details below to create your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="flex flex-col items-center justify-center space-y-3 pb-2">
                <Avatar className="h-20 w-20 border-2 border-primary/10">
                  <AvatarImage src={previewUrl || ""} />
                  <AvatarFallback className="bg-primary/5">
                    <User className="h-10 w-10 text-primary/40" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessingAvatar || registerMutation.isPending}
                    data-testid="button-upload-avatar"
                  >
                    {isProcessingAvatar ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Processing…
                      </>
                    ) : (
                      <>
                        <Upload className="h-3.5 w-3.5" />
                        Upload Photo
                      </>
                    )}
                  </Button>
                  {previewUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={removeAvatar}
                      disabled={isProcessingAvatar || registerMutation.isPending}
                      data-testid="button-remove-avatar"
                    >
                      <X className="h-3.5 w-3.5" />
                      Remove
                    </Button>
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={isProcessingAvatar || registerMutation.isPending}
                />
              </div>

              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="johndoe" {...field} data-testid="input-username" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@example.com" {...field} data-testid="input-email" />
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
                          autoComplete="new-password"
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
                disabled={registerMutation.isPending || isProcessingAvatar}
                data-testid="button-signup"
              >
                {registerMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : isProcessingAvatar ? (
                  "Preparing photo..."
                ) : (
                  "Sign up"
                )}
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link href="/auth/login" className="underline hover:text-primary" data-testid="link-login">
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
