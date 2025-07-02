// src/components/explore/ExploreProfileCard.tsx
'use client';

import type { UserProfile } from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import FollowButton from '@/components/profile/FollowButton';
import { useAuth } from '@/contexts/AuthContext';
import { getChatId } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface ExploreProfileCardProps {
    profile: UserProfile;
}

export default function ExploreProfileCard({ profile }: ExploreProfileCardProps) {
    const { user: currentUser, userData: currentUserData } = useAuth();

    return (
        <div className="relative h-full w-full bg-black">
            {/* Background Image: Contained within the bounds, preserving aspect ratio */}
            <Image
                src={profile.photoURL || ''}
                alt={`${profile.username} profili`}
                fill
                className="object-contain" // This is the key change to fix stretching
                data-ai-hint="profile photo"
                sizes="100vh" // Optimize for viewport height
            />
            
            {/* Gradient overlays for text readability */}
            <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/60 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/60 to-transparent" />

            {/* Top Bar with user info */}
            <div className="absolute top-0 left-0 right-0 p-4 z-10 flex justify-between items-center">
                <Link href={`/profile/${profile.uid}`} className="flex items-center gap-3">
                    <div className={cn("avatar-frame-wrapper", profile.selectedAvatarFrame)}>
                        <Avatar className="relative z-[1] h-10 w-10 border-2 border-white/50">
                            <AvatarImage src={profile.photoURL || undefined} />
                            <AvatarFallback>{profile.username.charAt(1).toUpperCase()}</AvatarFallback>
                        </Avatar>
                    </div>
                    <h2 className="font-bold tracking-tight text-white shadow-black/50 [text-shadow:_0_1px_2px_var(--tw-shadow-color)]">{profile.username}</h2>
                </Link>
            </div>

            {/* Bottom Info & Action Bar */}
            <div className="absolute bottom-0 left-0 right-0 z-10 p-4 md:p-6">
                <p className="text-sm text-white/90 max-w-full line-clamp-3 mb-3 [text-shadow:_0_1px_2px_var(--tw-shadow-color)]">
                    {profile.bio || ""}
                </p>
                {currentUser && currentUserData && (
                    <div className="flex items-center gap-2 w-full">
                        <FollowButton currentUserData={currentUserData} targetUser={profile} />
                        <Button asChild variant="outline" className="bg-white/10 border-white/20 hover:bg-white/20 backdrop-blur-sm flex-1">
                            <Link href={`/dm/${getChatId(currentUser.uid, profile.uid)}`}>
                                <MessageCircle className="mr-2 h-4 w-4"/> Mesaj
                            </Link>
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
