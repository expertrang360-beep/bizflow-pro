/**
 * Navigation utilities for proper internal page linking
 */

/**
 * Safe back navigation with fallback to home
 * @param navigate - React Router navigate function
 * @param fallbackPath - Path to navigate to if back button can't work (default: "/")
 */
export function goBackOrHome(navigate: any, fallbackPath = "/") {
  // Check if there's browser history to go back to
  if (window.history.length > 1) {
    navigate(-1);
  } else {
    // Fallback to home if no history
    navigate(fallbackPath);
  }
}

/**
 * Navigate to a page and ensure proper redirect
 * @param navigate - React Router navigate function
 * @param path - Path to navigate to
 * @param options - Additional navigation options (replace, state, etc.)
 */
export function navigateTo(navigate: any, path: string, options?: any) {
  navigate(path, options || {});
}

/**
 * Determine if a route exists (add more routes as needed)
 */
const VALID_ROUTES = [
  "/",
  "/sales",
  "/sales/new",
  "/inventory",
  "/inventory/new",
  "/reports",
  "/more",
  "/expenses",
  "/expenses/new",
  "/customers",
  "/suppliers",
  "/purchases",
  "/purchases/new",
  "/assets",
  "/assets/new",
  "/tax",
  "/profit-loss",
  "/team",
  "/settings",
  "/raw-materials",
  "/bom",
  "/production-orders",
  "/production-costs",
  "/daily-production",
  "/advisor",
  "/payroll",
  "/subscription",
  "/admin/licenses",
];

export function isValidRoute(path: string): boolean {
  // Check exact matches and dynamic routes
  return (
    VALID_ROUTES.includes(path) ||
    path.startsWith("/sales/") ||
    path.startsWith("/inventory/") ||
    path.startsWith("/customers/") ||
    path.startsWith("/production-costs/") ||
    path.startsWith("/pay/")
  );
}

/**
 * Safe navigation with validation
 */
export function navigateToValid(navigate: any, path: string, fallback = "/") {
  if (isValidRoute(path)) {
    navigate(path);
  } else {
    console.warn(`Invalid route: ${path}, redirecting to ${fallback}`);
    navigate(fallback);
  }
}
