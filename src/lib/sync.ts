/* eslint-disable @typescript-eslint/no-explicit-any */

async function api(path: string, opts?: RequestInit) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    console.error(`[sync] ${opts?.method ?? "GET"} ${path} failed:`, res.status);
  }
  return res;
}

function json(data: any): string {
  return JSON.stringify(data);
}

export const sync = {
  /** 401: JWT user id not found in DB (e.g. after reset). Client should sign out. */
  async fetchState() {
    const res = await api("/api/user/state");
    if (res.status === 401) return "stale_session" as const;
    if (!res.ok) return null;
    return res.json();
  },

  updateProfile(data: any) {
    api("/api/user/profile", { method: "PUT", body: json(data) });
  },

  addXp(amount: number) {
    api("/api/user/xp", { method: "POST", body: json({ amount }) });
  },

  addGardenCard(card: any) {
    api("/api/user/garden", { method: "POST", body: json(card) });
  },

  updateGardenCard(id: string, card: any) {
    api(`/api/user/garden/${id}`, { method: "PUT", body: json(card) });
  },

  upsertScenarioResult(result: any) {
    api("/api/user/scenarios", { method: "POST", body: json(result) });
  },

  updateLesson(lessonId: string, data: any) {
    api(`/api/user/lessons/${lessonId}`, { method: "PUT", body: json(data) });
  },

  addActivity(entry: any) {
    api("/api/user/activity", { method: "POST", body: json(entry) });
  },

  unlockMilestone(milestoneId: string, type: "foundation" | "curriculum" = "curriculum", achievedAt?: string) {
    api("/api/user/milestones", {
      method: "POST",
      body: json({ milestoneId, type, achievedAt }),
    });
  },

  async migrate(data: any) {
    const res = await api("/api/user/migrate", {
      method: "POST",
      body: json(data),
    });
    return res.ok;
  },
};
