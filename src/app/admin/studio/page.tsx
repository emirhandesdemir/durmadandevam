'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Send, User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { studioChat, type StudioChatInput } from '@/ai/flows/studioChatFlow';

interface Message {
  role: 'model' | 'user';
  content: string;
}

export default function StudioPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      content: "Merhaba! Ben Firebase Studio'daki yapay zeka asistanınızım. Uygulamanızda nasıl bir değişiklik yapmak istersiniz? Örneğin, 'Kullanıcı profiline bir 'arkadaş ekle' butonu ekle' diyebilirsiniz."
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);


  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const newUserMessage: Message = { role: 'user', content: input };
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
        const chatInput: StudioChatInput = {
            history: updatedMessages.map(m => ({
                role: m.role,
                content: m.content
            }))
        }

        const aiResponse = await studioChat(chatInput);
        
        if (aiResponse.response) {
            setMessages(prev => [...prev, { role: 'model', content: aiResponse.response }]);
        }

    } catch (error) {
        console.error("Chat error:", error);
        setMessages(prev => [...prev, { role: 'model', content: "Üzgünüm, bir hata oluştu. Lütfen daha sonra tekrar deneyin." }]);
    } finally {
        setIsLoading(false);
    }
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
          <ScrollArea className="flex-1 p-6" ref={scrollAreaRef}>
            <div className="space-y-6">
              {messages.map((message, index) => (
                <div key={index} className={cn(
                    "flex items-start gap-4",
                    message.role === 'user' && "justify-end"
                )}>
                  {message.role === 'model' && (
                    <Avatar className="h-9 w-9 border">
                      <AvatarFallback><Sparkles className="h-5 w-5 text-primary"/></AvatarFallback>
                    </Avatar>
                  )}
                  <div className={cn(
                      "max-w-xl rounded-lg p-3 text-sm whitespace-pre-wrap",
                      message.role === 'model' ? "bg-muted" : "bg-primary text-primary-foreground"
                  )}>
                    <p className="leading-relaxed">{message.content}</p>
                  </div>
                   {message.role === 'user' && (
                    <Avatar className="h-9 w-9 border">
                      <AvatarFallback><User className="h-5 w-5"/></AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              {isLoading && (
                  <div className="flex items-start gap-4">
                     <Avatar className="h-9 w-9 border">
                      <AvatarFallback><Sparkles className="h-5 w-5 text-primary"/></AvatarFallback>
                    </Avatar>
                    <div className="max-w-xl rounded-lg p-3 text-sm bg-muted flex items-center gap-2">
                        <span className="h-2 w-2 bg-primary rounded-full animate-pulse [animation-delay:-0.3s]"></span>
                        <span className="h-2 w-2 bg-primary rounded-full animate-pulse [animation-delay:-0.15s]"></span>
                        <span className="h-2 w-2 bg-primary rounded-full animate-pulse"></span>
                    </div>
                  </div>
              )}
            </div>
          </ScrollArea>
          <div className="p-4 border-t bg-background/95">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Bir özellik isteyin veya bir hatayı tarif edin..."
                autoComplete="off"
                disabled={isLoading}
              />
              <Button type="submit" disabled={isLoading || !input.trim()}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                <span className="sr-only">Gönder</span>
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
