'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function ExitConfirmation() {
  const pathname = usePathname();
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    // This hook should only be active on the home page.
    if (pathname !== '/home') {
      return;
    }

    // Push a dummy state to the history stack.
    // This allows us to intercept the back button press.
    history.pushState(null, '', location.href);

    const handlePopState = (event: PopStateEvent) => {
      // When the user clicks back, this event is triggered.
      // We show the confirmation dialog instead of allowing the app to exit.
      setShowConfirm(true);
    };

    window.addEventListener('popstate', handlePopState);

    // Cleanup the event listener when the component unmounts or path changes.
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [pathname]);

  const handleConfirmExit = () => {
    // This is the most reliable way to close a PWA in some contexts.
    // In a normal browser tab, it might not work, but it's the best we can do.
    window.close();
  };

  const handleCancelExit = () => {
    // To "cancel" the back navigation, we push the state back
    // onto the history stack.
    history.pushState(null, '', location.href);
    setShowConfirm(false);
  };

  if (!showConfirm) {
    return null;
  }

  return (
    <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Uygulamadan Çık</AlertDialogTitle>
          <AlertDialogDescription>
            Çıkmak istediğinize emin misiniz?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancelExit}>İptal</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmExit}>Çıkış Yap</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
