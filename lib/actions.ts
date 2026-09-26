export type ActionState = {
  error?: string;
  success?: string;
};

export const firstIssue = (issues: { message: string }[]) => issues[0]?.message ?? "Confira os dados e tente novamente.";
