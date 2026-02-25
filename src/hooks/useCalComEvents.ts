import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Event } from "@/hooks/useEvents";

export type CalComEvent = Event & {
  source: 'calcom';
  attendee_emails?: string[];
  attendee_phones?: string[];
  booking_status?: string;
};

export function useCalComEvents() {
  const { authReady, session } = useAuth();

  return useQuery({
    queryKey: ["calcom-events"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke("fetch-calcom-events");

        if (error) {
          console.error("Error fetching Cal.com events:", error);
          return [];
        }

        return (data?.data || []) as CalComEvent[];
      } catch (error) {
        console.error("Exception in useCalComEvents:", error);
        return [];
      }
    },
    retry: 1,
    staleTime: 5 * 60 * 1000,
    enabled: authReady && !!session,
  });
}

export function useCalComPastEvents() {
  const { authReady, session } = useAuth();

  return useQuery({
    queryKey: ["calcom-events-past"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke("fetch-calcom-events", {
          body: null,
          headers: {},
        });

        // Fetch past bookings via query params
        const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-calcom-events?status=past`);
        const resp = await fetch(url.toString(), {
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        });

        if (!resp.ok) {
          console.error("Error fetching past Cal.com events:", resp.status);
          return [];
        }

        const result = await resp.json();
        return (result?.data || []) as CalComEvent[];
      } catch (error) {
        console.error("Exception in useCalComPastEvents:", error);
        return [];
      }
    },
    retry: 1,
    staleTime: 5 * 60 * 1000,
    enabled: authReady && !!session,
  });
}

function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 12 && digits.startsWith("55")) return digits.slice(2);
  return digits;
}

function normalizeEmail(email: string | null | undefined): string {
  if (!email) return "";
  return email.trim().toLowerCase();
}

export interface CalComLeadMatch {
  leadId: string;
  hasUpcoming: boolean;
  hasPast: boolean;
  upcomingDates: string[];
  pastDates: string[];
}

export function matchLeadsWithCalCom(
  leads: { id: string; email: string | null; phone: string | null; extra_data: Record<string, unknown> }[],
  upcomingEvents: CalComEvent[],
  pastEvents: CalComEvent[],
): Map<string, CalComLeadMatch> {
  const result = new Map<string, CalComLeadMatch>();

  // Build email/phone index from events
  type EventRef = { date: string; type: 'upcoming' | 'past' };
  const emailIndex = new Map<string, EventRef[]>();
  const phoneIndex = new Map<string, EventRef[]>();

  function indexEvents(events: CalComEvent[], type: 'upcoming' | 'past') {
    for (const ev of events) {
      const ref: EventRef = { date: ev.event_date, type };
      for (const email of (ev.attendee_emails || [])) {
        const n = normalizeEmail(email);
        if (n) {
          if (!emailIndex.has(n)) emailIndex.set(n, []);
          emailIndex.get(n)!.push(ref);
        }
      }
      for (const phone of (ev.attendee_phones || [])) {
        const n = normalizePhone(phone);
        if (n) {
          if (!phoneIndex.has(n)) phoneIndex.set(n, []);
          phoneIndex.get(n)!.push(ref);
        }
      }
    }
  }

  indexEvents(upcomingEvents, 'upcoming');
  indexEvents(pastEvents, 'past');

  for (const lead of leads) {
    const extra = (lead.extra_data || {}) as Record<string, string>;
    const leadEmails = new Set<string>();
    const leadPhones = new Set<string>();

    [lead.email, extra["e-mail"], extra["email"], extra["Email"], extra["E-mail"]].forEach(e => {
      const n = normalizeEmail(e);
      if (n) leadEmails.add(n);
    });

    [lead.phone, extra["whatsapp"], extra["Whatsapp"], extra["telefone"], extra["Telefone"], extra["phone"]].forEach(p => {
      const n = normalizePhone(p);
      if (n) leadPhones.add(n);
    });

    const matched: EventRef[] = [];
    for (const email of leadEmails) {
      const refs = emailIndex.get(email);
      if (refs) matched.push(...refs);
    }
    for (const phone of leadPhones) {
      const refs = phoneIndex.get(phone);
      if (refs) matched.push(...refs);
    }

    if (matched.length > 0) {
      const upcomingDates = [...new Set(matched.filter(m => m.type === 'upcoming').map(m => m.date))].sort();
      const pastDates = [...new Set(matched.filter(m => m.type === 'past').map(m => m.date))].sort();

      result.set(lead.id, {
        leadId: lead.id,
        hasUpcoming: upcomingDates.length > 0,
        hasPast: pastDates.length > 0,
        upcomingDates,
        pastDates,
      });
    }
  }

  return result;
}
