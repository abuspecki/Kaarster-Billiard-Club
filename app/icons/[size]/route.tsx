import { appIcon } from '@/lib/app-icon';

const SIZES = [192, 512];

export function generateStaticParams() {
  return SIZES.map((s) => ({ size: String(s) }));
}

export async function GET(_: Request, { params }: { params: Promise<{ size: string }> }) {
  const size = Number((await params).size);
  return appIcon(SIZES.includes(size) ? size : 192);
}
