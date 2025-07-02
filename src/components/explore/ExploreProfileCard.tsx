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
        <div className="relative h-full w-full flex flex-col text-white">
            {/* Background Image - No Blur */}
            <Image
                src={profile.photoURL || ''}
                alt={`${profile.username} profili`}
                fill
                className="object-cover"
                data-ai-hint="profile photo"
            />
            
            {/* Gradient Overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
            
            <div className="relative z-10 flex flex-col justify-end h-full p-4 md:p-6">
                {/* Bottom Info & Action Bar */}
                <div className="flex flex-col items-start gap-3">
                    <div className="flex items-center gap-3">
                        <Link href={`/profile/${profile.uid}`}>
                             <div className={cn("avatar-frame-wrapper", profile.selectedAvatarFrame)}>
                                <Avatar className="relative z-[1] h-12 w-12 border-2 border-white/50">
                                    <AvatarImage src={profile.photoURL || undefined} />
                                    <AvatarFallback>{profile.username.charAt(1).toUpperCase()}</AvatarFallback>
                                </Avatar>
                            </div>
                        </Link>
                        <Link href={`/profile/${profile.uid}`}>
                            <h2 className="text-xl font-bold tracking-tight shadow-black/50 [text-shadow:_0_2px_4px_var(--tw-shadow-color)]">{profile.username}</h2>
                        </Link>
                    </div>

                    <p className="text-sm text-white/90 max-w-md [text-shadow:_0_1px_2px_var(--tw-shadow-color)] line-clamp-3">
                        {profile.bio || "Henüz bir biyografi eklenmemiş."}
                    </p>

                    {currentUser && currentUserData && (
                        <div className="flex items-center gap-2 w-full pt-2">
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
        </div>
    );
}
