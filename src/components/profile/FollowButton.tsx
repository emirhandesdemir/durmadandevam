// src/components/profile/FollowButton.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { followUser, unfollowUser } from "@/lib/actions/followActions";
import { Loader2 } from "lucide-react";

interface FollowButtonProps {
  currentUser: any | null;
  targetUser: any;
}

/**
 * Takip etme/çıkarma ve istek gönderme mantığını içeren durum bilgili (stateful) buton.
 */
export default function FollowButton({ currentUser, targetUser }: FollowButtonProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  // Takip durumunu ve istek durumunu belirle
  const isFollowing = currentUser?.following?.includes(targetUser.uid);
  const hasSentRequest = targetUser.followRequests?.some((req: any) => req.uid === currentUser?.uid);

  const handleFollow = async () => {
    if (!currentUser) {
      toast({ variant: "destructive", description: "Bu işlemi yapmak için giriş yapmalısınız." });
      return;
    }
    setIsLoading(true);
    try {
      await followUser(currentUser.uid, targetUser.uid, { username: currentUser.username, photoURL: currentUser.photoURL || null });
      if (targetUser.privateProfile) {
          toast({ description: "Takip isteği gönderildi."});
      }
    } catch (error: any) {
      toast({ variant: "destructive", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnfollow = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      await unfollowUser(currentUser.uid, targetUser.uid);
    } catch (error: any) {
      toast({ variant: "destructive", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentUser || currentUser.uid === targetUser.uid) {
    return null; // Kendi profilinde veya giriş yapmamışsa butonu gösterme
  }

  if (isLoading) {
    return <Button disabled className="w-32"><Loader2 className="animate-spin" /></Button>;
  }

  // Eğer zaten takip ediliyorsa...
  if (isFollowing) {
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
  
  // Eğer profil GİZLİ ise...
  if (targetUser.privateProfile) {
    // ve istek gönderilmişse...
    if (hasSentRequest) {
        return <Button variant="secondary" disabled className="w-32">İstek Gönderildi</Button>;
    }
    // ve istek gönderilmemişse...
    return <Button onClick={handleFollow} className="w-40">Takip İsteği Gönder</Button>;
  }

  // Eğer profil HERKESE AÇIK ve takip edilmiyorsa...
  return <Button onClick={handleFollow} className="w-28">Takip Et</Button>;
}
