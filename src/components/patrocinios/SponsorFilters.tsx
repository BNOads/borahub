import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { SPONSOR_STAGES, BRAZILIAN_STATES, SponsorEvent } from '@/hooks/useSponsors';
import { Search, X } from 'lucide-react';

interface Filters {
  search: string;
  segment: string;
  state: string;
  stage: string;
  followup: string;
}

interface SponsorFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  segments: string[];
  events: SponsorEvent[];
}

export function SponsorFilters({ filters, onFiltersChange, segments, events }: SponsorFiltersProps) {
  const hasActiveFilters = filters.search || filters.segment || filters.state || filters.stage || filters.followup;

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      segment: '',
      state: '',
      stage: '',
      followup: '',
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-[300px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou contato..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="pl-9"
        />
      </div>

      {/* Segment filter */}
      <Select
        value={filters.segment || 'all'}
        onValueChange={(value) => onFiltersChange({ ...filters, segment: value === 'all' ? '' : value })}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Segmento" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos segmentos</SelectItem>
          {segments.map(segment => (
            <SelectItem key={segment} value={segment}>{segment}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* State filter */}
      <Select
        value={filters.state || 'all'}
        onValueChange={(value) => onFiltersChange({ ...filters, state: value === 'all' ? '' : value })}
      >
        <SelectTrigger className="w-[100px]">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {BRAZILIAN_STATES.map(state => (
            <SelectItem key={state} value={state}>{state}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Stage filter */}
      <Select
        value={filters.stage || 'all'}
        onValueChange={(value) => onFiltersChange({ ...filters, stage: value === 'all' ? '' : value })}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Coluna" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas colunas</SelectItem>
          {SPONSOR_STAGES.map(stage => (
            <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Follow-up filter */}
      <Select
        value={filters.followup || 'all'}
        onValueChange={(value) => onFiltersChange({ ...filters, followup: value === 'all' ? '' : value })}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Follow-up" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="today">Hoje</SelectItem>
          <SelectItem value="overdue">Vencidos</SelectItem>
          <SelectItem value="next7days">Próximos 7 dias</SelectItem>
          <SelectItem value="none">Sem follow-up</SelectItem>
        </SelectContent>
      </Select>

      {/* Clear filters */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="h-4 w-4 mr-1" />
          Limpar
        </Button>
      )}
    </div>
  );
}
