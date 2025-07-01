// Bu dosya, react-hot-toast kütüphanesinden esinlenerek oluşturulmuş
// özel bir toast (bildirim) yönetim sistemidir.
// Uygulama genelinde tutarlı ve yönetilebilir bildirimler göstermeyi sağlar.
"use client"

import * as React from "react"
import type { ToastActionElement, ToastProps } from "@/components/ui/toast"

// Aynı anda gösterilecek maksimum toast sayısı.
const TOAST_LIMIT = 1;
// Bir toast kapatıldıktan sonra DOM'dan kaldırılmadan önce beklenecek süre.
const TOAST_REMOVE_DELAY = 1000000;

// Toaster'da gösterilecek toast'ın tip tanımı.
type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
}

// Reducer için eylem tipleri.
const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const;

// Benzersiz ID oluşturmak için bir sayaç.
let count = 0;
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

type ActionType = typeof actionTypes;

// Reducer'ın kabul edeceği eylem tipleri.
type Action =
  | { type: ActionType["ADD_TOAST"]; toast: ToasterToast }
  | { type: ActionType["UPDATE_TOAST"]; toast: Partial<ToasterToast> }
  | { type: ActionType["DISMISS_TOAST"]; toastId?: ToasterToast["id"] }
  | { type: ActionType["REMOVE_TOAST"]; toastId?: ToasterToast["id"] };

// Toast'ların state'ini tutan arayüz.
interface State {
  toasts: ToasterToast[];
}

// Kapatılan toast'ların DOM'dan kaldırılması için zamanlayıcıları tutan harita.
const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return;
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    });
  }, TOAST_REMOVE_DELAY);

  toastTimeouts.set(toastId, timeout);
};

// State'i yöneten reducer fonksiyonu.
export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      // Yeni bir toast ekle ve limiti uygula.
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    case "UPDATE_TOAST":
      // Mevcut bir toast'ı güncelle.
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      };

    case "DISMISS_TOAST": {
      // Bir toast'ı kapat (görünmez yap).
      const { toastId } = action;

      if (toastId) {
        addToRemoveQueue(toastId);
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id);
        });
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? { ...t, open: false }
            : t
        ),
      };
    }
    case "REMOVE_TOAST":
      // Bir toast'ı DOM'dan tamamen kaldır.
      if (action.toastId === undefined) {
        return { ...state, toasts: [] };
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
  }
};

// State değişikliklerini dinleyen bileşenlerin listesi.
const listeners: Array<(state: State) => void> = [];

// Tüm uygulama için tek bir state kaynağı.
let memoryState: State = { toasts: [] };

// State'i güncelleyen ve dinleyicileri bilgilendiren merkezi dispatch fonksiyonu.
function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}

type Toast = Omit<ToasterToast, "id">;

// Dışarıdan kullanılacak ana `toast` fonksiyonu.
function toast({ ...props }: Toast) {
  const id = genId();

  const update = (props: ToasterToast) =>
    dispatch({ type: "UPDATE_TOAST", toast: { ...props, id } });
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id });

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss();
      },
    },
  });

  return { id, dismiss, update };
}

// Bileşenlerin toast state'ine erişmesini ve onu yönetmesini sağlayan custom hook.
function useToast() {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, [state]);

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  };
}

export { useToast, toast };
