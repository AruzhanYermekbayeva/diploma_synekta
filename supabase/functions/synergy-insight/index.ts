const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    console.log("Function started")
    const body = await req.json()
    console.log("Body:", JSON.stringify(body).slice(0, 200))
    
    const { startup_a, startup_b, similarity } = body

    console.log("Calling Groq...")
    const apiKey = Deno.env.get("GROQ_API_KEY")
    console.log("Groq key exists:", !!apiKey)

    const prompt = `Two startups matched at ${Math.round(similarity * 100)}% compatibility.
Startup A: ${startup_a.name} — Offers: ${startup_a.offers?.join(", ")} — Needs: ${startup_a.needs?.join(", ")}
Startup B: ${startup_b.name} — Offers: ${startup_b.offers?.join(", ")} — Needs: ${startup_b.needs?.join(", ")}
Write 2-3 sentences explaining why they should collaborate.`

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }],
      }),
    })

    console.log("Groq status:", response.status)
    const rawText = await response.text()
    console.log("Groq response:", rawText.slice(0, 300))

    const data = JSON.parse(rawText)
    const insight = data.choices[0].message.content

    return new Response(JSON.stringify({ insight }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    console.log("Error:", err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: corsHeaders,
    })
  }
})