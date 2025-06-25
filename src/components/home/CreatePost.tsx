
"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Kullanıcının yeni bir metin veya resim gönderisi oluşturmasını sağlayan bölüm.
 */
export default function CreatePost() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [postContent, setPostContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handlePost = async () => {
        if (!postContent.trim() || !user) return;

        setIsLoading(true);
        try {
            await addDoc(collection(db, "posts"), {
                authorId: user.uid,
                authorName: user.displayName,
                authorPhotoURL: user.photoURL,
                content: postContent,
                createdAt: serverTimestamp(),
                likeCount: 0,
                commentCount: 0,
            });

            setPostContent('');
            toast({
                title: "Gönderi Paylaşıldı!",
            });

        } catch (error) {
            console.error("Error creating post:", error);
            toast({
                title: "Hata",
                description: "Gönderi oluşturulurken bir hata oluştu.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    if (!user) return null;

    return (
        <Card className="shadow-md transition-shadow hover:shadow-lg">
            <CardContent className="p-4">
                <div className="flex items-start gap-4">
                    <Avatar>
                        <AvatarImage src={user?.photoURL || undefined} />
                        <AvatarFallback>{user?.displayName?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="w-full space-y-2">
                        <Textarea
                            placeholder={`Aklında ne var, ${user.displayName}?`}
                            className="min-h-[60px] resize-none border-0 bg-muted/50 focus-visible:ring-0 focus-visible:ring-offset-0"
                            value={postContent}
                            onChange={(e) => setPostContent(e.target.value)}
                            disabled={isLoading}
                        />
                        <div className="flex justify-end">
                            <Button onClick={handlePost} disabled={!postContent.trim() || isLoading}>
                                {isLoading ? (
                                    <Loader2 className="animate-spin" />
                                ) : (
                                    <Send />
                                )}
                                Paylaş
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
