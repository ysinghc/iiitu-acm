import React from 'react';

/**
 * Re-runs the given loader whenever the page regains focus/visibility,
 * so lists stay fresh without a manual reload (e.g. content edited in
 * another tab or by another person).
 */
export function useFocusRefresh(loader) {
  const ref = React.useRef(loader);
  ref.current = loader;
  React.useEffect(() => {
    const run = () => {
      try {
        const out = ref.current && ref.current();
        if (out && typeof out.catch === 'function') out.catch(() => {});
      } catch { /* loader handles its own errors */ }
    };
    const onVis = () => {
      if (document.visibilityState === 'visible') run();
    };
    window.addEventListener('focus', run);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('focus', run);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);
}
