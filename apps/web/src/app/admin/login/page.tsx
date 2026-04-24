import { redirect } from 'next/navigation';

export default function LegacyStoreAdminLoginRedirect() {
  redirect('/admin/auth/login');
}
