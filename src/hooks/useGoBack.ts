import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';

/**
 * Custom hook for safe back navigation.
 * Falls back to a default route if there's no history to go back to.
 */
export function useGoBack(fallbackPath: string = '/') {
  const navigate = useNavigate();

  const goBack = useCallback(() => {
    // Check if we have meaningful history (more than initial page load)
    // window.history.state?.idx > 0 means we navigated within the app
    const historyIdx = window.history.state?.idx;
    if (historyIdx !== undefined && historyIdx > 0) {
      navigate(-1);
    } else {
      navigate(fallbackPath, { replace: true });
    }
  }, [navigate, fallbackPath]);

  return goBack;
}
