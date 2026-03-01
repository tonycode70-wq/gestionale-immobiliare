import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = [
  "https://moonlit-raindrop-9d3061.netlify.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

function buildCorsHeaders(origin?: string) {
  const allowOrigin =
    origin && allowedOrigins.includes(origin) ? origin : "*";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
  };
}
 
 interface FiscalDeadline {
   type: 'IMU_ACCONTO' | 'IMU_SALDO' | 'CEDOLARE_ACCONTO_1' | 'CEDOLARE_ACCONTO_2' | 'CEDOLARE_SALDO';
   date: string;
   description: string;
   daysUntil: number;
 }
 
const handler = async (req: Request): Promise<Response> => {
  const cors = buildCorsHeaders(req.headers.get("origin") || undefined);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }
 
   try {
     const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
     const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
     const supabase = createClient(supabaseUrl, supabaseKey);
 
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
        headers: { ...cors, "Content-Type": "application/json" },
       });
     }
 
     const currentYear = new Date().getFullYear();
     const today = new Date();
     
     // Define fiscal deadlines for the year
     const deadlines: FiscalDeadline[] = [
       {
         type: 'IMU_ACCONTO',
         date: `${currentYear}-06-16`,
         description: `Scadenza IMU Acconto ${currentYear}`,
         daysUntil: 0,
       },
       {
         type: 'IMU_SALDO',
         date: `${currentYear}-12-16`,
         description: `Scadenza IMU Saldo ${currentYear}`,
         daysUntil: 0,
       },
       {
         type: 'CEDOLARE_ACCONTO_1',
         date: `${currentYear}-06-30`,
         description: `Cedolare Secca 1° Acconto ${currentYear}`,
         daysUntil: 0,
       },
       {
         type: 'CEDOLARE_ACCONTO_2',
         date: `${currentYear}-11-30`,
         description: `Cedolare Secca 2° Acconto ${currentYear}`,
         daysUntil: 0,
       },
       {
         type: 'CEDOLARE_SALDO',
         date: `${currentYear + 1}-06-30`,
         description: `Cedolare Secca Saldo ${currentYear}`,
         daysUntil: 0,
       },
     ];
 
     // Calculate days until each deadline
     const upcomingDeadlines = deadlines
       .map(d => {
         const deadlineDate = new Date(d.date);
         const diffTime = deadlineDate.getTime() - today.getTime();
         const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
         return { ...d, daysUntil: diffDays };
       })
       .filter(d => d.daysUntil >= 0 && d.daysUntil <= 30); // Only deadlines within 30 days
 
     // Check for existing notifications to avoid duplicates
     const notificationsToCreate = [];
 
     for (const deadline of upcomingDeadlines) {
       // Check reminder thresholds: 30, 14, 7, 3, 1 days before
       const reminderDays = [30, 14, 7, 3, 1];
       
       for (const reminderDay of reminderDays) {
         if (deadline.daysUntil === reminderDay) {
           // Check if notification already exists
           const { data: existing } = await supabase
             .from('notifications')
             .select('id')
             .eq('user_id', user.id)
             .eq('riferimento_tipo', 'FISCAL_DEADLINE')
             .eq('riferimento_id', `${deadline.type}_${deadline.date}_${reminderDay}`)
             .single();
 
           if (!existing) {
             notificationsToCreate.push({
               user_id: user.id,
               tipo: deadline.daysUntil <= 3 ? 'WARNING' : 'REMINDER',
               titolo: deadline.daysUntil === 1 
                 ? `⚠️ DOMANI: ${deadline.description}`
                 : `📅 Tra ${deadline.daysUntil} giorni: ${deadline.description}`,
               messaggio: deadline.daysUntil <= 3
                 ? `La scadenza fiscale è imminente. Assicurati di effettuare il pagamento entro il ${new Date(deadline.date).toLocaleDateString('it-IT')}.`
                 : `Ricorda di preparare il pagamento per la scadenza del ${new Date(deadline.date).toLocaleDateString('it-IT')}.`,
               riferimento_tipo: 'FISCAL_DEADLINE',
               riferimento_id: `${deadline.type}_${deadline.date}_${reminderDay}`,
               letta: false,
             });
           }
         }
       }
     }
 
     // Insert new notifications
     if (notificationsToCreate.length > 0) {
       const { error: insertError } = await supabase
         .from('notifications')
         .insert(notificationsToCreate);
 
       if (insertError) {
         console.error('Error creating notifications:', insertError);
       }
     }
 
     return new Response(
       JSON.stringify({
         success: true,
         upcomingDeadlines,
         notificationsCreated: notificationsToCreate.length,
       }),
       {
         status: 200,
        headers: { ...cors, "Content-Type": "application/json" },
       }
     );
  } catch (error: unknown) {
     console.error("Error in check-fiscal-deadlines:", error);
    const message =
      error && typeof error === "object" && "message" in error
        ? String((error as { message: string }).message)
        : "Unknown error";
     return new Response(
      JSON.stringify({ error: message }),
       {
         status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
       }
     );
   }
 };
 
 serve(handler);
