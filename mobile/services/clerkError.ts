type ClerkErrorLike = {
  message?: string;
  longMessage?: string;
  errors?: { message?: string; longMessage?: string; code?: string }[];
  status?: number;
};

export function getClerkErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.'
): string {
  console.log('Clerk Error Object:', JSON.stringify(error, null, 2));
  
  const e = error as ClerkErrorLike | null | undefined;
  
  if (e?.errors && e.errors.length > 0) {
    const firstError = e.errors[0];
    
    if (firstError.code === 'form_password_or_identifier_incorrect') {
      return 'Invalid email or password.';
    }
    if (firstError.code === 'form_identifier_exists') {
      return 'An account with this email already exists.';
    }
    if (firstError.code === 'form_password_not_strong_enough') {
      return 'Password is not strong enough. Please use a stronger password.';
    }
    
    return firstError.longMessage || firstError.message || fallback;
  }

  return (
    e?.longMessage ||
    e?.message ||
    (e?.status === 422 ? 'Invalid input or credentials.' : fallback)
  );
}
