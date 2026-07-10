"use client";

import { useFeatureFlag } from "@/hooks/use-feature-flag";
import { FEATURE_FLAGS, type FeatureFlag, writeFlag } from "@/lib/feature-flags";

function FlagRow({ flag }: { flag: FeatureFlag }) {
  const value = useFeatureFlag(flag.key);

  return (
    <li className="flex items-start gap-3">
      <input
        id={flag.key}
        type="checkbox"
        className="mt-1 h-5 w-5"
        checked={value}
        onChange={(e) => writeFlag(flag.key, e.target.checked)}
      />
      <label htmlFor={flag.key} className="cursor-pointer">
        <span className="block font-medium">{flag.label}</span>
        <span className="block text-sm text-gray-500">{flag.description}</span>
      </label>
    </li>
  );
}

export default function TogglePage() {
  return (
    <div className="min-h-screen bg-white text-black p-6">
      <h1 className="text-2xl font-bold mb-1">Feature toggles</h1>
      <p className="text-sm text-gray-500 mb-6">
        Poor man&apos;s feature toggles, stored in localStorage.
      </p>
      <ul className="space-y-4 max-w-xl">
        {FEATURE_FLAGS.map((flag) => (
          <FlagRow key={flag.key} flag={flag} />
        ))}
      </ul>
    </div>
  );
}
