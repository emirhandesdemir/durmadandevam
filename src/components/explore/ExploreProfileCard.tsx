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
            {/* Background Image */}
            <Image
                src={profile.photoURL || ''}
                alt={`${profile.username} profili`}
                fill
                className="object-cover filter blur-md brightness-75"
                data-ai-hint="profile photo"
            />
            
            {/* Content Overlay */}
            <div className="absolute inset-0 bg-black/30" />
            
            <div className="relative z-10 flex flex-col justify-between h-full p-4 md:p-6">
                {/* Top Section */}
                <div className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center text-center gap-4">
                        <div className={cn("avatar-frame-wrapper", profile.selectedAvatarFrame)}>
                            <Avatar className="relative z-[1] h-32 w-32 border-4 border-white/50 shadow-2xl">
                                <AvatarImage src={profile.photoURL || undefined} />
                                <AvatarFallback className="text-4xl">{profile.username.charAt(1).toUpperCase()}</AvatarFallback>
                            </Avatar>
                        </div>
                        <div>
                             <h2 className="text-3xl font-bold tracking-tight shadow-black/50 [text-shadow:_0_2px_4px_var(--tw-shadow-color)]">{profile.username}</h2>
                             <p className="mt-2 text-base text-white/90 max-w-md mx-auto [text-shadow:_0_1px_2px_var(--tw-shadow-color)] line-clamp-3">
                                {profile.bio || "Henüz bir biyografi eklenmemiş."}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Bottom Action Bar */}
                <div className="flex justify-center items-center gap-4 py-2">
                    {currentUser && currentUserData && (
                        <>
                             <FollowButton currentUserData={currentUserData} targetUser={profile} />
                             <Button asChild variant="outline" className="bg-white/10 border-white/20 hover:bg-white/20 backdrop-blur-sm">
                                <Link href={`/dm/${getChatId(currentUser.uid, profile.uid)}`}>
                                    <MessageCircle className="mr-2 h-4 w-4"/> Mesaj
                                </Link>
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
