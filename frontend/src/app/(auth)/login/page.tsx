"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Button,
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardTitle,
  FormField,
  Input,
  useToast,
} from "@eta-ui/react";
import { ClientThemeToggle } from "@/components/shared/client-theme-toggle";
import { apiFetch, ApiError } from "@/lib/api";
import type { AuthUser } from "@/lib/types";
import { useAuthStore } from "@/stores/auth-store";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const setSession = useAuthStore((s) => s.setSession);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "admin@pos.local",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setSubmitting(true);
    try {
      const res = await apiFetch<{ token: string; user: AuthUser }>("/auth/login", {
        method: "POST",
        body: { ...values, device_name: "nextjs-web" },
      });

      setSession(res.data.token, res.data.user);
      toast.success(`Welcome back, ${res.data.user.name}`);
      router.push("/");
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error("Unable to connect to backend API.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-eta-base p-4">
      <div className="absolute right-4 top-4">
        <ClientThemeToggle variant="icon" size="sm" />
      </div>

      <Card variant="elevated" elevation="md" padding="lg" className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-eta-primary text-sm font-bold text-eta-inverse">
            EP
          </div>
          <CardTitle as="h1" className="text-xl">
            Sign in to Enterprise POS
          </CardTitle>
          <CardDescription>
            Enter your account credentials to access your assigned outlet.
          </CardDescription>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              id="email"
              label="Email"
              isRequired
              isInvalid={Boolean(errors.email)}
              errorMessage={errors.email?.message}
            >
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="admin@pos.local"
                isInvalid={Boolean(errors.email)}
                {...register("email")}
              />
            </FormField>

            <FormField
              id="password"
              label="Password"
              isRequired
              isInvalid={Boolean(errors.password)}
              errorMessage={errors.password?.message}
            >
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                isInvalid={Boolean(errors.password)}
                {...register("password")}
              />
            </FormField>

            <Button
              type="submit"
              variant="solid"
              color="primary"
              size="md"
              isLoading={submitting}
              className="w-full"
            >
              Sign In
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
