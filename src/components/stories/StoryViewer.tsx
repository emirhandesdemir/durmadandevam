'use client';

import { useState, useEffect, useRef } from 'react';
import { UserStoryReel } from '@/lib/types';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import Link from 'next/link';
import { markStoryAsViewed } from '@/lib/actions/storyActions';
import { useAuth } from '@/contexts/AuthContext';

interface StoryViewerProps {
  reels: UserStoryReel[];
  activeReelIndex: number;
  onClose: () => void;
  onNextReel: () => void;
  onPrevReel: () => void;
}

export default function StoryViewer({ reels, activeReelIndex, onClose, onNextReel, onPrevReel }: StoryViewerProps) {
    const { user } = useAuth();
    const [storyIndex, setStoryIndex] = useState(0);
    const [paused, setPaused] = useState(false);
    const animationTargetRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    const activeReel = reels[activeReelIndex];
    const activeStory = activeReel?.stories[storyIndex];

    const goToNextStory = () => {
        if (storyIndex < activeReel.stories.length - 1) {
            setStoryIndex(prev => prev + 1);
        } else {
            onNextReel();
        }
    };

    const goToPrevStory = () => {
        if (storyIndex > 0) {
            setStoryIndex(prev => prev - 1);
        } else {
            onPrevReel();
        }
    };

    useEffect(() => {
        const unseenIndex = reels[activeReelIndex]?.stories.findIndex(s => !s.viewedBy.includes(user?.uid || '')) ?? 0;
        setStoryIndex(unseenIndex >= 0 ? unseenIndex : 0);
    }, [activeReelIndex, reels, user]);

    useEffect(() => {
        const animationTarget = animationTargetRef.current;
        const videoElement = videoRef.current;
        if (!animationTarget) return;

        if (paused) {
            animationTarget.style.animationPlayState = 'paused';
            videoElement?.pause();
        } else {
            animationTarget.style.animationPlayState = 'running';
            videoElement?.play().catch(e => console.error("Video play failed:", e));
        }
    }, [paused]);

    useEffect(() => {
        if (activeStory && user && !activeStory.viewedBy.includes(user.uid)) {
            markStoryAsViewed(activeStory.id, user.uid);
        }
    }, [activeStory, user]);
    
    const handlePointerDown = () => setPaused(true);

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        setPaused(false);
        const { clientX } = e;
        const { left, width } = e.currentTarget.getBoundingClientRect();
        const clickPosition = (clientX - left) / width;

        if (clickPosition < 0.3) {
            goToPrevStory();
        } else {
            goToNextStory();
        }
    };

    if (!activeReel || !activeStory) return null;

    return (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center select-none">
            <div className="relative aspect-[9/16] w-full max-w-md h-full max-h-[95vh] bg-muted/20 rounded-xl overflow-hidden" onPointerDown={handlePointerDown} onPointerUp={handlePointerUp}>
                {/* Story Content */}
                {activeStory.mediaType === 'image' ? (
                    <img src={activeStory.mediaUrl} alt={`Story by ${activeReel.username}`} className="w-full h-full object-cover"/>
                ) : (
                    <video ref={videoRef} src={activeStory.mediaUrl} autoPlay loop={false} className="w-full h-full object-cover" onEnded={goToNextStory}/>
                )}

                {/* Overlay with Header & Progress */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent">
                    {/* Progress Bars */}
                    <div className="flex gap-1 p-2">
                        {activeReel.stories.map((story, index) => (
                            <div key={story.id} className="relative h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                                 {index < storyIndex && <div className="absolute inset-0 bg-white rounded-full"/>}
                                 {index === storyIndex && (
                                     <div
                                        ref={animationTargetRef}
                                        onAnimationEnd={goToNextStory}
                                        className="h-full bg-white rounded-full origin-left"
                                        style={{ animation: `progress ${activeStory.mediaType === 'video' && videoRef.current ? videoRef.current.duration : 5}s linear forwards` }}
                                    />
                                 )}
                            </div>
                        ))}
                    </div>

                    {/* Header */}
                     <div className="flex items-center justify-between p-2">
                         <Link href={`/profile/${activeReel.uid}`} onClick={onClose} className="flex items-center gap-2 group">
                            <Avatar className="h-9 w-9 border-2 border-white">
                                <AvatarImage src={activeReel.photoURL || undefined}/>
                                <AvatarFallback>{activeReel.username.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="font-bold text-white group-hover:underline">{activeReel.username}</span>
                        </Link>
                        <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-full"><X/></button>
                    </div>
                </div>
            </div>
            
             {/* Navigation Buttons */}
            <button onClick={(e) => { e.stopPropagation(); onPrevReel(); }} className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black/30 p-2 rounded-full hover:bg-black/60 hidden md:block">
                <ChevronLeft size={32} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onNextReel(); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-black/30 p-2 rounded-full hover:bg-black/60 hidden md:block">
                <ChevronRight size={32} />
            </button>
            <style jsx global>{`
                @keyframes progress {
                    from { transform: scaleX(0); }
                    to { transform: scaleX(1); }
                }
            `}</style>
        </div>
    );
}
