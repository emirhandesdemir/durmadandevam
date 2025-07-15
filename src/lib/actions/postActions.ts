// src/lib/actions/postActions.ts
'use server';

import { db, storage } from "@/lib/firebase";
import { 
    doc, 
    deleteDoc,
    updateDoc,
    increment,
    runTransaction,
    getDoc,
    serverTimestamp,
    arrayRemove,
    arrayUnion,
    addDoc,
    collection
} from "firebase/firestore";
import { ref, deleteObject, getDownloadURL, uploadString } from "firebase/storage";
import { revalidatePath } from "next/cache";
import { createNotification } from "./notificationActions";
import { findUserByUsername } from "./userActions";
import { emojiToDataUrl } from "../utils";

async function handlePostMentions(postId: string, text: string, sender: { uid: string; displayName: string | null; photoURL: string | null; userAvatarFrame?: string, profileEmoji?: string | null }) {
    if (!text) return;
    const mentionRegex = /(?<!\S)@\w+/g;
    const mentions = text.match(mentionRegex);

    if (mentions) {
        const mentionedUsernames = new Set(mentions);

        for (const username of mentions) {
            const cleanUsername = username.substring(1);
            if (cleanUsername) {
                const mentionedUser = await findUserByUsername(cleanUsername);
                if (mentionedUser && mentionedUser.uid !== sender.uid) {
                    const postSnap = await getDoc(doc(db, "posts", postId));
                    const postData = postSnap.data();
                    await createNotification({
                        recipientId: mentionedUser.uid,
                        senderId: sender.uid,
                        senderUsername: sender.displayName || "Biri",
                        photoURL: sender.photoURL,
                        profileEmoji: sender.profileEmoji,
                        senderAvatarFrame: sender.userAvatarFrame,
                        type: 'mention',
                        postId: postId,
                        postImage: postData?.imageUrl || null,
                        commentText: text, // The post text where the mention happened
                    });
                }
            }
        }
    }
}

export async function createProfileUpdatePost(data: {
    userId: string;
    username: string;
    profileEmoji: string;
    text: string;
    userAvatarFrame?: string;
    userRole?: 'admin' | 'user';
}) {
    // Generate an image from the emoji
    const emojiImageUrl = await emojiToDataUrl(data.profileEmoji);

    return createPost({
        uid: data.userId,
        username: data.username,
        photoURL: null, // User's actual photoURL is not used for this special post
        profileEmoji: data.profileEmoji,
        userAvatarFrame: data.userAvatarFrame,
        userRole: data.userRole,
        text: data.text,
        imageUrl: emojiImageUrl, // Use the generated emoji image
        language: 'tr', // Default or detect user language
        commentsDisabled: true, // Typically these posts don't need comments
        likesHidden: false,
    });
}


export async function createPost(postData: {
    uid: string;
    username: string;
    photoURL: string | null;
    profileEmoji: string | null;
    userAvatarFrame: string;
    userRole?: 'admin' | 'user';
    userGender?: 'male' | 'female';
    text: string;
    imageUrl?: string;
    videoUrl?: string;
    backgroundStyle?: string;
    editedWithAI?: boolean;
    language: string;
    commentsDisabled?: boolean;
    likesHidden?: boolean;
}) {
    const newPostRef = doc(collection(db, 'posts'));
    const userRef = doc(db, 'users', postData.uid);
    let finalPostId = newPostRef.id;

    await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) throw new Error("User not found.");
        
        const userData = userSnap.data();
        const postCount = userData.postCount || 0;
        
        const newPostData = {
            uid: postData.uid,
            username: postData.username,
            photoURL: postData.photoURL,
            profileEmoji: postData.profileEmoji,
            userAvatarFrame: postData.userAvatarFrame,
            userRole: postData.userRole,
            userGender: postData.userGender,
            text: postData.text,
            imageUrl: postData.imageUrl || null, // Ensure undefined is converted to null
            videoUrl: postData.videoUrl || null,
            backgroundStyle: postData.backgroundStyle,
            editedWithAI: postData.editedWithAI,
            language: postData.language,
            commentsDisabled: postData.commentsDisabled,
            likesHidden: postData.likesHidden,
            createdAt: serverTimestamp(),
            likes: [],
            likeCount: 0,
            commentCount: 0,
            saveCount: 0,
            savedBy: [],
        };
        transaction.set(newPostRef, newPostData);
        
        const userUpdates: { [key: string]: any } = {
            lastActionTimestamp: serverTimestamp(),
            postCount: increment(1)
        };

        if (postCount === 0 && !postData.videoUrl) {
            userUpdates.diamonds = increment(90);
        }
        
        transaction.update(userRef, userUpdates);
    });

    await handlePostMentions(finalPostId, postData.text, {
        uid: postData.uid,
        displayName: postData.username,
        photoURL: postData.photoURL,
        profileEmoji: postData.profileEmoji,
        userAvatarFrame: postData.userAvatarFrame
    });

    revalidatePath('/home');
    if (postData.videoUrl) {
      revalidatePath('/surf');
    }
    if (postData.uid) {
        revalidatePath(`/profile/${postData.uid}`);
    }

    return { success: true, postId: finalPostId };
}


