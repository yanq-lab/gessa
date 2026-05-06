import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

// Simple HTML email template
function createEmailTemplate(subject: string, content: string, actionUrl?: string, actionText?: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="margin:0;padding:0;background-color:#fafaf9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafaf9;">
        <tr>
          <td align="center" style="padding:40px 20px;">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;border:1px solid #e7e5e4;">
              <tr>
                <td style="padding:40px 30px;">
                  <h1 style="margin:0 0 20px;font-family:serif;font-size:24px;color:#1c1917;">Gessa</h1>
                  <h2 style="margin:0 0 20px;font-size:18px;color:#44403c;">${subject}</h2>
                  <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#57534e;">${content}</p>
                  ${actionUrl && actionText ? `
                  <p style="margin:30px 0;text-align:center;">
                    <a href="${actionUrl}" style="display:inline-block;padding:12px 24px;background-color:#1c1917;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:500;">${actionText}</a>
                  </p>
                  ` : ""}
                  <hr style="border:none;border-top:1px solid #e7e5e4;margin:30px 0;">
                  <p style="margin:0;font-size:12px;color:#a8a29e;text-align:center;">
                    You received this email because you have an account on Gessa.<br>
                    <a href="https://gessa.art" style="color:#78716c;">gessa.art</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { type, userId, artworkId, artworkTitle } = await req.json();

    // Get user email
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError || !user.user?.email) {
      return new Response(JSON.stringify({ ok: false, error: "User not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const email = user.user.email;
    let subject = "";
    let content = "";
    let actionUrl = "";
    let actionText = "";

    switch (type) {
      case "restore_complete":
        subject = "Your artwork has been restored";
        content = `Great news! "${artworkTitle || "Your artwork"}" has been successfully restored. You can now review the result and publish it to your gallery.`;
        actionUrl = `https://gessa.art/artwork/review?id=${artworkId}`;
        actionText = "Review artwork";
        break;

      case "quota_warning":
        subject = "Transformation quota warning";
        content = "You have used 80% of your monthly transformation quota. Consider upgrading your plan to continue restoring artworks without interruption.";
        actionUrl = "https://gessa.art/pricing";
        actionText = "View pricing";
        break;

      case "quota_exceeded":
        subject = "Transformation quota exceeded";
        content = "You have reached your monthly transformation limit. Upgrade your plan to continue restoring artworks.";
        actionUrl = "https://gessa.art/pricing";
        actionText = "Upgrade plan";
        break;

      default:
        return new Response(JSON.stringify({ ok: false, error: "Unknown notification type" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Send email using Supabase Auth (which uses the configured email provider)
    const { error: emailError } = await supabase.auth.admin.sendRawEmail({
      to: email,
      subject,
      html: createEmailTemplate(subject, content, actionUrl, actionText),
    });

    if (emailError) {
      console.error(`[Email Notification] Failed to send email: ${emailError.message}`);
      return new Response(JSON.stringify({ ok: false, error: emailError.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log(`[Email Notification] Sent ${type} to ${email}`);
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error(`[Email Notification] Error: ${err.message}`);
    return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
