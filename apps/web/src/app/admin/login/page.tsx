import { headers } from 'next/headers';
import { AdminLoginForm } from '../../../components/AdminLoginForm';

export default async function AdminLoginPage() {
  const headersList = await headers();
  const tenantSlug = headersList.get('x-tenant-slug') ?? '';
  return <AdminLoginForm tenantSlug={tenantSlug} />;
}
