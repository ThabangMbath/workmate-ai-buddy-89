import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchTasks, labelFor, PRIORITIES, STATUSES, type Task } from "@/lib/data";
import { aiFollowUpEmail } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks | WorkMate AI" },
      { name: "description", content: "Create, prioritise and complete your work tasks with due dates and estimates." },
      { property: "og:title", content: "Tasks | WorkMate AI" },
      { property: "og:description", content: "Plan and track your work tasks." },
    ],
  }),
  component: TasksPage,
});

type Draft = {
  id?: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  due_date: string;
  estimated_minutes: number;
};

const emptyDraft: Draft = {
  title: "",
  description: "",
  priority: "medium",
  status: "todo",
  due_date: "",
  estimated_minutes: 30,
};

function TasksPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: tasks = [], isLoading } = useQuery({ queryKey: ["tasks"], queryFn: fetchTasks });
  const [draft, setDraft] = useState<Draft | null>(null);

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      const payload = {
        title: d.title,
        description: d.description || null,
        priority: d.priority,
        status: d.status,
        due_date: d.due_date || null,
        estimated_minutes: Number(d.estimated_minutes) || 30,
      };
      const { error } = d.id
        ? await supabase.from("tasks").update(payload).eq("id", d.id)
        : await supabase.from("tasks").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      setDraft(null);
      toast.success("Task saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Task> }) => {
      const { error } = await supabase.from("tasks").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task deleted");
    },
  });

  const emailFromTask = useMutation({
    mutationFn: async (t: Task) => {
      const res = await aiFollowUpEmail({
        data: {
          tone: "professional",
          context: `Task: ${t.title}\nDetails: ${t.description ?? "not specified"}\nPriority: ${t.priority}\nStatus: ${t.status}\nDue date: ${t.due_date ?? "not specified"}`,
        },
      });
      const { error } = await supabase.from("emails").insert({
        purpose: `Update on task: ${t.title}`,
        recipient: "",
        key_points: t.description ?? "",
        tone: "professional",
        subject: res.subject,
        body: res.body,
        task_id: t.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["emails"] });
      toast.success("Email drafted and saved");
      navigate({ to: "/emails" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <p className="text-sm text-muted-foreground">{tasks.length} task(s)</p>
        <Button size="sm" onClick={() => setDraft({ ...emptyDraft })}>Add task</Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      <div className="space-y-2">
        {tasks.map((t) => (
          <Card key={t.id}>
            <CardContent className="flex flex-wrap items-center gap-2 p-4">
              <div className="min-w-0 flex-1">
                <div className={`font-medium ${t.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                  {t.title}
                </div>
                {t.description && <p className="text-sm text-muted-foreground">{t.description}</p>}
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary">{labelFor(PRIORITIES, t.priority)}</Badge>
                  <Badge variant="outline">{labelFor(STATUSES, t.status)}</Badge>
                  <span>{t.due_date ? `Due ${t.due_date}` : "No due date"}</span>
                  <span>{t.estimated_minutes} min</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {t.status !== "completed" && (
                  <Button size="sm" variant="outline" onClick={() => update.mutate({ id: t.id, patch: { status: "completed" } })}>
                    Complete
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setDraft({
                  id: t.id,
                  title: t.title,
                  description: t.description ?? "",
                  priority: t.priority,
                  status: t.status,
                  due_date: t.due_date ?? "",
                  estimated_minutes: t.estimated_minutes,
                })}>Edit</Button>
                <Button size="sm" variant="outline" disabled={emailFromTask.isPending} onClick={() => emailFromTask.mutate(t)}>
                  Email
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove.mutate(t.id)}>Delete</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{draft?.id ? "Edit task" : "New task"}</DialogTitle></DialogHeader>
          {draft && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Title</Label>
                <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Priority</Label>
                  <Select value={draft.priority} onValueChange={(v) => setDraft({ ...draft, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Due date</Label>
                  <Input type="date" value={draft.due_date} onChange={(e) => setDraft({ ...draft, due_date: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Estimated minutes</Label>
                  <Input type="number" min={5} step={5} value={draft.estimated_minutes}
                    onChange={(e) => setDraft({ ...draft, estimated_minutes: Number(e.target.value) })} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button disabled={!draft?.title || save.isPending} onClick={() => draft && save.mutate(draft)}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
