import { useEffect, useRef } from 'react';
import { isAddKey } from '../components/pos/keys';

/**
 * Alt+A (Option+A on a Mac) runs the page's "new" action: a new product, customer, debt… Not
 * while a dialog is open (it would open another one over it).
 */
export function useAddShortcut(onAdd: () => void, enabled = true) {
  const latest = useRef(onAdd);
  useEffect(() => {
    latest.current = onAdd;
  });
  useEffect(() => {
    if (!enabled) return;
    const onKey = (event: KeyboardEvent) => {
      if (!isAddKey(event) || document.querySelector('dialog[open]')) return;
      event.preventDefault();
      latest.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);
}