export async function deletePost(postId: string) {
    if (!postId) throw new Error("Gönderi ID'si gerekli.");
    const postRef = doc(db, "posts", postId);
    try {
        await runTransaction(db, async (transaction) => {
            const postSnap = await transaction.get(postRef);
            if (!postSnap.exists()) {
                console.log("Post already deleted.");
                return;
            }
            
            const postData = postSnap.data();
            const userRef = doc(db, 'users', postData.uid);

            transaction.delete(postRef);
            transaction.update(userRef, { postCount: increment(-1) });

            // Do not delete from storage if it's an emoji data URL
            if (postData.imageUrl && !postData.imageUrl.startsWith('data:image/svg+xml')) {
                try {
                    const imageStorageRef = ref(storage, postData.imageUrl);
                    await deleteObject(imageStorageRef);
                } catch(error: any) {
                    if (error.code !== 'storage/object-not-found') {
                        console.error("Storage resmi silinirken hata oluştu:", error);
                    }
                }
            }
            if (postData.videoUrl) {
                 try {
                    const videoRef = ref(storage, postData.videoUrl);
                    await deleteObject(videoRef);
                } catch(error: any) {
                    if (error.code !== 'storage/object-not-found') {
                        console.error("Storage videosu silinirken hata oluştu:", error);
                    }
                }
            }
        });
        revalidatePath('/home');
        revalidatePath('/surf');
    } catch (error) {
        console.error("Gönderi silinirken hata oluştu:", error);
        throw new Error("Gönderi silinemedi.");
    }
}

export async function updatePost(postId: string, updates: { text?: string; commentsDisabled?: boolean; likesHidden?: boolean; }) {
    if (!postId) throw new Error("Gönderi ID'si gerekli.");
    const postRef = doc(db, "posts", postId);
    await updateDoc(postRef, {
        ...updates,
        editedAt: serverTimestamp() // Add an edited timestamp
    });

    const postSnap = await getDoc(postRef);
    if(postSnap.exists()) {
        const postData = postSnap.data();
        revalidatePath('/home');
        revalidatePath(`/profile/${postData.uid}`);
        revalidatePath('/surf');
    }
}


export async function likePost(
    postId: string,
    currentUser: { uid: string, displayName: string | null, photoURL: string | null, profileEmoji: string | null, userAvatarFrame?: string }
) {
    const postRef = doc(db, "posts", postId);
    
    await runTransaction(db, async (transaction) => {
        const postSnap = await transaction.get(postRef);
        if (!postSnap.exists()) throw new Error("Gönderi bulunamadı.");
        const postData = postSnap.data();
        const isCurrentlyLiked = (postData.likes || []).includes(currentUser.uid);

        if (isCurrentlyLiked) {
            transaction.update(postRef, {
                likes: arrayRemove(currentUser.uid),
                likeCount: increment(-1)
            });
        } else {
            transaction.update(postRef, {
                likes: arrayUnion(currentUser.uid),
                likeCount: increment(1)
            });
            
            if (postData.uid !== currentUser.uid) {
                await createNotification({
                    recipientId: postData.uid,
                    senderId: currentUser.uid,
                    senderUsername: currentUser.displayName || "Biri",
                    photoURL: currentUser.photoURL,
                    profileEmoji: currentUser.profileEmoji,
                    senderAvatarFrame: currentUser.userAvatarFrame,
                    type: 'like',
                    postId: postId,
                    postImage: postData.imageUrl || null,
                });
            }
        }
    });
    revalidatePath('/home');
    revalidatePath('/surf');
    revalidatePath(`/profile/*`);
}

