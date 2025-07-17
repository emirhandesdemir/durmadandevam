// This file is no longer needed as the `multiavatar` system in `avatar-studio` is now the primary method.
// This can be deleted in a future cleanup.
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AnimatedLogoLoader from '@/components/common/AnimatedLogoLoader';

export default function AvatarCreatorRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/avatar-studio');
  }, [router]);

  return <AnimatedLogoLoader fullscreen />;
}
