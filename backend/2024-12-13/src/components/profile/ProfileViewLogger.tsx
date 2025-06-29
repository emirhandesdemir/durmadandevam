// src/components/profile/ProfileViewLogger.tsx
'use client';
import { useAuth } from '@/contexts/AuthContext';
import { logProfileView } from '@/lib/actions/profileActions';
import { useEffect } from 'react';

export default function ProfileViewLogger({ targetUserId }: { targetUserId: string }) {
  const { user } = useAuth();
  useEffect(() => {
    if (user && user.uid !== targetUserId) {
      logProfileView(targetUserId, user.uid);
    }
  }, [user, targetUserId]);

  return null; // This component renders nothing.
}