export async function toggleSavePost(postId: string, userId: string) {
    if (!postId || !userId) {
        throw new Error("Post ID and User ID are required.");
    }

    const postRef = doc(db, "posts", postId);
    const userRef = doc(db, "users", userId);

    await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        const postDoc = await transaction.get(postRef);

        if (!userDoc.exists()) throw new Error("User not found.");
        if (!postDoc.exists()) throw new Error("Post not found.");

        const userData = userDoc.data();
        
        const isCurrentlySaved = (userData.savedPosts || []).includes(postId);

        if (isCurrentlySaved) {
            // Unsave the post
            transaction.update(userRef, { savedPosts: arrayRemove(postId) });
            transaction.update(postRef, {
                savedBy: arrayRemove(userId),
                saveCount: increment(-1)
            });
        } else {
            // Save the post
            transaction.update(userRef, { savedPosts: arrayUnion(postId) });
            transaction.update(postRef, {
                savedBy: arrayUnion(userId),
                saveCount: increment(1)
            });
        }
    });

    revalidatePath('/home');
    revalidatePath('/surf');
    revalidatePath(`/profile/${userId}`);
}


export async function retweetPost(
    originalPostId: string,
    retweeter: { 
        uid: string; 
        username: string; 
        photoURL: string | null;
        profileEmoji: string | null;
        userAvatarFrame?: string;
        userRole?: 'admin' | 'user';
        userGender?: 'male' | 'female';
    },
    quoteText?: string
) {
    if (!originalPostId || !retweeter?.uid) throw new Error("Gerekli bilgiler eksik.");

    const originalPostRef = doc(db, 'posts', originalPostId);
    const retweeterUserRef = doc(db, 'users', retweeter.uid);
    const newPostRef = doc(collection(db, 'posts'));

    await runTransaction(db, async (transaction) => {
        const originalPostDoc = await transaction.get(originalPostRef);
        if (!originalPostDoc.exists()) throw new Error("Orijinal gönderi bulunamadı.");

        const originalPostData = originalPostDoc.data();
        if (originalPostData.uid === retweeter.uid) throw new Error("Kendi gönderinizi retweetleyemezsiniz.");
        if (originalPostData.retweetOf) throw new Error("Bir retweet'i retweetleyemezsiniz.");

        const retweetSnapshot = {
            postId: originalPostId,
            uid: originalPostData.uid,
            username: originalPostData.username,
            photoURL: originalPostData.photoURL,
            profileEmoji: originalPostData.profileEmoji,
            userAvatarFrame: originalPostData.userAvatarFrame,
            text: originalPostData.text,
            imageUrl: originalPostData.imageUrl,
            videoUrl: originalPostData.videoUrl,
            createdAt: originalPostData.createdAt,
        };

        const newPostData = {
            uid: retweeter.uid,
            username: retweeter.username,
            photoURL: retweeter.photoURL,
            profileEmoji: retweeter.profileEmoji,
            userAvatarFrame: retweeter.userAvatarFrame,
            userRole: retweeter.userRole,
            userGender: retweeter.userGender,
            text: quoteText || '',
            imageUrl: '', 
            videoUrl: '', 
            createdAt: serverTimestamp(),
            likes: [],
            likeCount: 0,
            commentCount: 0,
            retweetOf: retweetSnapshot
        };

        transaction.set(newPostRef, newPostData);
        transaction.update(retweeterUserRef, { 
            postCount: increment(1),
            lastActionTimestamp: serverTimestamp()
        });
    });
    
    const originalPostData = (await getDoc(originalPostRef)).data();
    if(originalPostData) {
        await createNotification({
            recipientId: originalPostData.uid,
            senderId: retweeter.uid,
            senderUsername: retweeter.username,
            photoURL: retweeter.photoURL,
            profileEmoji: retweeter.profileEmoji,
            senderAvatarFrame: retweeter.userAvatarFrame,
            type: 'retweet',
            postId: newPostRef.id,
        });
    }


    revalidatePath('/home');
    revalidatePath(`/profile/${retweeter.uid}`);
}

