import { supabase } from "@/integrations/supabase/client";

export type Task = {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  estimated_minutes: number;
  meeting_id: string | null;
  owner_name: string | null;
  created_at: string;
};

export type Meeting = {
  id: string;
  title: string;
  raw_notes: string;
  summary: string | null;
  key_points: string[];
  decisions: string[];
  action_items: Array<{
    title: string;
    owner?: string;
    due_date?: string;
    estimated_minutes?: number;
    priority?: string;
  }>;
  created_at: string;
};

export type EmailRow = {
  id: string;
  purpose: string | null;
  recipient: string | null;
  key_points: string | null;
  tone: string;
  subject: string | null;
  body: string;
  created_at: string;
};

export type ScheduleItem = {
  id: string;
  task_id: string | null;
  title: string;
  day: string;
  start_time: string;
  end_time: string;
  notes: string | null;
  done: boolean;
};

export const PRIORITIES = [
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

export const STATUSES = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

export const TONES = ["formal", "friendly", "persuasive", "professional"];

export const todayISO = () => new Date().toISOString().slice(0, 10);

export async function fetchTasks() {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Task[];
}

export async function fetchMeetings() {
  const { data, error } = await supabase
    .from("meetings")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Meeting[];
}

export async function fetchEmails() {
  const { data, error } = await supabase
    .from("emails")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as EmailRow[];
}

export async function fetchSchedule() {
  const { data, error } = await supabase
    .from("schedule_items")
    .select("*")
    .order("day", { ascending: true })
    .order("start_time", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ScheduleItem[];
}

export async function fetchProfile() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", auth.user.id).maybeSingle();
  return data as { id: string; email: string | null; full_name: string | null; work_start: string; work_end: string } | null;
}

export function labelFor(list: { value: string; label: string }[], value: string) {
  return list.find((i) => i.value === value)?.label ?? value;
}
