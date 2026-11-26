import { avatarColor, initialOf } from '@/lib/design';
import type { PlayerKey } from '@/lib/types';

const sizes = { sm: 'h-6 w-6 text-[10px]', md: 'h-8 w-8 text-xs', lg: 'h-16 w-16 text-2xl' };

export function PlayerBadge({ player, name, size = 'md' }: { player: PlayerKey; name: string; size?: keyof typeof sizes }) {
  return (
    <span
      aria-hidden
      className={`inline-grid shrink-0 place-items-center rounded-full font-extrabold text-white ${sizes[size]}`}
      style={{ backgroundColor: avatarColor(player) }}
    >
      {initialOf(name)}
    </span>
  );
}