```
  </change>
  <change>
    <file>/src/components/profile/profile-page-client.tsx</file>
    <content><![CDATA[// src/components/profile/profile-page-client.tsx
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Palette, Loader2, Sparkles, Lock, Gift, Copy, Users, Globe, User as UserIcon, Shield, Crown, Sun, Moon, Laptop, Brush, ShieldOff, X } from "lucide-react";
import { useTheme } from "next-themes";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Switch } from "../ui/switch";
import { useState, useEffect, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../common/LanguageSwitcher";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import Link from "next/link";
import BlockedUsersDialog from "./BlockedUsersDialog";
import { updateUserProfile } from "@/lib/actions/userActions";
import { updateProfile } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Textarea } from "../ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { ScrollArea } from "../ui/scroll-area";
import NewProfilePicturePostDialog from "./NewProfilePicturePostDialog";
import { AnimatePresence, motion } from "framer-motion";
import { emojiToDataUrl } from "@/lib/utils";


const bubbleOptions = [
    { id: "", name: "Yok" },
    { id: "bubble-style-1", name: "Neon" },
    { id: "bubble-style-2", name: "Okyanus" },
    { id: "bubble-style-3", name: "Gün Batımı" },
    { id: "bubble-style-4", name: "Orman" },
    { id: "bubble-style-fire", name: "Alevli" },
    { id: "bubble-style-premium", name: "Premium", isPremium: true },
];

const avatarFrameOptions = [
    { id: "", name: "Yok" },
    { id: "avatar-frame-angel", name: "Melek Kanadı" },
    { id: "avatar-frame-devil", name: "Şeytan Kanadı" },
    { id: "avatar-frame-snake", name: "Yılan" },
    { id: "avatar-frame-tech", name: "Tekno Aura" },
    { id: "avatar-frame-premium", name: "Premium", isPremium: true },
];

const EMOJI_LIST = ['🙂', '😂', '😍', '🤔', '😎', '😢', '😡', '🤯', '🥳', '👍', '👎', '❤️', '🔥', '⭐', '🚀', '🌈', '💡', '🤖', '👻', '👽', '👾', '👑', '🎩', '💼'];

export default function ProfilePageClient() {
    const { user, userData, loading, handleLogout } = useAuth();
    const { toast } = useToast();
    const { theme, setTheme } = useTheme();
    const { t } = useTranslation();
    
    const [username, setUsername] = useState("");
    const [bio, setBio] = useState("");
    const [age, setAge] = useState<number | string>("");
    const [city, setCity] = useState("");
    const [country, setCountry] = useState("");
    const [gender, setGender] = useState<'male' | 'female' | undefined>(undefined);
    const [privateProfile, setPrivateProfile] = useState(false);
    const [acceptsFollowRequests, setAcceptsFollowRequests] = useState(true);
    const [showOnlineStatus, setShowOnlineStatus] = useState(true);
    const [profileEmoji, setProfileEmoji] = useState<string | null>("");
    const [selectedBubble, setSelectedBubble] = useState("");
    const [selectedAvatarFrame, setSelectedAvatarFrame] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [inviteLink, setInviteLink] = useState("");
    const [isBlockedUsersOpen, setIsBlockedUsersOpen] = useState(false);
    const [interests, setInterests] = useState<string[]>([]);
    const [currentInterest, setCurrentInterest] = useState("");
    const [showNewPfpPostDialog, setShowNewPfpPostDialog] = useState(false);

    const isPremium = userData?.premiumUntil && userData.premiumUntil.toDate() > new Date();

    useEffect(() => {
        if (userData) {
            setUsername(userData.username || "");
            setBio(userData.bio || "");
            setAge(userData.age || "");
            setCity(userData.city || "");
            setCountry(userData.country || "");
            setGender(userData.gender);
            setPrivateProfile(userData.privateProfile || false);
            setAcceptsFollowRequests(userData.acceptsFollowRequests ?? true);
            setShowOnlineStatus(userData.showOnlineStatus ?? true);
            setProfileEmoji(userData.profileEmoji || '🙂');
            setSelectedBubble(userData.selectedBubble || "");
            setSelectedAvatarFrame(userData.selectedAvatarFrame || "");
            setInterests(userData.interests || []);
        }
        if (user) {
            const encodedRef = btoa(user.uid);
            setInviteLink(`${window.location.origin}/signup?ref=${encodedRef}`);
        }
    }, [userData, user]);
    
    const hasChanges = useMemo(() => {
        if (!userData) return false;
        
        const ageAsNumber = age === '' || age === undefined ? undefined : Number(age);
        const userDataAge = userData.age === undefined ? undefined : Number(userData.age);

        if (username.trim() !== (userData.username || '').trim()) return true;
        if (bio.trim() !== (userData.bio || '').trim()) return true;
        if (ageAsNumber !== userDataAge) return true;
        if (city.trim() !== (userData.city || '').trim()) return true;
        if (country.trim() !== (userData.country || '').trim()) return true;
        if (gender !== (userData.gender || undefined)) return true;
        if (privateProfile !== (userData.privateProfile || false)) return true;
        if (acceptsFollowRequests !== (userData.acceptsFollowRequests ?? true)) return true;
        if (showOnlineStatus !== (userData.showOnlineStatus ?? true)) return true;
        if ((profileEmoji || '🙂') !== (userData.profileEmoji || '🙂')) return true;
        if (selectedBubble !== (userData.selectedBubble || '')) return true;
        if (selectedAvatarFrame !== (userData.selectedAvatarFrame || '')) return true;
        if (JSON.stringify(interests.map(i => i.trim()).sort()) !== JSON.stringify((userData.interests || []).map(i => i.trim()).sort())) return true;
    
        return false;
    }, [
        username, bio, age, city, country, gender, privateProfile, 
        acceptsFollowRequests, showOnlineStatus, profileEmoji, selectedBubble, 
        selectedAvatarFrame, interests, userData
    ]);
    
    
    const handleSaveChanges = async () => {
        if (!user || !hasChanges || !auth.currentUser) return;
        
        const emojiWasUpdated = (profileEmoji || '🙂') !== (userData?.profileEmoji || '🙂');

        setIsSaving(true);
        try {
            await updateUserProfile({ userId: user.uid, username, bio, age, city, country, gender, privateProfile, acceptsFollowRequests, showOnlineStatus, profileEmoji, selectedBubble, selectedAvatarFrame, interests });

            toast({
                title: "Başarılı!",
                description: "Profiliniz başarıyla güncellendi.",
            });

            if (emojiWasUpdated) {
                setShowNewPfpPostDialog(true);
            }
            
        } catch (error: any) {
            toast({
                title: "Hata",
                description: error.message || "Profil güncellenirken bir hata oluştu.",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddInterest = () => {
        const newInterest = currentInterest.trim();
        if (newInterest && !interests.includes(newInterest) && interests.length < 10) {
            setInterests([...interests, newInterest]);
            setCurrentInterest('');
        }
    };
    
    const handleRemoveInterest = (interestToRemove: string) => {
        setInterests(interests.filter(i => i !== interestToRemove));
    };
    
    if (loading || !user || !userData) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    const copyToClipboard = () => {
        navigator.clipboard.writeText(inviteLink);
        toast({ description: "Davet linki kopyalandı!" });
    };

    return (
        <>
            <div className="space-y-6 pb-24">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3"><UserIcon className="h-6 w-6" />Profil Bilgileri</CardTitle>
                        <CardDescription>Profilinizde görünecek herkese açık bilgiler.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div className="flex items-center gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="emoji">Profil Emoji</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-20 h-20 text-4xl text-center rounded-2xl">
                                            {profileEmoji}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <ScrollArea className="h-48">
                                            <div className="grid grid-cols-6 gap-1 p-2">
                                                {EMOJI_LIST.map(emoji => (
                                                    <Button
                                                        key={emoji}
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-2xl rounded-lg"
                                                        onClick={() => setProfileEmoji(emoji)}
                                                    >
                                                        {emoji}
                                                    </Button>
                                                ))}
                                            </div>
                                        </ScrollArea>
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2 flex-1">
                                <Label htmlFor="username">Kullanıcı Adı</Label>
                                <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="bio">Biyografi</Label>
                            <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Kendini anlat..." className="rounded-xl" maxLength={150} />
                        </div>
                         <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <Label htmlFor="age">Yaş</Label>
                                <Input id="age" type="number" value={age || ''} onChange={(e) => setAge(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Cinsiyet</Label>
                                <RadioGroup
                                    value={gender}
                                    onValueChange={(value: 'male' | 'female') => setGender(value)}
                                    className="flex space-x-4 pt-2"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="male" id="male" />
                                        <Label htmlFor="male" className="font-normal cursor-pointer">Erkek</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="female" id="female" />
                                        <Label htmlFor="female" className="font-normal cursor-pointer">Kadın</Label>
                                    </div>
                                </RadioGroup>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="city">Şehir</Label>
                                <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="country">Ülke</Label>
                                <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} />
                            </div>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="interests">İlgi Alanlarım (Maks. 10)</Label>
                             <div className="flex gap-2">
                                <Input 
                                    id="interests" 
                                    value={currentInterest} 
                                    onChange={(e) => setCurrentInterest(e.target.value)} 
                                    onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleAddInterest(); } }}
                                    placeholder="örn: Kitap Okumak, Oyun"
                                />
                                <Button type="button" onClick={handleAddInterest}>Ekle</Button>
                            </div>
                             <div className="flex flex-wrap gap-2 pt-2">
                                {interests.map(interest => (
                                    <div key={interest} className="flex items-center gap-1 bg-secondary text-secondary-foreground rounded-full px-3 py-1 text-sm">
                                        {interest}
                                        <button onClick={() => handleRemoveInterest(interest)} className="ml-1 text-muted-foreground hover:text-destructive">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Accordion type="multiple" className="w-full space-y-4">
                    <AccordionItem value="item-1" asChild>
                        <Card>
                             <AccordionTrigger className="p-6">
                                <CardHeader className="p-0 text-left">
                                    <div className="flex items-center gap-3">
                                        <Palette className="h-6 w-6 text-primary" />
                                        <CardTitle>Görünüm Ayarları</CardTitle>
                                    </div>
                                    <CardDescription>Uygulamanın genel görünümünü özelleştirin.</CardDescription>
                                </CardHeader>
                            </AccordionTrigger>
                            <AccordionContent className="p-6 pt-0">
                                <div className="space-y-6">
                                    <div>
                                        <Label className="text-base font-medium">Tema</Label>
                                        <RadioGroup value={theme} onValueChange={setTheme} className="grid grid-cols-3 gap-2 pt-2">
                                            <Label htmlFor="light-theme" className={cn("flex flex-col items-center justify-center rounded-lg border-2 p-3 hover:bg-accent hover:text-accent-foreground cursor-pointer", theme === 'light' && "border-primary")}>
                                                <RadioGroupItem value="light" id="light-theme" className="sr-only" />
                                                <Sun className="mb-2 h-6 w-6" />
                                                <span className="font-bold text-xs">Aydınlık</span>
                                            </Label>
                                            <Label htmlFor="dark-theme" className={cn("flex flex-col items-center justify-center rounded-lg border-2 p-3 hover:bg-accent hover:text-accent-foreground cursor-pointer", theme === 'dark' && "border-primary")}>
                                                <RadioGroupItem value="dark" id="dark-theme" className="sr-only" />
                                                <Moon className="mb-2 h-6 w-6" />
                                                <span className="font-bold text-xs">Karanlık</span>
                                            </Label>
                                            <Label htmlFor="system-theme" className={cn("flex flex-col items-center justify-center rounded-lg border-2 p-3 hover:bg-accent hover:text-accent-foreground cursor-pointer", theme === 'system' && "border-primary")}>
                                                <RadioGroupItem value="system" id="system-theme" className="sr-only" />
                                                <Laptop className="mb-2 h-6 w-6" />
                                                <span className="font-bold text-xs">Sistem</span>
                                            </Label>
                                        </RadioGroup>
                                    </div>
                                    <div>
                                        <Label className="text-base font-medium">Sohbet Baloncuğu</Label>
                                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-2">
                                            {bubbleOptions.map(option => (
                                                <button key={option.id} onClick={() => setSelectedBubble(option.id)} disabled={option.isPremium && !isPremium} className={cn("flex flex-col items-center justify-center gap-2 rounded-lg border-2 cursor-pointer p-2 aspect-square hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50", selectedBubble === option.id ? "border-primary" : "")}>
                                                    <div className="relative h-12 w-12 bg-muted rounded-full overflow-hidden">
                                                        {option.id !== "" && (<div className={`bubble-wrapper ${option.id}`}>{Array.from({ length: 5 }).map((_, i) => <div key={i} className="bubble" />)}</div>)}
                                                        {option.isPremium && <Crown className="absolute top-1 right-1 h-4 w-4 text-red-500"/>}
                                                    </div>
                                                    <span className="text-xs font-bold text-center">{option.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-base font-medium">Avatar Çerçevesi</Label>
                                         <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-2">
                                            {avatarFrameOptions.map(option => (
                                                <button key={option.id} onClick={() => setSelectedAvatarFrame(option.id)} disabled={option.isPremium && !isPremium} className={cn("flex flex-col items-center justify-center gap-2 rounded-lg border-2 cursor-pointer p-2 aspect-square hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50", selectedAvatarFrame === option.id ? "border-primary" : "")}>
                                                    <div className={cn("avatar-frame-wrapper h-12 w-12", option.id)}>
                                                        <Avatar className="relative z-[1] h-full w-full bg-muted" />
                                                        {option.isPremium && <Crown className="absolute top-0 right-0 h-4 w-4 text-red-500"/>}
                                                    </div>
                                                    <span className="text-xs font-bold text-center">{option.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </AccordionContent>
                        </Card>
                    </AccordionItem>
                    
                    <AccordionItem value="item-2" asChild>
                         <Card>
                             <AccordionTrigger className="p-6">
                                <CardHeader className="p-0 text-left">
                                    <div className="flex items-center gap-3">
                                        <Lock className="h-6 w-6 text-primary" />
                                        <CardTitle>Gizlilik ve Güvenlik</CardTitle>
                                    </div>
                                    <CardDescription>Hesabınızın gizliliğini ve kimlerin sizinle etkileşim kurabileceğini yönetin.</CardDescription>
                                </CardHeader>
                            </AccordionTrigger>
                             <AccordionContent className="p-6 pt-0 space-y-4">
                                 <div className="flex items-center justify-between">
                                    <div>
                                        <Label htmlFor="privacy-mode" className="font-semibold">Gizli Hesap</Label>
                                        <p className="text-xs text-muted-foreground">Aktif olduğunda, sadece onayladığın kişiler seni takip edebilir.</p>
                                    </div>
                                    <Switch id="privacy-mode" checked={privateProfile} onCheckedChange={setPrivateProfile} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label htmlFor="requests-mode" className={cn("font-semibold transition-colors", !privateProfile && "text-muted-foreground/50")}>Takip İsteklerine İzin Ver</Label>
                                        <p className={cn("text-xs text-muted-foreground transition-colors", !privateProfile && "text-muted-foreground/50")}>Kapalıysa, kimse size takip isteği gönderemez.</p>
                                    </div>
                                    <Switch id="requests-mode" checked={acceptsFollowRequests} onCheckedChange={setAcceptsFollowRequests} disabled={!privateProfile}/>
                                </div>
                                <div className="flex items-center justify-between rounded-lg border p-3">
                                    <div>
                                        <Label htmlFor="online-status" className="font-semibold">Çevrimiçi Durumumu Göster</Label>
                                        <p className="text-xs text-muted-foreground">Aktif olduğunda, diğer kullanıcılar çevrimiçi olduğunu görebilir.</p>
                                    </div>
                                    <Switch id="online-status" checked={showOnlineStatus} onCheckedChange={setShowOnlineStatus} />
                                </div>
                                 <div className="flex items-center justify-between">
                                    <Button variant="outline" className="w-full" onClick={() => setIsBlockedUsersOpen(true)}>
                                        <ShieldOff className="mr-2 h-4 w-4"/>Engellenen Hesapları Yönet
                                    </Button>
                                </div>
                            </AccordionContent>
                        </Card>
                    </AccordionItem>
                     
                    <AccordionItem value="item-4" asChild>
                        <Card>
                            <AccordionTrigger className="p-6">
                                <CardHeader className="p-0 text-left">
                                    <div className="flex items-center gap-3">
                                        <Sparkles className="h-6 w-6 text-primary" />
                                        <CardTitle>Ekstra</CardTitle>
                                    </div>
                                    <CardDescription>Davet sistemi, dil ayarları ve daha fazlası.</CardDescription>
                                </CardHeader>
                            </AccordionTrigger>
                            <AccordionContent className="p-6 pt-0">
                                 <div className="space-y-6">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <Gift className="h-5 w-5 text-muted-foreground" />
                                            <Label className="text-base font-semibold">{t('invitation_system')}</Label>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Bu linki arkadaşlarınla paylaş. Senin linkinle kayıt olan her arkadaşın için <strong>10 elmas</strong> kazan!
                                        </p>
                                         <div className="text-sm font-semibold p-2 bg-muted rounded-md text-center flex items-center justify-center gap-2 mt-2">
                                            <Users className="h-4 w-4"/>
                                            <span>Bu linkle toplam <span className="text-primary">{userData.referralCount || 0}</span> kişi kayıt oldu.</span>
                                        </div>
                                        <div className="flex gap-2 mt-2">
                                            <Input value={inviteLink} readOnly className="text-sm" />
                                            <Button onClick={copyToClipboard} variant="outline" size="icon"><Copy className="h-4 w-4" /></Button>
                                        </div>
                                    </div>
                                    <div>
                                         <div className="flex items-center gap-3 mb-2">
                                            <Globe className="h-5 w-5 text-muted-foreground" />
                                            <Label className="text-base font-semibold">{t('language_settings')}</Label>
                                        </div>
                                         <LanguageSwitcher />
                                    </div>
                                </div>
                            </AccordionContent>
                        </Card>
                    </AccordionItem>
                </Accordion>
                    
                {userData.role === 'admin' && (
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <Shield className="h-6 w-6 text-primary" />
                                <CardTitle>Yönetim</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Button asChild>
                                <Link href="/admin">
                                    <Shield className="mr-2 h-4 w-4" />
                                    Yönetim Paneline Git
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                )}
                    
                <Card>
                    <CardHeader>
                        <CardTitle>Hesap İşlemleri</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                        <Button variant="destructive" onClick={handleLogout}>
                            <LogOut className="mr-2 h-4 w-4" />Çıkış Yap
                        </Button>
                    </CardContent>
                </Card>
            </div>
            
            <AnimatePresence>
            {hasChanges && (
                <motion.div
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: "100%", opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="fixed bottom-[68px] left-0 right-0 z-50 p-4 bg-background/80 backdrop-blur-sm border-t"
                >
                    <div className="container mx-auto flex justify-between items-center max-w-2xl">
                        <p className="text-sm font-semibold">Kaydedilmemiş değişiklikleriniz var.</p>
                        <Button onClick={handleSaveChanges} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t('save_changes')}
                        </Button>
                    </div>
                </motion.div>
            )}
            </AnimatePresence>
            
            <BlockedUsersDialog isOpen={isBlockedUsersOpen} onOpenChange={setIsBlockedUsersOpen} blockedUserIds={userData.blockedUsers || []}/>

            <NewProfilePicturePostDialog 
                isOpen={showNewPfpPostDialog}
                onOpenChange={setShowNewPfpPostDialog}
                newEmoji={profileEmoji}
            />
        </>
    );
}
