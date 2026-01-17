import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sponsor, SPONSOR_STAGES } from '@/hooks/useSponsors';
import { MapPin, Phone, Mail, AlertCircle, Calendar, User } from 'lucide-react';
import { format, isAfter, isBefore, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface SponsorCardProps {
  sponsor: Sponsor;
  onClick: () => void;
  daysWithoutUpdateWarning?: number;
}

export function SponsorCard({ sponsor, onClick, daysWithoutUpdateWarning = 14 }: SponsorCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sponsor.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isFollowupOverdue = sponsor.next_followup_date && 
    isBefore(new Date(sponsor.next_followup_date), new Date());

  const daysSinceUpdate = differenceInDays(new Date(), new Date(sponsor.updated_at));
  const needsAttention = daysSinceUpdate >= daysWithoutUpdateWarning;

  const stage = SPONSOR_STAGES.find(s => s.id === sponsor.stage);

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        'p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow',
        isDragging && 'opacity-50 shadow-lg',
        isFollowupOverdue && 'border-l-4 border-l-red-500',
        needsAttention && !isFollowupOverdue && 'border-l-4 border-l-yellow-500'
      )}
    >
      <div className="space-y-2">
        {/* Header with name and alerts */}
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium text-sm leading-tight line-clamp-2">
            {sponsor.name}
          </h4>
          {(isFollowupOverdue || needsAttention) && (
            <AlertCircle 
              className={cn(
                'h-4 w-4 flex-shrink-0',
                isFollowupOverdue ? 'text-red-500' : 'text-yellow-500'
              )} 
            />
          )}
        </div>

        {/* Segment badge */}
        <Badge variant="secondary" className="text-xs">
          {sponsor.segment}
        </Badge>

        {/* Location */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span>{sponsor.city}/{sponsor.state}</span>
        </div>

        {/* Contact info */}
        {(sponsor.contact_name || sponsor.contact_email || sponsor.contact_phone) && (
          <div className="space-y-1">
            {sponsor.contact_name && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                <span className="truncate">{sponsor.contact_name}</span>
              </div>
            )}
            {sponsor.contact_email && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Mail className="h-3 w-3" />
                <span className="truncate">{sponsor.contact_email}</span>
              </div>
            )}
            {sponsor.contact_phone && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Phone className="h-3 w-3" />
                <span>{sponsor.contact_phone}</span>
              </div>
            )}
          </div>
        )}

        {/* Next follow-up */}
        {sponsor.next_followup_date && (
          <div className={cn(
            'flex items-center gap-1 text-xs',
            isFollowupOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground'
          )}>
            <Calendar className="h-3 w-3" />
            <span>
              Follow-up: {format(new Date(sponsor.next_followup_date), 'dd/MM', { locale: ptBR })}
            </span>
          </div>
        )}

        {/* Event badges */}
        {sponsor.events && sponsor.events.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {sponsor.events.slice(0, 2).map(event => (
              <Badge 
                key={event.id} 
                variant="outline" 
                className="text-[10px] px-1.5 py-0"
                style={{ borderColor: event.color, color: event.color }}
              >
                {event.name}
              </Badge>
            ))}
            {sponsor.events.length > 2 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                +{sponsor.events.length - 2}
              </Badge>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
