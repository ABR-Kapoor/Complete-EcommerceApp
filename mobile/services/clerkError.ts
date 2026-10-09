type ClerkErrorLike = {
  message?: string;
  longMessage?: string;
  errors?: { message?: string; longMessage?: string }[];
};

export function getClerkErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.'
): string {
  const e = error as ClerkErrorLike | null | undefined;
  return (
    e?.errors?.[0]?.longMessage ||
    e?.errors?.[0]?.message ||
    e?.longMessage ||
    e?.message ||
    fallback
  );
}
