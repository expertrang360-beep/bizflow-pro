// Redirects to App root — actual content is in DashboardPage
import { Navigate } from "react-router-dom";
export default function Index() {
  return <Navigate to="/" replace />;
}
