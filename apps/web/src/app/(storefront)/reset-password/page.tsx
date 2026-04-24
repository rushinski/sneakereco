import { redirect } from 'next/navigation';

export default function LegacyResetPasswordRedirect() {
  redirect('/auth/reset-password');
}
