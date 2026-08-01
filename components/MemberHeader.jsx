import PartyBadge from "@/components/PartyBadge";

export default function MemberHeader({ profile }) {
  const subtitle = profile.office || [profile.chamber, profile.state].filter(Boolean).join(" · ");

  return (
    <header className="mb-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
          {profile.name}
        </h1>
        <PartyBadge party={profile.party} />
      </div>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{subtitle || "—"}</p>
      <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
        Most recent disclosure: {profile.mostRecentDisclosureDate || "—"}
      </p>
    </header>
  );
}
