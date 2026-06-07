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
    const { text } = body

    if (!text) {
      return new Response(JSON.stringify({ error: "No text" }), { 
        status: 400,
        headers: corsHeaders
      })
    }

    const apiKey = Deno.env.get("HUGGINGFACE_API_KEY")

    const response = await fetch(
      "https://router.huggingface.co/hf-inference/models/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2/pipeline/feature-extraction",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: text }),
      }
    )

    const rawText = await response.text()

    if (!response.ok) {
      return new Response(JSON.stringify({ 
        error: "HuggingFace failed", 
        status: response.status,
        body: rawText 
      }), { status: 500, headers: corsHeaders })
    }

    const embedding = JSON.parse(rawText)
    const flat = Array.isArray(embedding[0]) ? embedding[0] : embedding

    return new Response(JSON.stringify({ embedding: flat }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500,
      headers: corsHeaders
    })
  }
})