export const handleAuthError = (error, navigate) => {
  // Simple handler; integrate with your router if you add one
  // navigate is optional; pass in a function to redirect if available
  // eslint-disable-next-line no-console
  console.error('Authentication error:', error);
  if (!navigate) return;

  const msg = error?.message || '';
  if (msg.includes('redirect')) {
    navigate('/auth/error?type=redirect');
  } else if (msg.includes('email')) {
    navigate('/auth/error?type=email');
  } else {
    navigate('/auth/error');
  }
};
