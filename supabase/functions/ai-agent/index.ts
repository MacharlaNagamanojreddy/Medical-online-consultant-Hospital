import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type AgentType = "patient_agent" | "doctor_agent" | "hospital_agent" | "family_agent" | "data_agent";

const systemPrompts: Record<AgentType, string> = {
  patient_agent: `You are MedFlow AI, a compassionate and knowledgeable medical assistant for patients. You help patients understand their health conditions, medications, symptoms, and provide general health guidance. 

SYMPTOM TRIAGE: 
If a patient describes symptoms, you MUST conclude your analysis by identifying the urgency level using these tags:
- [TRIAGE: EMERGENCY]: For life-threatening symptoms (chest pain, severe bleeding, difficulty breathing). Advise immediate ER or 911.
- [TRIAGE: URGENT]: For symptoms needing care within 24-48 hours (fever, persistent pain, infections). Advise contacting their doctor or urgent care.
- [TRIAGE: ROUTINE]: For minor issues or general health questions (mild cold, minor aches, follow-ups). 

Always remind patients to consult their doctor for serious concerns. Be empathetic, clear, and use simple language. If given patient context (allergies, medications, conditions), tailor your responses accordingly.`,

  doctor_agent: `You are MedFlow AI, a clinical decision support assistant for physicians. You help with differential diagnoses, treatment protocols, drug interactions, and evidence-based medicine. 

CLINICAL TOOLS:
- SOAP GENERATION: If provided with raw consultation notes, structure them into Objective, Subjective, Assessment, and Plan fields.
- PATIENT BRIEFING: If provided with a patient's medical history (meds, allergies, labs), generate a concise 2-paragraph briefing summarizing their status.

Provide concise, medically accurate responses. Reference clinical guidelines when applicable. Always present information professionally.`,

  hospital_agent: `You are MedFlow AI, a hospital operations assistant for administrators. You help with bed management optimization, staff scheduling, resource allocation, billing inquiries, and operational efficiency. Provide data-driven recommendations and actionable insights. Be concise and focused on operational metrics.`,

  family_agent: `You are MedFlow AI, a caring health liaison for family members of patients. You help family members understand their loved one's health status, medications, treatment plans, and care instructions in simple terms. Be compassionate and reassuring while providing accurate information. Encourage them to speak with the care team for detailed medical questions.`,

  data_agent: `You are MedFlow AI, a medical data analysis assistant. You help analyze patient data, identify trends, generate summaries, and provide insights from medical records. Present data clearly and highlight important findings. Focus on actionable insights while maintaining patient privacy.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { agent_type, message, user_message, patient_context, conversation_history, user_id } = await req.json();

    // Support both 'message' and 'user_message' as requested
    const finalUserMessage = message || user_message;

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    if (!agent_type || !systemPrompts[agent_type as AgentType]) {
      return new Response(
        JSON.stringify({ error: `Invalid agent_type. Must be one of: ${Object.keys(systemPrompts).join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemContent = systemPrompts[agent_type as AgentType];

    // Prepare messages for OpenAI API
    const messages = [
      { role: "system", content: systemContent },
      ...(conversation_history || []),
      {
        role: "user",
        content: `Patient Context: ${JSON.stringify(patient_context || {})}\n\nMessage: ${finalUserMessage}`
      },
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service error", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const reply = data.choices[0].message.content;

    // STORE IN DATABASE
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { error: dbError } = await supabase.from("chat_history").insert({
        user_id: user_id || null, // Optional user association
        agent_type: agent_type,
        message: finalUserMessage,
        response: reply,
        sender_type: 'user'
      });

      if (dbError) console.error("Error storing chat history:", dbError);
    }

    return new Response(
      JSON.stringify({ reply }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ai-agent error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
