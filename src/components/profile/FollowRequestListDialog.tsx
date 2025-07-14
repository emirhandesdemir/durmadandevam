// src/components/profile/FollowRequestListDialog.tsx
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, MailWarning } from 'lucide-react';
import FollowRequestList from './FollowRequestList';
import type { FollowRequest } from '@/lib/types';

interface FollowRequestListDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  requests: FollowRequest[];
}

export default function FollowRequestListDialog({
  isOpen,
  onOpenChange,
  requests,
}: FollowRequestListDialogProps) {

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="capitalize">Takip İstekleri</DialogTitle>
           <DialogDescription>{requests.length} yeni takip isteği.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 -mx-6 px-2">
          {requests.length > 0 ? (
            <div className="space-y-1 px-4">
              <FollowRequestList requests={requests} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center p-4">
                <MailWarning className="h-10 w-10 mb-2"/>
                <p>Bekleyen takip isteği yok.</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
