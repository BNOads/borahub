import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const serviceAccountKey = JSON.parse(Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY") || "{}");
    const token = await getGoogleAccessToken(serviceAccountKey);

    const { action, event, event_id, calendar_id } = await req.json();

    // Get calendar_id from params or from content_settings
    let calendarId = calendar_id;
    if (!calendarId) {
      const { data: setting } = await supabase
        .from("content_settings")
        .select("value")
        .eq("key", "google_calendar_id")
        .single();
      calendarId = setting?.value;
    }

    if (!calendarId) {
      return new Response(JSON.stringify({ error: "google_calendar_id não configurado" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "push") {
      const result = await pushEvent(supabase, token, calendarId, event);
      return jsonResponse(result);
    } else if (action === "update") {
      const result = await updateEvent(supabase, token, calendarId, event_id, event);
      return jsonResponse(result);
    } else if (action === "delete") {
      const result = await deleteEvent(supabase, token, calendarId, event_id);
      return jsonResponse(result);
    } else if (action === "pull") {
      const result = await pullEvents(supabase, token, calendarId);
      return jsonResponse(result);
    } else {
      return new Response(JSON.stringify({ error: "action inválida" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error: any) {
    console.error("sync-google-calendar error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function jsonResponse(data: any) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ---- PUSH: Create event in Google Calendar ----
async function pushEvent(supabase: any, token: string, calendarId: string, event: any) {
  // Resolve participant names to emails
  const attendees = await resolveAttendees(supabase, event.participants || []);

  const startDateTime = `${event.event_date}T${event.event_time || "00:00"}:00`;
  const durationMs = (event.duration_minutes || 60) * 60 * 1000;
  const endDateTime = new Date(new Date(startDateTime).getTime() + durationMs).toISOString();

  const googleEvent = {
    summary: event.title,
    description: event.description || "",
    location: event.location || "",
    start: { dateTime: startDateTime, timeZone: "America/Sao_Paulo" },
    end: { dateTime: endDateTime, timeZone: "America/Sao_Paulo" },
    attendees,
  };

  if (event.meeting_link) {
    (googleEvent as any).conferenceData = { notes: event.meeting_link };
  }

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=all`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(googleEvent),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Google Calendar create failed (${res.status}): ${errBody}`);
  }

  const created = await res.json();

  // Save google_calendar_id back to event
  if (event.id) {
    await supabase
      .from("events")
      .update({ google_calendar_id: created.id, google_calendar_source: calendarId })
      .eq("id", event.id);
  }

  return { success: true, google_calendar_id: created.id };
}

// ---- UPDATE: Update event in Google Calendar ----
async function updateEvent(supabase: any, token: string, calendarId: string, eventId: string, event: any) {
  // Get google_calendar_id from DB
  const { data: dbEvent } = await supabase
    .from("events")
    .select("google_calendar_id")
    .eq("id", eventId)
    .single();

  if (!dbEvent?.google_calendar_id) {
    // If no google_calendar_id, push instead
    return pushEvent(supabase, token, calendarId, { ...event, id: eventId });
  }

  const attendees = await resolveAttendees(supabase, event.participants || []);

  const startDateTime = `${event.event_date}T${event.event_time || "00:00"}:00`;
  const durationMs = (event.duration_minutes || 60) * 60 * 1000;
  const endDateTime = new Date(new Date(startDateTime).getTime() + durationMs).toISOString();

  const googleEvent = {
    summary: event.title,
    description: event.description || "",
    location: event.location || "",
    start: { dateTime: startDateTime, timeZone: "America/Sao_Paulo" },
    end: { dateTime: endDateTime, timeZone: "America/Sao_Paulo" },
    attendees,
  };

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(dbEvent.google_calendar_id)}?sendUpdates=all`;
  const res = await fetch(url, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(googleEvent),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Google Calendar update failed (${res.status}): ${errBody}`);
  }

  return { success: true };
}

// ---- DELETE: Remove event from Google Calendar ----
async function deleteEvent(supabase: any, token: string, calendarId: string, eventId: string) {
  const { data: dbEvent } = await supabase
    .from("events")
    .select("google_calendar_id")
    .eq("id", eventId)
    .single();

  if (!dbEvent?.google_calendar_id) {
    return { success: true, message: "Evento não tinha vínculo com Google Calendar" };
  }

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(dbEvent.google_calendar_id)}?sendUpdates=all`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  // 404 or 410 means already deleted, that's fine
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    const errBody = await res.text();
    throw new Error(`Google Calendar delete failed (${res.status}): ${errBody}`);
  }

  return { success: true };
}

// ---- PULL: Fetch events from Google Calendar and insert missing ones ----
async function pullEvents(supabase: any, token: string, calendarId: string) {
  const now = new Date();
  const timeMin = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days ago
  const timeMax = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(); // 90 days ahead

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=250`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Google Calendar pull failed (${res.status}): ${errBody}`);
  }

  const data = await res.json();
  const items = data.items || [];

  // Get existing google_calendar_ids to avoid duplicates
  const { data: existingEvents } = await supabase
    .from("events")
    .select("google_calendar_id")
    .not("google_calendar_id", "is", null);

  const existingIds = new Set((existingEvents || []).map((e: any) => e.google_calendar_id));

  let created = 0;
  let skipped = 0;
  let updated = 0;

  for (const item of items) {
    if (item.status === "cancelled") continue;

    if (existingIds.has(item.id)) {
      // Update existing event
      const startDt = item.start?.dateTime || item.start?.date;
      const eventDate = startDt ? startDt.substring(0, 10) : null;
      const eventTime = startDt && startDt.includes("T") ? startDt.substring(11, 16) : "00:00";

      let durationMinutes = 60;
      if (item.end?.dateTime && item.start?.dateTime) {
        durationMinutes = Math.round((new Date(item.end.dateTime).getTime() - new Date(item.start.dateTime).getTime()) / 60000);
      }

      const attendeeEmails = (item.attendees || []).map((a: any) => a.email);
      const participantNames = await resolveNamesFromEmails(supabase, attendeeEmails);

      await supabase
        .from("events")
        .update({
          title: item.summary || "Sem título",
          description: item.description || null,
          event_date: eventDate,
          event_time: eventTime,
          duration_minutes: durationMinutes,
          location: item.location || null,
          meeting_link: item.hangoutLink || null,
          participants: participantNames.length > 0 ? participantNames : null,
        })
        .eq("google_calendar_id", item.id);

      updated++;
      continue;
    }

    // Parse start date/time
    const startDt = item.start?.dateTime || item.start?.date;
    if (!startDt) { skipped++; continue; }

    const eventDate = startDt.substring(0, 10);
    const eventTime = startDt.includes("T") ? startDt.substring(11, 16) : "00:00";

    let durationMinutes = 60;
    if (item.end?.dateTime && item.start?.dateTime) {
      durationMinutes = Math.round((new Date(item.end.dateTime).getTime() - new Date(item.start.dateTime).getTime()) / 60000);
    }

    // Resolve attendee emails to profile names
    const attendeeEmails = (item.attendees || []).map((a: any) => a.email);
    const participantNames = await resolveNamesFromEmails(supabase, attendeeEmails);

    const { error } = await supabase.from("events").insert({
      title: item.summary || "Sem título",
      description: item.description || null,
      event_date: eventDate,
      event_time: eventTime,
      duration_minutes: durationMinutes,
      location: item.location || null,
      meeting_link: item.hangoutLink || null,
      participants: participantNames.length > 0 ? participantNames : null,
      google_calendar_id: item.id,
      google_calendar_source: calendarId,
      event_type: "reuniao",
    });

    if (error) {
      console.error("Error inserting pulled event:", error);
      skipped++;
    } else {
      created++;
    }
  }

  return { success: true, created, updated, skipped, total: items.length };
}

// ---- Helpers ----
async function resolveAttendees(supabase: any, participantNames: string[]): Promise<{ email: string }[]> {
  if (!participantNames || participantNames.length === 0) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("full_name, email")
    .in("full_name", participantNames);

  return (profiles || [])
    .filter((p: any) => p.email)
    .map((p: any) => ({ email: p.email }));
}

async function resolveNamesFromEmails(supabase: any, emails: string[]): Promise<string[]> {
  if (!emails || emails.length === 0) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("full_name, email")
    .in("email", emails);

  return (profiles || [])
    .filter((p: any) => p.full_name)
    .map((p: any) => p.full_name);
}

// ---- Google Auth ----
async function getGoogleAccessToken(serviceAccount: any): Promise<string> {
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const claim = btoa(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/calendar",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  }));

  const signInput = `${header}.${claim}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(serviceAccount.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(signInput));
  const jwt = `${signInput}.${arrayBufferToBase64Url(signature)}`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    throw new Error(`Failed to get Google access token: ${JSON.stringify(tokenData)}`);
  }
  return tokenData.access_token;
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s/g, "");
  const binary = atob(b64);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buffer[i] = binary.charCodeAt(i);
  return buffer.buffer;
}

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach(b => binary += String.fromCharCode(b));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
