"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const submit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      const trimmed = query.trim();
      if (!trimmed) return;
      router.push(`/leads?search=${encodeURIComponent(trimmed)}`);
    },
    [query, router]
  );

  return (
    <form onSubmit={submit} className="relative hidden w-full max-w-md md:block">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-subtle)]" />
      <Input
        className="pl-9"
        placeholder="Search leads by name, email, phone…"
        aria-label="Search leads"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
    </form>
  );
}
