import { redirect } from 'next/navigation';

export default function LegacyOtpVerifyRedirect() {
  redirect('/auth/otp/verify');
}
