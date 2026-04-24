import { redirect } from 'next/navigation';

export default function LegacyVerifyEmailRedirect() {
  redirect('/auth/confirm-email');
}
