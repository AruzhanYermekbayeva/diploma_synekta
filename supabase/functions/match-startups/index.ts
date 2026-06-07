import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { startup_id } = await req.json()

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    // достаём не только embedding, но и структурные поля для business score
    const { data: me, error: meError } = await supabase
      .from("startups")
      .select("needs_embedding, stage, target_market, tech_stack")
      .eq("id", startup_id)
      .single()

    if (meError || !me?.needs_embedding) {
      return new Response(
        JSON.stringify({ error: "No embedding found for this startup" }),
        { status: 400, headers: corsHeaders }
      )
    }

    const { data: matches, error: matchError } = await supabase.rpc(
      "match_startups",
      {
        query_embedding: me.needs_embedding,
        match_threshold: 0.3,
        match_count: 20,
        exclude_id: startup_id,
        query_stage: me.stage ?? "",
        query_market: me.target_market ?? [],
        query_stack: me.tech_stack ?? [],
      }
    )

    if (matchError) throw matchError

    return new Response(JSON.stringify(matches), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: corsHeaders
    })
  }
})