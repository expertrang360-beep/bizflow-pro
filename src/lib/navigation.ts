/**
 * Navigation utilities to prevent redirect issues
 * Provides history tracking and safe navigation patterns
 */

let navigationHistory: string[] = [];

// Store navigation history for back button
export const updateNavigationHistory = (path: string) => {
  if (navigationHistory[navigationHistory.length - 1] !== path) {
    navigationHistory.push(path);
  }
};

// Get safe back path (skip intermediate paths)
export const getSafeBackPath = (): string => {
  if (navigationHistory.length <= 1) return '/';
  navigationHistory.pop(); // Remove current
  const prev = navigationHistory[navigationHistory.length - 1];
  return prev || '/';
};

// Reset history (on logout, etc)
export const resetNavigationHistory = () => {
  navigationHistory = ['/'];
};

// Protected navigate with history tracking
export const safeNavigate = (
  navigate: (path: string, options?: { replace?: boolean }) => void,
  path: string,
  replace = false
) => {
  if (!replace) {
    updateNavigationHistory(path);
  }
  navigate(path, { replace });
};
