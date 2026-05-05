export interface Env {
  AI: Ai;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Use POST" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      const body = await request.json() as { prompt: string; image?: string };
      const { prompt, image } = body;

      if (!prompt) {
        return new Response(JSON.stringify({ error: "Missing prompt" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const input: Record<string, unknown> = {
        prompt,
        quality: "auto",
        size: "1024x1024",
      };

      if (image && image !== "none") {
        input.images = [image];
      }

      const response = await env.AI.run(
        "openai/gpt-image-2",
        input,
        {
          gateway: { id: "gessa" },
        }
      );

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  },
};
