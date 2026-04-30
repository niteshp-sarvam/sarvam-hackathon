"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Box, Button, Input, Text } from "@sarvam/tatva";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import AuthShell from "@/components/AuthShell";
import { loginSchema, type LoginInput } from "@/lib/schemas/auth";

export default function LoginPage() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState("");
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginInput) {
    setSubmitError("");

    const res = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });

    if (res?.error) {
      setSubmitError("Invalid email or password");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <AuthShell>
      <Box
        display="flex"
        direction="column"
        gap={8}
        p={12}
        bg="surface-secondary"
        rounded="lg"
        style={{ width: "100%", maxWidth: 420, boxShadow: "var(--tatva-shadow-l1)" }}
      >
        <Box display="flex" direction="column" gap={2}>
          <Text variant="heading-md">Welcome back</Text>
          <Text variant="body-sm" tone="secondary">
            Sign in to continue your learning journey
          </Text>
        </Box>

        <form
          onSubmit={handleSubmit(onSubmit)}
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <Input
                label="Email"
                type="email"
                size="md"
                placeholder="you@example.com"
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                onBlur={field.onBlur}
                error={errors.email?.message}
              />
            )}
          />

          <Box display="flex" direction="column" gap={2}>
            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <Input
                  label="Password"
                  type="password"
                  size="md"
                  placeholder="Enter your password"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                  error={errors.password?.message}
                />
              )}
            />
            <Box display="flex" justify="end">
              <Text variant="body-xs" tone="tertiary">
                Forgot password? Coming soon.
              </Text>
            </Box>
          </Box>

          {submitError && (
            <Text variant="body-sm" tone="danger">
              {submitError}
            </Text>
          )}

          <Button
            variant="primary"
            size="lg"
            width="full"
            type="submit"
            isLoading={isSubmitting}
          >
            Sign in
          </Button>
        </form>

        <Box display="flex" justify="center" gap={1}>
          <Text variant="body-sm" tone="secondary">
            Don&apos;t have an account?
          </Text>
          <Link href="/signup" style={{ textDecoration: "none" }}>
            <Text variant="body-sm" tone="brand" style={{ cursor: "pointer" }}>
              Sign up
            </Text>
          </Link>
        </Box>
      </Box>
    </AuthShell>
  );
}
