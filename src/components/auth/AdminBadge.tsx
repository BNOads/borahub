import { Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AdminBadgeProps {
    className?: string;
    showIcon?: boolean;
}

export const AdminBadge: React.FC<AdminBadgeProps> = ({
    className,
    showIcon = true
}) => {
    return (
        <Badge
            className={cn(
                "bg-amber-500 hover:bg-amber-600 text-white",
                className
            )}
        >
            {showIcon && <Shield className="w-3 h-3 mr-1" />}
            Admin
        </Badge>
    );
};
