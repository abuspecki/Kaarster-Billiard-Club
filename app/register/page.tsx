import { AuthForm } from '@/components/AuthForm';
import { safeNext } from '@/lib/safe-next';

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <AuthForm mode="register" next={safeNext(next)} />;
}
