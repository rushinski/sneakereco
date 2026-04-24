import { redirect } from 'next/navigation';

export default function LegacyCustomerRegisterRedirect() {
  redirect('/auth/register');
}
