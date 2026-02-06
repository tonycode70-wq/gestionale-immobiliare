import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NotificationRequest {
  type: "email" | "sms";
  to: string;
  subject?: string;
  body: string;
  templateId?: string;
  templateData?: Record<string, string>;
  leaseId?: string;
  tenantId?: string;
  reminderId?: string;
}

// Replace placeholders in template
function replacePlaceholders(text: string, data: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  }
  return result;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioFromNumber = Deno.env.get("TWILIO_FROM_NUMBER");

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const request: NotificationRequest = await req.json();
    const { type, to, subject, body, templateData, leaseId, tenantId, reminderId } = request;

    // Process template placeholders if provided
    const processedBody = templateData ? replacePlaceholders(body, templateData) : body;
    const processedSubject = subject && templateData ? replacePlaceholders(subject, templateData) : subject;

    let esito: "INVIATO" | "ERRORE" = "ERRORE";
    let dettaglio_esito = "";

    if (type === "email") {
      if (!resendApiKey) {
        dettaglio_esito = "RESEND_API_KEY non configurata. Configura la chiave API per inviare email.";
      } else {
        try {
          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: "PropertyManager <noreply@resend.dev>",
              to: [to],
              subject: processedSubject || "Notifica PropertyManager",
              html: processedBody,
            }),
          });

          if (response.ok) {
            esito = "INVIATO";
            dettaglio_esito = "Email inviata con successo";
          } else {
            const error = await response.text();
            dettaglio_esito = `Errore invio email: ${error}`;
          }
        } catch (e: any) {
          dettaglio_esito = `Errore: ${e.message}`;
        }
      }
    } else if (type === "sms") {
      if (!twilioAccountSid || !twilioAuthToken || !twilioFromNumber) {
        dettaglio_esito = "Credenziali Twilio non configurate. Configura TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN e TWILIO_FROM_NUMBER.";
      } else {
        try {
          const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
          const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

          const response = await fetch(twilioUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Authorization: `Basic ${auth}`,
            },
            body: new URLSearchParams({
              To: to,
              From: twilioFromNumber,
              Body: processedBody,
            }),
          });

          if (response.ok) {
            esito = "INVIATO";
            dettaglio_esito = "SMS inviato con successo";
          } else {
            const error = await response.text();
            dettaglio_esito = `Errore invio SMS: ${error}`;
          }
        } catch (e: any) {
          dettaglio_esito = `Errore: ${e.message}`;
        }
      }
    }

    // Log the message in database
    const { error: logError } = await supabase.from("messages_sent").insert({
      user_id: user.id,
      canale: type === "email" ? "EMAIL" : "SMS",
      destinatario: to,
      oggetto: processedSubject || null,
      corpo_inviato: processedBody,
      esito,
      dettaglio_esito,
      lease_id: leaseId || null,
      tenant_id: tenantId || null,
      reminder_id: reminderId || null,
    });

    if (logError) {
      console.error("Error logging message:", logError);
    }

    return new Response(
      JSON.stringify({
        success: esito === "INVIATO",
        message: dettaglio_esito,
      }),
      {
        status: esito === "INVIATO" ? 200 : 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
