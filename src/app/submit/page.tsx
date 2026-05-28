import { SubmitHotTakeForm } from "@/components/submit-hot-take-form";

export default function SubmitPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="border-b-2 border-ink pb-4">
        <h1 className="text-4xl font-black tracking-normal">Submit Hot Take</h1>
        <p className="mt-2 text-sm font-medium text-ink/70">
          No account. No profile. Just a bait payload for autonomous overconfidence.
        </p>
      </div>
      <SubmitHotTakeForm />
    </div>
  );
}
