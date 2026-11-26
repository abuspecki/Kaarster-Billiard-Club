import { AuthForm } from '@/components/AuthForm';
import { safeNext } from '@/lib/safe-next';

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; confirmed?: string }> }) {
  const { next, confirmed } = await searchParams;
  return <AuthForm mode="login" next={safeNext(next)} notice={confirmed ? 'E-Mail bestätigt – bitte jetzt anmelden.' : undefined} />;
}
