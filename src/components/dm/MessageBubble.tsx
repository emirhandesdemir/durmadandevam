// src/components/dm/MessageBubble.tsx
'use client';

import { useState } from 'react';
import type { DirectMessage } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Check, CheckCheck, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import EditMessageDialog from './EditMessageDialog';

interface MessageBubbleProps {
  message: DirectMessage;
  currentUserId: string;
  chatId: string;
}

/**
 * Sohbetteki tek bir mesaj baloncuğunu temsil eder.
 */
export default function MessageBubble({ message, currentUserId, chatId }: MessageBubbleProps) {
  const [isEditing, setIsEditing] = useState(false);
  
  const isSender = message.senderId === currentUserId;
  const alignClass = isSender ? 'items-end' : 'items-start';
  const bubbleClass = isSender
    ? 'bg-primary text-primary-foreground rounded-br-none'
    : 'bg-muted rounded-bl-none';

  const time = message.createdAt ? format(message.createdAt.toDate(), 'HH:mm') : '';

  return (
    <>
      <div className={cn('flex flex-col gap-1', alignClass)}>
        <div className="flex items-end gap-2 max-w-[75%] group">
          {/* Mesajın sol tarafındaki menü (alıcı için) */}
          {!isSender && (
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className="p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><MoreHorizontal className="h-4 w-4"/></button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem disabled>Kopyala</DropdownMenuItem>
                    <DropdownMenuItem disabled>İlet</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Mesaj Baloncuğu */}
          <div className={cn('p-3 rounded-2xl relative', bubbleClass)}>
            {message.imageUrl && (
                <img 
                    src={message.imageUrl} 
                    alt="Gönderilen resim"
                    className="rounded-lg max-w-xs max-h-64 object-cover cursor-pointer mb-2"
                    onClick={() => window.open(message.imageUrl, '_blank')}
                />
            )}
            {message.text && (
                <p className="text-sm break-words whitespace-pre-wrap">{message.text}</p>
            )}
          </div>
          
          {/* Mesajın sağ tarafındaki menü (gönderen için) */}
          {isSender && (
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className="p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><MoreHorizontal className="h-4 w-4"/></button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    {message.text && (
                        <DropdownMenuItem onClick={() => setIsEditing(true)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Düzenle
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuItem disabled className="text-destructive focus:text-destructive">
                         <Trash2 className="mr-2 h-4 w-4" />
                         Sil
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Zaman, Düzenlendi ve Okundu bilgisi */}
        <div className="flex items-center gap-1.5 px-2">
            {message.edited && <span className="text-xs text-muted-foreground italic">düzenlendi</span>}
            <span className="text-xs text-muted-foreground">{time}</span>
            {isSender && (
                message.read 
                ? <CheckCheck className="h-4 w-4 text-primary" /> 
                : <Check className="h-4 w-4 text-muted-foreground" />
            )}
        </div>
      </div>

      <EditMessageDialog 
        isOpen={isEditing}
        onOpenChange={setIsEditing}
        message={message}
        chatId={chatId}
      />
    </>
  );
}
