import type { ActionState } from "@/lib/actions";

export function ActionMessage({ state }: { state?: ActionState }) {
  if (!state?.error && !state?.success) return null;
  return (
    <p className={`action-message ${state.error ? "action-message--error" : "action-message--success"}`} role="status">
      {state.error ?? state.success}
    </p>
  );
}
