'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getStoryFeed } from '@/lib/actions/storyActions';
import type { UserStoryReel } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Skeleton } from '../ui/skeleton';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import StoryViewer from './StoryViewer';
import { cn } from '@/lib/utils';


export default function StoryReel() {
    const { user, userData } = useAuth();
    const router = useRouter();
    const [reels, setReels] = useState<UserStoryReel[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewerOpen, setViewerOpen] = useState(false);
    const [activeReelIndex, setActiveReelIndex] = useState(0);

    useEffect(() => {
        if (user) {
            getStoryFeed(user.uid).then(data => {
                setReels(data);
                setLoading(false);
            });
        } else {
            setLoading(false);
        }
    }, [user]);

    const handleReelClick = (index: number) => {
        setActiveReelIndex(index);
        setViewerOpen(true);
    };

    const handleNextReel = () => {
        if (activeReelIndex < reels.length - 1) {
            setActiveReelIndex(prev => prev + 1);
        } else {
            setViewerOpen(false); // Close if it's the last reel
        }
    };

    const handlePrevReel = () => {
        if (activeReelIndex > 0) {
            setActiveReelIndex(prev => prev - 1);
        }
    };
    
    if (loading) {
        return (
            <div className="flex space-x-4 p-4 border-b">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-16 rounded-full" />)}
            </div>
        )
    }
    
    const currentUserReelIndex = reels.findIndex(r => r.uid === user?.uid);

    return (
        <>
            <div className="p-4 border-b">
                <div className="flex space-x-4 overflow-x-auto pb-2 hide-scrollbar">
                   {/* Add own story button */}
                   {user && (
                       <button onClick={() => {
                           if (currentUserReelIndex !== -1) {
                               handleReelClick(currentUserReelIndex);
                           } else {
                               router.push('/create-story');
                           }
                       }} className="flex flex-col items-center gap-1.5 w-16 text-center flex-shrink-0">
                           <div className="relative h-16 w-16">
                               <Avatar className="h-full w-full">
                                   <AvatarImage src={userData?.photoURL || undefined} />
                                   <AvatarFallback>{userData?.username?.charAt(0)}</AvatarFallback>
                               </Avatar>
                               <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1 border-2 border-background"><Plus size={16}/></div>
                           </div>
                           <span className="text-xs font-medium truncate">Hikayen</span>
                       </button>
                   )}

                    {/* Following stories */}
                    {reels.filter(reel => reel.uid !== user?.uid).map((reel) => {
                         const actualIndex = reels.findIndex(r => r.uid === reel.uid);
                         return (
                            <button key={reel.uid} onClick={() => handleReelClick(actualIndex)} className="flex flex-col items-center gap-1.5 w-16 text-center flex-shrink-0">
                                <div className={cn("rounded-full p-0.5 bg-gradient-to-tr", reel.hasUnseenStories ? "from-yellow-400 via-red-500 to-purple-500" : "bg-transparent")}>
                                     <Avatar className="h-16 w-16 border-2 border-background">
                                        <AvatarImage src={reel.photoURL || undefined}/>
                                        <AvatarFallback>{reel.username.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                </div>
                                <span className="text-xs font-medium truncate">{reel.username}</span>
                            </button>
                        )
                    })}
                </div>
            </div>
            {viewerOpen && (
                 <StoryViewer 
                    reels={reels} 
                    activeReelIndex={activeReelIndex}
                    onClose={() => setViewerOpen(false)}
                    onNextReel={handleNextReel}
                    onPrevReel={handlePrevReel}
                 />
            )}
        </>
    );
}
