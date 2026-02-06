import { useNavigate, useLocation } from 'react-router-dom';
import { useCallback, useEffect, useRef } from 'react';

/**
 * Custom hook for safe back navigation.
 * Falls back to a default route if there's no in-app history to go back to.
 */
export function useGoBack(fallbackPath: string = '/') {
  const navigate = useNavigate();
  const location = useLocation();
  const isFirstPage = useRef(true);
  const locationKey = useRef(location.key);

  // Track if user has navigated within the app
  useEffect(() => {
    if (location.key !== locationKey.current) {
      isFirstPage.current = false;
      locationKey.current = location.key;
    }
  }, [location.key]);

  const goBack = useCallback(() => {
    // If we're on the first page in the app session, use fallback
    if (isFirstPage.current || location.key === 'default') {
      navigate(fallbackPath, { replace: true });
    } else {
      navigate(-1);
    }
  }, [navigate, fallbackPath, location.key]);

  return goBack;
}
