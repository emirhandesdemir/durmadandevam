// src/components/profile/FollowButton.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { followUser, unfollowUser } from "@/lib/actions/followActions";
import { Loader2 } from "lucide-react";
import type { UserProfile } from "@/lib/types";

interface FollowButtonProps {
  currentUserData: UserProfile | null;
  targetUser: UserProfile;
}

/**
 * Takip etme/çıkarma ve istek gönderme mantığını içeren durum bilgili (stateful) buton.
 * Optimistic UI güncellemeleri ile anlık kullanıcı deneyimi sunar.
 */
export default function FollowButton({ currentUserData, targetUser }: FollowButtonProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  // Optimistic UI için yerel durum
  const [optimisticState, setOptimisticState] = useState<'following' | 'not_following' | 'request_sent' | null>(null);
  
  const isFollowing = currentUserData?.following?.includes(targetUser.uid);
  const hasSentRequest = targetUser.followRequests?.some((req: any) => req.uid === currentUserData?.uid);

  // Props değiştiğinde optimistic state'i sıfırla
  useEffect(() => {
    setOptimisticState(null);
  }, [isFollowing, hasSentRequest]);

  const handleFollow = async () => {
    if (!currentUserData) {
      toast({ variant: "destructive", description: "Bu işlemi yapmak için giriş yapmalısınız." });
      return;
    }
    setIsLoading(true);

    // Optimistic update
    const nextState = targetUser.privateProfile ? 'request_sent' : 'following';
    setOptimisticState(nextState);

    try {
      await followUser(currentUserData.uid, targetUser.uid, { 
          username: currentUserData.username, 
          photoURL: currentUserData.photoURL || null,
          userAvatarFrame: currentUserData.selectedAvatarFrame || '',
      });
      if (targetUser.privateProfile) {
          toast({ description: "Takip isteği gönderildi."});
      }
    } catch (error: any) {
      // Revert on error
      setOptimisticState(null);
      toast({ variant: "destructive", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnfollow = async () => {
    if (!currentUserData) return;
    setIsLoading(true);

    // Optimistic update
    setOptimisticState('not_following');

    try {
      await unfollowUser(currentUserData.uid, targetUser.uid);
    } catch (error: any) {
      // Revert on error
      setOptimisticState(null);
      toast({ variant: "destructive", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!currentUserData || currentUserData.uid === targetUser.uid) {
    return null; // Kendi profilinde veya giriş yapmamışsa butonu gösterme
  }

  // Determine current state (optimistic or from props)
  let currentState: 'following' | 'not_following' | 'request_sent' = 'not_following';
  if (optimisticState) {
    currentState = optimisticState;
  } else if (isFollowing) {
    currentState = 'following';
  } else if (hasSentRequest) {
    currentState = 'request_sent';
  }

  if (isLoading) {
    return <Button disabled className="w-32"><Loader2 className="animate-spin" /></Button>;
  }
  
  if (currentState === 'following') {
    return (
      <Button
        variant={isHovering ? "destructive" : "outline"}
        onClick={handleUnfollow}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        className="w-28 transition-all"
      >
        {isHovering ? "Takibi Bırak" : "Takiptesin"}
      </Button>
    );
  }

  if (targetUser.privateProfile) {
    if (currentState === 'request_sent') {
      return <Button variant="secondary" disabled className="w-32">İstek Gönderildi</Button>;
    }
    return <Button onClick={handleFollow} className="w-40">Takip İsteği Gönder</Button>;
  }

  return <Button onClick={handleFollow} className="w-28">Takip Et</Button>;
}
