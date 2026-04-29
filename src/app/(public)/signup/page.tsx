"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Box, Button, Input, Text } from "@sarvam/tatva";
import AuthShell from "@/components/AuthShell";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Email and password are required");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed");
        setLoading(false);
        return;
      }

      const signInRes = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (signInRes?.error) {
        setError("Account created but sign-in failed. Please try logging in.");
        setLoading(false);
        return;
      }

      router.push("/onboarding");
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
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
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <Input
            label="Name"
            type="text"
            size="md"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Input
            label="Email"
            type="email"
            size="md"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error && !email ? "Email is required" : undefined}
          />

          <Input
            label="Password"
            type="password"
            size="md"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={
              error && password.length > 0 && password.length < 6
                ? "Password must be at least 6 characters"
                : undefined
            }
            helperText={!error ? "Use 6 or more characters" : undefined}
          />

          {error && (
            <Text variant="body-sm" tone="danger">
              {error}
            </Text>
          )}

          <Button
            variant="primary"
            size="lg"
            width="full"
            type="submit"
            isLoading={loading}
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
