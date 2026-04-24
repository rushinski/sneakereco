import { redirect } from 'next/navigation';

export default function LegacyOtpRedirect() {
  redirect('/auth/otp');
}
