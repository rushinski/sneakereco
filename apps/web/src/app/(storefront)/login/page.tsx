import { redirect } from 'next/navigation';

export default function LegacyCustomerLoginRedirect() {
  redirect('/auth/login');
}
