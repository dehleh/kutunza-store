import { useEffect } from 'react';

type KeyboardShortcut = {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  action: () => void;
  description?: string;
};

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
  preventInInputs?: boolean;
}

export const useKeyboardShortcuts = ({
  shortcuts,
  enabled = true,
  preventInInputs = true,
}: UseKeyboardShortcutsOptions) => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if in input/textarea unless specifically allowed
      if (preventInInputs) {
        const target = event.target as HTMLElement;
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
          return;
        }
      }

      for (const shortcut of shortcuts) {
        const keyMatches = event.key === shortcut.key || 
                          event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = shortcut.ctrl === undefined || shortcut.ctrl === (event.ctrlKey || event.metaKey);
        const altMatches = shortcut.alt === undefined || shortcut.alt === event.altKey;
        const shiftMatches = shortcut.shift === undefined || shortcut.shift === event.shiftKey;

        if (keyMatches && ctrlMatches && altMatches && shiftMatches) {
          event.preventDefault();
          shortcut.action();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled, preventInInputs]);
};

// Predefined shortcut sets
export const POSShortcuts = {
  HELP: 'F1',
  HOLD_CART: 'F2',
  RECALL_CART: 'F3',
  APPLY_DISCOUNT: 'F4',
  CASH_PAYMENT: 'F12',
  CLOSE_MODAL: 'Escape',
  SEARCH: 'F5',
  SETTINGS: 'F6',
} as const;

export const AdminShortcuts = {
  NEW_PRODUCT: { key: 'n', ctrl: true },
  SAVE: { key: 's', ctrl: true },
  SEARCH: { key: 'f', ctrl: true },
  REFRESH: { key: 'r', ctrl: true },
} as const;
