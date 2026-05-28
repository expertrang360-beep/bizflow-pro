import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface BackButtonProps {
  fallback?: string;
  className?: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg';
}

/**
 * Intelligent back button that handles navigation history properly
 * Falls back to a default path if history unavailable
 */
export default function BackButton({
  fallback = '/',
  className = '',
  variant = 'ghost',
  size = 'default',
}: BackButtonProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    // Try to use browser back first
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      // Fallback to specified path
      navigate(fallback, { replace: true });
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleBack}
      className={className}
      title="Go back"
    >
      <ArrowLeft className="w-4 h-4" />
    </Button>
  );
}
