// This file is now redundant as we will always have a [chatId]
// It can be removed in a future cleanup.
// For now, redirect to the main matchmaking page.
import { redirect } from 'next/navigation';

export default function MatchmakingChatIndex() {
  redirect('/matchmaking');
}
