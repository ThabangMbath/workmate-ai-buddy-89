import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchMeetings, todayISO, type Meeting } from "@/lib/data";
import { aiFollowUpEmail, aiSummarizeMeeting } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/meetings")({
  head: () => ({
    meta: [
      { title: "Meetings | WorkMate AI" },
      { name: "description", content: "Paste meeting notes and get a summary, decisions and action items you can turn into tasks." },
      { property: "og:title", content: "Meetings | WorkMate AI" },
      { property: "og:description", content: "AI meeting notes summarizer." },
    ],
  }),
  component: MeetingsPage,
});

function MeetingsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [notes, setNotes] = useState("");
  const { data: meetings = [] } = useQuery({ queryKey: ["meetings"], queryFn: fetchMeetings });

  const summarize = useMutation({
    mutationFn: async () => {
      const res = await aiSummarizeMeeting({ data: { notes, today: todayISO() } });
      const { error } = await supabase.from("meetings").insert({
        title: res.title || "Untitled meeting",
        raw_notes: notes,
        summary: res.summary ?? "",
        key_points: res.key_points ?? [],
        decisions: res.decisions ?? [],
        action_items: res.action_items ?? [],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNotes("");
      qc.invalidateQueries({ queryKey: ["meetings"] });
      toast.success("Meeting summarized and saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addTask = useMutation({
    mutationFn: async ({ meeting, index }: { meeting: Meeting; index: number }) => {
      const item = meeting.action_items[index];
      if (!item) return;
      const { error } = await supabase.from("tasks").insert({
        title: item.title,
        description: `From meeting: ${meeting.title}`,
        priority: item.priority || "medium",
        status: "todo",
        due_date: item.due_date || null,
        estimated_minutes: item.estimated_minutes || 30,
        meeting_id: meeting.id,
        owner_name: item.owner || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Added to tasks");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const followUp = useMutation({
    mutationFn: async (m: Meeting) => {
      const context = `Meeting: ${m.title}\nSummary: ${m.summary ?? ""}\nKey points: ${(m.key_points ?? []).join("; ")}\nDecisions: ${(m.decisions ?? []).join("; ")}\nAction items: ${(m.action_items ?? []).map((a) => `${a.title}${a.owner ? ` (${a.owner})` : ""}${a.due_date ? ` due ${a.due_date}` : ""}`).join("; ")}`;
      const res = await aiFollowUpEmail({ data: { context, tone: "professional" } });
      const { error } = await supabase.from("emails").insert({
        purpose: `Follow-up on ${m.title}`,
        recipient: "",
        key_points: context,
        tone: "professional",
        subject: res.subject,
        body: res.body,
        meeting_id: m.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["emails"] });
      toast.success("Follow-up email drafted and saved");
      navigate({ to: "/emails" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Summarize meeting notes</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Textarea rows={8} placeholder="Paste your meeting notes here…" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <Button disabled={!notes.trim() || summarize.isPending} onClick={() => summarize.mutate()}>
            {summarize.isPending ? "Summarizing…" : "Summarize"}
          </Button>
        </CardContent>
      </Card>

      {meetings.map((m) => (
        <Card key={m.id}>
          <CardHeader>
            <CardTitle className="text-base">{m.title}</CardTitle>
            <p className="text-xs text-muted-foreground">{m.created_at.slice(0, 10)}</p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>{m.summary}</p>

            {(m.key_points ?? []).length > 0 && (
              <div>
                <p className="font-medium">Key points</p>
                <ul className="list-disc pl-5 text-muted-foreground">
                  {m.key_points.map((k, i) => <li key={i}>{k}</li>)}
                </ul>
              </div>
            )}

            {(m.decisions ?? []).length > 0 && (
              <div>
                <p className="font-medium">Decisions</p>
                <ul className="list-disc pl-5 text-muted-foreground">
                  {m.decisions.map((k, i) => <li key={i}>{k}</li>)}
                </ul>
              </div>
            )}

            {(m.action_items ?? []).length > 0 && (
              <div className="space-y-2">
                <p className="font-medium">Action items</p>
                {m.action_items.map((a, i) => (
                  <div key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2">
                    <div>
                      <div>{a.title}</div>
                      <div className="text-xs text-muted-foreground">
                        Responsible: {a.owner || "not specified"} · Deadline: {a.due_date || "not specified"} · {a.estimated_minutes || 30} min
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => addTask.mutate({ meeting: m, index: i })}>
                      Add to Tasks
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <Button size="sm" disabled={followUp.isPending} onClick={() => followUp.mutate(m)}>
              Generate Follow-Up Email
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
