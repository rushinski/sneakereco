import { redirect } from 'next/navigation';

export default function LegacyForgotPasswordRedirect() {
  redirect('/auth/forgot-password');
}
