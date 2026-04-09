import { AdminSetup } from '../../../../components/AdminSetup';

export default async function AdminSetupPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <AdminSetup token={token} />;
}
