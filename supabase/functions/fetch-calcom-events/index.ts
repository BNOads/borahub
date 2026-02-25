import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const CAL_COM_API_KEY = Deno.env.get('CAL_COM_API_KEY');
    if (!CAL_COM_API_KEY) {
      return new Response(JSON.stringify({ error: 'CAL_COM_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const dateFrom = url.searchParams.get('date_from');
    const dateTo = url.searchParams.get('date_to');
    const status = url.searchParams.get('status') || 'upcoming';

    let apiUrl = `https://api.cal.com/v2/bookings?status=${status}`;
    if (dateFrom) apiUrl += `&afterStart=${dateFrom}T00:00:00.000Z`;
    if (dateTo) apiUrl += `&beforeEnd=${dateTo}T23:59:59.999Z`;

    console.log('Fetching Cal.com bookings:', apiUrl);

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${CAL_COM_API_KEY}`,
        'cal-api-version': '2024-08-13',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cal.com API error:', response.status, errorText);
      return new Response(JSON.stringify({ error: 'Cal.com API error', details: errorText }), {
        status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await response.json();
    const bookings = result.data || [];

    const events = bookings.map((booking: any) => {
      const start = new Date(booking.start);
      const end = new Date(booking.end);
      const durationMs = end.getTime() - start.getTime();
      const durationMinutes = Math.round(durationMs / 60000);

      const eventDate = start.toISOString().split('T')[0];
      const eventTime = start.toISOString().split('T')[1].substring(0, 8);

      const attendees = (booking.attendees || []).map((a: any) => a.name || a.email);
      const attendeeEmails = (booking.attendees || [])
        .map((a: any) => a.email?.trim().toLowerCase())
        .filter(Boolean);
      const attendeePhones = (booking.attendees || [])
        .map((a: any) => a.phone || a.phoneNumber || null)
        .filter(Boolean);

      return {
        id: `calcom-${booking.id}`,
        title: booking.title || booking.eventType?.title || 'Cal.com Meeting',
        event_date: eventDate,
        event_time: eventTime,
        duration_minutes: durationMinutes,
        meeting_link: booking.meetingUrl || booking.metadata?.videoCallUrl || null,
        location: booking.location || null,
        event_type: 'reuniao',
        color: '#f97316', // orange
        description: booking.description || null,
        participants: attendees,
        attendee_emails: attendeeEmails,
        attendee_phones: attendeePhones,
        booking_status: booking.status || status,
        source: 'calcom',
        created_at: booking.createdAt || null,
        updated_at: booking.updatedAt || null,
        created_by: null,
        is_recurring_instance: null,
        parent_event_id: null,
        recurrence: null,
        recurrence_end_date: null,
      };
    });

    return new Response(JSON.stringify({ data: events }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in fetch-calcom-events:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
