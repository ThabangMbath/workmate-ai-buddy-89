import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MODEL = "google/gemini-3.8-flash";

async function callAI(system: string, user: string): Promise<string> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured.");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("AI is busy right now. Please try again in a moment.");
    if (res.status === 402) throw new Error("AI credits are exhausted. Please add credits to continue.");
    throw new Error(`AI request failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? "";
}

function parseJson<T>(raw: string, fallback: T): T {
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return fallback;
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
  } catch {
    return fallback;
  }
}

const RULES =
  "You are WorkMate AI, a workplace productivity assistant. Never invent facts, decisions, deadlines or names that are not present in the provided material. If information is missing, leave the field empty or say it is not specified. Reply with JSON only, no commentary.";

export type GeneratedEmail = { subject: string; body: string };

export const aiGenerateEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { purpose: string; recipient: string; keyPoints: string; tone: string }) => input,
  )
  .handler(async ({ data }): Promise<GeneratedEmail> => {
    const raw = await callAI(
      RULES + ' Return {"subject": string, "body": string}.',
      `Write an email.\nTone: ${data.tone}\nRecipient: ${data.recipient}\nPurpose: ${data.purpose}\nKey points:\n${data.keyPoints}`,
    );
    return parseJson<GeneratedEmail>(raw, { subject: "", body: raw });
  });

export type ActionItem = {
  title: string;
  owner: string;
  due_date: string;
  estimated_minutes: number;
  priority: string;
};
export type MeetingSummary = {
  title: string;
  summary: string;
  key_points: string[];
  decisions: string[];
  action_items: ActionItem[];
};

export const aiSummarizeMeeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { notes: string; today: string }) => input)
  .handler(async ({ data }): Promise<MeetingSummary> => {
    const raw = await callAI(
      RULES +
        ' Return {"title": string, "summary": string, "key_points": string[], "decisions": string[], "action_items": [{"title": string, "owner": string, "due_date": "YYYY-MM-DD or empty", "estimated_minutes": number, "priority": "critical|high|medium|low"}]}. Only list decisions explicitly made in the notes. Only set due_date when a deadline is stated; otherwise use an empty string.',
      `Today is ${data.today}. Meeting notes:\n${data.notes}`,
    );
    return parseJson<MeetingSummary>(raw, {
      title: "Untitled meeting",
      summary: raw,
      key_points: [],
      decisions: [],
      action_items: [],
    });
  });

export const aiFollowUpEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { context: string; tone: string }) => input)
  .handler(async ({ data }): Promise<GeneratedEmail> => {
    const raw = await callAI(
      RULES + ' Return {"subject": string, "body": string}.',
      `Write a follow-up email in a ${data.tone} tone based only on this information:\n${data.context}`,
    );
    return parseJson<GeneratedEmail>(raw, { subject: "", body: raw });
  });

export type ScheduleSuggestion = {
  task_id: string | null;
  title: string;
  day: string;
  start_time: string;
  end_time: string;
  notes: string;
};

export const aiGenerateSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      workStart: string;
      workEnd: string;
      days: number;
      startDay: string;
      tasks: Array<{
        id: string;
        title: string;
        priority: string;
        due_date: string | null;
        estimated_minutes: number;
      }>;
    }) => input,
  )
  .handler(async ({ data }): Promise<{ items: ScheduleSuggestion[] }> => {
    const raw = await callAI(
      RULES +
        ' Return {"items": [{"task_id": string, "title": string, "day": "YYYY-MM-DD", "start_time": "HH:MM", "end_time": "HH:MM", "notes": string}]}. Only schedule the given tasks, never invent new ones. Respect working hours, never overlap blocks, do critical/high priority and near-deadline work first, and include a short break if the day is full.',
      `Working hours ${data.workStart}-${data.workEnd}. Plan ${data.days} day(s) starting ${data.startDay}.\nTasks JSON:\n${JSON.stringify(data.tasks)}`,
    );
    return parseJson<{ items: ScheduleSuggestion[] }>(raw, { items: [] });
  });

export const aiAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { question: string; today: string }) => input)
  .handler(async ({ data, context }): Promise<{ answer: string }> => {
    const sb = context.supabase;
    const [tasks, meetings, schedule, emails] = await Promise.all([
      sb.from("tasks").select("title,priority,status,due_date,estimated_minutes").limit(50),
      sb.from("meetings").select("title,summary,decisions,created_at").order("created_at", { ascending: false }).limit(5),
      sb.from("schedule_items").select("title,day,start_time,end_time,done").gte("day", data.today).limit(50),
      sb.from("emails").select("subject,recipient,created_at").order("created_at", { ascending: false }).limit(5),
    ]);
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI is not configured.");
    const answer = await callAI(
      "You are WorkMate AI. Answer questions about the user's own tasks, meetings, schedule and emails using ONLY the data provided. Never invent tasks, decisions or deadlines. If the data does not contain the answer, say so briefly. Answer in short plain text.",
      `Today is ${data.today}.\nTASKS: ${JSON.stringify(tasks.data ?? [])}\nMEETINGS: ${JSON.stringify(meetings.data ?? [])}\nSCHEDULE: ${JSON.stringify(schedule.data ?? [])}\nEMAILS: ${JSON.stringify(emails.data ?? [])}\n\nQuestion: ${data.question}`,
    );
    return { answer };
  });
