"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Box, Button, Input, Text } from "@sarvam/tatva";
import AuthShell from "@/components/AuthShell";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("Invalid email or password");
      setLoading(false);
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
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <Input
            label="Email"
            type="email"
            size="md"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error && !email ? "Email is required" : undefined}
          />

          <Box display="flex" direction="column" gap={2}>
            <Input
              label="Password"
              type="password"
              size="md"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={error && !password ? "Password is required" : undefined}
            />
            <Box display="flex" justify="end">
              <Text variant="body-xs" tone="tertiary">
                Forgot password? Coming soon.
              </Text>
            </Box>
          </Box>

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
