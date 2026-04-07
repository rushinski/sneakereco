import { InviteSetup } from '../../../components/platform/InviteSetup';

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  return <InviteSetup token={token} />;
}
