import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { updateNavigationHistory } from '@/lib/navigation';

/**
 * Hook to track navigation history and prevent redirect loops
 */
export function useNavigationHistory() {
  const location = useLocation();

  useEffect(() => {
    updateNavigationHistory(location.pathname);
  }, [location.pathname]);
}
