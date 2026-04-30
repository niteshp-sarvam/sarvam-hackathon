"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Box, Button, Input, Text } from "@sarvam/tatva";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import AuthShell from "@/components/AuthShell";
import { registerSchema, type RegisterInput } from "@/lib/schemas/auth";

export default function SignupPage() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState("");
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: RegisterInput) {
    setSubmitError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error || "Registration failed");
        return;
      }

      const signInRes = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (signInRes?.error) {
        setSubmitError("Account created but sign-in failed. Please try logging in.");
        return;
      }

      router.push("/onboarding");
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    }
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
          <Text variant="heading-md">Create an account</Text>
          <Text variant="body-sm" tone="secondary">
            Start your language learning journey
          </Text>
        </Box>

        <form
          onSubmit={handleSubmit(onSubmit)}
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <Input
                label="Name"
                type="text"
                size="md"
                placeholder="Your name"
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value)}
                onBlur={field.onBlur}
                error={errors.name?.message}
              />
            )}
          />

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

          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <Input
                label="Password"
                type="password"
                size="md"
                placeholder="At least 6 characters"
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                onBlur={field.onBlur}
                error={errors.password?.message}
                helperText={!errors.password ? "Use 6 or more characters" : undefined}
              />
            )}
          />

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
            Create account
          </Button>

          <Text variant="body-xs" tone="tertiary" style={{ textAlign: "center" }}>
            By creating an account you agree to our terms and privacy policy.
          </Text>
        </form>

        <Box display="flex" justify="center" gap={1}>
          <Text variant="body-sm" tone="secondary">
            Already have an account?
          </Text>
          <Link href="/login" style={{ textDecoration: "none" }}>
            <Text variant="body-sm" tone="brand" style={{ cursor: "pointer" }}>
              Sign in
            </Text>
          </Link>
        </Box>
      </Box>
    </AuthShell>
  );
}
