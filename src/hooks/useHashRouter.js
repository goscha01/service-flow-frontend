import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';

/**
 * Custom hook for reliable HashRouter navigation
 * Handles both React Router navigation and fallback to hash navigation
 */
export const useHashRouter = () => {
  const navigate = useNavigate();

  const navigateTo = useCallback((path, options = {}) => {
    try {
      // First try React Router navigation
      navigate(path, options);
    } catch (error) {
      console.warn('React Router navigation failed, using hash navigation:', error);
      // Fallback to hash navigation
      window.location.hash = `#${path}`;
    }
  }, [navigate]);

  const navigateReplace = useCallback((path) => {
    navigateTo(path, { replace: true });
  }, [navigateTo]);

  const navigateBack = useCallback(() => {
    try {
      navigate(-1);
    } catch (error) {
      console.warn('React Router back navigation failed, using browser back:', error);
      window.history.back();
    }
  }, [navigate]);

  return {
    navigate: navigateTo,
    navigateReplace,
    navigateBack
  };
};

export default useHashRouter;
