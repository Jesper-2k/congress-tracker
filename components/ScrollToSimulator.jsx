"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

// Handles ?simulate=true (linked from the leaderboard's "Simulate" button)
// by scrolling the already-rendered #simulator section into view. This is
// a client-only concern: useSearchParams() requires a Suspense boundary
// around it (see the member page), but doesn't force the rest of the page
// into dynamic rendering the way reading searchParams in the Server
// Component itself would — that's why this lives in its own tiny component
// instead of app/member/[name]/page.js.
export default function ScrollToSimulator() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("simulate") === "true") {
      document.getElementById("simulator")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [searchParams]);

  return null;
}
