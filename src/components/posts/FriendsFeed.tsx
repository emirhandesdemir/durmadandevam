// src/components/posts/FriendsFeed.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Post, Room } from '@/lib/types';
import PostCard from './PostCard';
import FeedRoomCard from '../rooms/FeedRoomCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { hidePost } from '@/lib/actions/userActions';
import { MessageSquareOff } from 'lucide-react';

export default function FriendsFeed() {
    const { user, userData, loading: authLoading } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [clientHiddenIds, setClientHiddenIds] = useState<string[]>([]);
    
    // FIX: Memoize followingIds and ensure userData is checked.
    const followingIds = useMemo(() => userData?.following, [userData]);

    useEffect(() => {
        // FIX: Wait for auth and user data (especially followingIds) to be loaded.
        if (authLoading || !userData) {
            // If not loading and no user data, it means we can stop.
            if (!authLoading) setLoading(false);
            return;
        }
        
        // If the user is not following anyone, no need to query.
        if (!followingIds || followingIds.length === 0) {
            setLoading(false);
            setPosts([]); 
            return;
        }

        setLoading(true);
        const postsRef = collection(db, 'posts');
        const qPosts = query(postsRef, where('uid', 'in', followingIds), orderBy('createdAt', 'desc'), limit(30));

        const unsubPosts = onSnapshot(qPosts, (snapshot) => {
            const postsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
            setPosts(postsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching friends posts:", error);
            setLoading(false);
        });
        
        const roomsRef = collection(db, 'rooms');
        const qRooms = query(roomsRef, orderBy('voiceParticipantsCount', 'desc'), limit(10));
        
        const unsubRooms = onSnapshot(qRooms, (snapshot) => {
             const roomsData = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as Room))
                .filter(room => room.type !== 'event' && (!room.expiresAt || (room.expiresAt as Timestamp).toMillis() > Date.now()));
            setRooms(roomsData);
        }, (error) => console.error("Error fetching rooms for feed:", error));

        return () => {
            unsubPosts();
            unsubRooms();
        };

    }, [followingIds, authLoading, userData]);
    
    const combinedFeed = useMemo(() => {
        const allHiddenIds = new Set([...(userData?.hiddenPostIds || []), ...clientHiddenIds]);
        const filteredPosts = posts.filter(post => 
            !allHiddenIds.has(post.id) &&
            !userData?.blockedUsers?.includes(post.uid)
        );

        const feed: (Post | Room)[] = [...filteredPosts];
        
        if (rooms.length > 0 && feed.length > 2) {
            feed.splice(2, 0, rooms[0]);
        }
        if (rooms.length > 1 && feed.length > 6) {
            feed.splice(6, 0, rooms[1]);
        }

        return feed;
    }, [posts, rooms, userData, clientHiddenIds]);
    
    const handleHidePost = (postId: string) => {
         setClientHiddenIds(prev => [...prev, postId]);
        if (user) {
            hidePost(user.uid, postId);
        }
    }
    
    if (loading) {
        return (
             <div className="space-y-4 w-full mt-4">
                <Skeleton className="h-96 w-full" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    if (combinedFeed.length === 0) {
        return (
            <div className="text-center text-muted-foreground py-16 px-4">
                <MessageSquareOff className="h-12 w-12 mx-auto mb-4" />
                <h3 className="font-semibold">Akış Boş</h3>
                <p>Takip ettiğin kişilerin gönderileri burada görünecek.</p>
            </div>
        )
    }

    return (
        <div className="w-full">
            <div className="bg-background">
                {combinedFeed.map((item, index) => {
                    if ('likeCount' in item) { // It's a Post
                         return <PostCard key={`post-${item.id}`} post={item as Post} onHide={handleHidePost} />;
                    } else { // It's a Room
                         return (
                            <div key={`room-${item.id}`} className="py-4">
                                <FeedRoomCard room={item as Room} />
                            </div>
                        );
                    }
                })}
            </div>
        </div>
    );
}
