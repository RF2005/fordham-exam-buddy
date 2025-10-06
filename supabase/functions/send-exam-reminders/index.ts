import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Exam {
  id: string;
  user_id: string;
  course: string;
  title: string;
  exam_date: string;
  start_time: string | null;
  end_time: string | null;
}

interface NotificationPreference {
  user_id: string;
  reminder_days: number[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify cron secret for security
    const authHeader = req.headers.get('authorization');
    const cronSecret = Deno.env.get('CRON_SECRET');
    
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      console.error('Unauthorized request to send-exam-reminders');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Starting exam reminder check...");

    // Create Supabase client with service role to bypass RLS
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all notification preferences
    const { data: preferences, error: prefsError } = await supabase
      .from("notification_preferences")
      .select("*");

    if (prefsError) {
      console.error("Error fetching notification preferences:", prefsError);
      throw prefsError;
    }

    if (!preferences || preferences.length === 0) {
      console.log("No notification preferences found");
      return new Response(
        JSON.stringify({ message: "No notification preferences found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    console.log(`Found ${preferences.length} users with notification preferences`);

    let emailsSent = 0;

    // Process each user's preferences
    for (const pref of preferences as NotificationPreference[]) {
      if (!pref.reminder_days || pref.reminder_days.length === 0) {
        console.log(`Skipping user ${pref.user_id} - incomplete preferences`);
        continue;
      }

      // Get user email from auth.users
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(pref.user_id);
      
      if (userError || !userData?.user?.email) {
        console.log(`Skipping user ${pref.user_id} - could not retrieve email`);
        continue;
      }

      const userEmail = userData.user.email;

      // Get all exams for this user
      const { data: exams, error: examsError } = await supabase
        .from("exams")
        .select("*")
        .eq("user_id", pref.user_id)
        .gte("exam_date", today.toISOString().split("T")[0]);

      if (examsError) {
        console.error(`Error fetching exams for user ${pref.user_id}:`, examsError);
        continue;
      }

      if (!exams || exams.length === 0) {
        console.log(`No upcoming exams for user ${pref.user_id}`);
        continue;
      }

      // Check each exam
      for (const exam of exams as Exam[]) {
        const examDate = new Date(exam.exam_date);
        examDate.setHours(0, 0, 0, 0);
        
        const daysUntilExam = Math.floor((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // Check if we should send a reminder for this exam
        if (pref.reminder_days.includes(daysUntilExam)) {
          console.log(`Sending reminder for exam ${exam.id} to ${userEmail} (${daysUntilExam} days before)`);

          const timeInfo = exam.start_time && exam.end_time
            ? `from ${exam.start_time} to ${exam.end_time}`
            : exam.start_time
            ? `at ${exam.start_time}`
            : "";

          // Sanitize exam data for HTML output
          const sanitizeHtml = (text: string) => {
            return text
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
          };

          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #7c2139;">Exam Reminder</h2>
              <p>Hello,</p>
              <p>This is a reminder that you have an upcoming exam in <strong>${daysUntilExam}</strong> day${daysUntilExam !== 1 ? 's' : ''}:</p>
              <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Course:</strong> ${sanitizeHtml(exam.course)}</p>
                <p style="margin: 5px 0;"><strong>Exam:</strong> ${sanitizeHtml(exam.title)}</p>
                <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date(exam.exam_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                ${timeInfo ? `<p style="margin: 5px 0;"><strong>Time:</strong> ${timeInfo}</p>` : ''}
              </div>
              <p>Good luck with your preparation!</p>
              <p style="color: #666; font-size: 12px; margin-top: 30px;">
                This is an automated reminder from your Fordham Exam Scheduler.
              </p>
            </div>
          `;

          try {
            const emailResponse = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${RESEND_API_KEY}`,
              },
              body: JSON.stringify({
                from: "Fordham Exam Scheduler <onboarding@resend.dev>",
                to: [userEmail],
                subject: `Exam Reminder: ${exam.course} in ${daysUntilExam} day${daysUntilExam !== 1 ? 's' : ''}`,
                html: emailHtml,
              }),
            });

            if (!emailResponse.ok) {
              const errorData = await emailResponse.json();
              throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
            }

            emailsSent++;
            console.log(`Successfully sent reminder email for exam ${exam.id}`);
          } catch (emailError) {
            console.error(`Failed to send email for exam ${exam.id}:`, emailError);
          }
        }
      }
    }

    console.log(`Completed reminder check. Sent ${emailsSent} emails.`);

    return new Response(
      JSON.stringify({ 
        message: "Reminder check completed",
        emailsSent 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-exam-reminders function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
