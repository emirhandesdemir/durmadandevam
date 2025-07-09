'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Send, User } from "lucide-react";
import { cn } from "@/lib/utils";

// Dummy message type for the UI
interface Message {
  id: number;
  sender: 'ai' | 'user';
  text: string;
}

export default function StudioPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      sender: 'ai',
      text: "Merhaba! Ben Firebase Studio'daki yapay zeka asistanınızım. Uygulamanızda nasıl bir değişiklik yapmak istersiniz? Örneğin, 'Kullanıcı profiline bir 'arkadaş ekle' butonu ekle' diyebilirsiniz."
    }
  ]);
  const [input, setInput] = useState('');

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // This is a placeholder. In a real implementation, you would send the message
    // to your backend/AI service and get a response.
    const userMessage: Message = { id: Date.now(), sender: 'user', text: input };
    const aiResponse: Message = { id: Date.now() + 1, sender: 'ai', text: `"${input}" isteğinizi anladım. Ancak bu arayüz şu anda sadece bir gösterimdir ve isteğinizi işleyemez. Lütfen Firebase Studio'nun ana arayüzünü kullanmaya devam edin.` };
    
    setMessages(prev => [...prev, userMessage, aiResponse]);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-8rem)]">
      <div className="flex items-center gap-4">
        <Sparkles className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Studio AI</h1>
          <p className="text-muted-foreground mt-1">
            Uygulamanızda değişiklik yapmak için AI asistanınızla sohbet edin.
          </p>
        </div>
      </div>

      <Card className="mt-8 flex-1 flex flex-col">
        <CardContent className="p-0 flex-1 flex flex-col">
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-6">
              {messages.map((message) => (
                <div key={message.id} className={cn(
                    "flex items-start gap-4",
                    message.sender === 'user' && "justify-end"
                )}>
                  {message.sender === 'ai' && (
                    <Avatar className="h-9 w-9 border">
                      <AvatarFallback><Sparkles className="h-5 w-5"/></AvatarFallback>
                    </Avatar>
                  )}
                  <div className={cn(
                      "max-w-xl rounded-lg p-3 text-sm",
                      message.sender === 'ai' ? "bg-muted" : "bg-primary text-primary-foreground"
                  )}>
                    <p className="leading-relaxed">{message.text}</p>
                  </div>
                   {message.sender === 'user' && (
                    <Avatar className="h-9 w-9 border">
                      <AvatarFallback><User className="h-5 w-5"/></AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="p-4 border-t bg-background/95">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Bir özellik isteyin veya bir hatayı tarif edin..."
                autoComplete="off"
              />
              <Button type="submit">
                <Send className="h-4 w-4" />
                <span className="sr-only">Gönder</span>
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
