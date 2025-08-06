// src/components/game/ActiveGameArea.tsx
import type { ActiveGameSession } from "@/lib/types";
import BottleGameUI from "./BottleGameUI";
import DiceGameUI from "./DiceGameUI";
import RpsGameUI from "./RpsGameUI";

interface ActiveGameAreaProps {
  game: ActiveGameSession;
  roomId: string;
  currentUser: { uid: string; username: string };
}

export default function ActiveGameArea({ game, roomId, currentUser }: ActiveGameAreaProps) {
  switch (game.gameType) {
    case 'dice':
      return <DiceGameUI game={game} roomId={roomId} currentUser={currentUser} />;
    case 'rps':
      return <RpsGameUI game={game} roomId={roomId} currentUser={currentUser} />;
    case 'bottle':
      return <BottleGameUI game={game} roomId={roomId} currentUser={currentUser} />;
    default:
      return null;
  }
}
