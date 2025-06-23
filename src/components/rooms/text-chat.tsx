"use client";

import { useState } from 'react';
import { User } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send } from 'lucide-react';

interface TextChatProps {
  roomId: string;
  currentUser: User;
}

// Mock messages for UI display
const mockMessages = [
    { id: '1', text: 'Herkese selam! Oyun için hazır mısınız?', sender: { name: 'Ahmet', uid: 'abc' } },
    { id: '2', text: 'Hazırım! Ne oynuyoruz?', sender: { name: 'Ayşe', uid: 'def' } },
    { id: '3', text: 'Ben de geldim. Grup tamam mı?', sender: { name: 'Mehmet', uid: 'ghi' } },
];

export default function TextChat({ roomId, currentUser }: TextChatProps) {
  const [message, setMessage] = useState('');

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() === '') return;
    
    // TODO: Implement Firestore message sending logic
    console.log(`Sending message: "${message}" to room: ${roomId}`);
    setMessage('');
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Metin Sohbeti</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-full pr-4">
          <div className="space-y-4">
            {/* Placeholder for no messages */}
            {mockMessages.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                    Sohbeti başlatmak için bir mesaj gönderin!
                </div>
            )}

            {/* Displaying Mock Messages */}
            {mockMessages.map(msg => (
              <div key={msg.id} className="flex items-start gap-3">
                 <Avatar className="h-8 w-8">
                    <AvatarFallback>{msg.sender.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                    <p className="font-semibold text-sm">{msg.sender.name}</p>
                    <div className="bg-secondary p-3 rounded-lg rounded-tl-none">
                        <p className="text-sm">{msg.text}</p>
                    </div>
                </div>
              </div>
            ))}

          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter>
        <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
          <Input 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Bir mesaj yaz..."
          />
          <Button type="submit" size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
