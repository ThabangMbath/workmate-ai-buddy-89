import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchProfile, fetchSchedule, fetchTasks, todayISO, type ScheduleItem } from "@/lib/data";
import { aiGenerateSchedule } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/schedule")({
  head: () => ({
    meta: [
      { title: "Schedule | WorkMate AI" },
      { name: "description", content: "Turn your tasks, priorities and deadlines into a realistic daily or weekly plan." },
      { property: "og:title", content: "Schedule | WorkMate AI" },
      { property: "og:description", content: "AI daily and weekly scheduler." },
    ],
  }),
  component: SchedulePage,
});

function SchedulePage() {
  const qc = useQueryClient();
  const today = todayISO();
  const [workStart, setWorkStart] = useState("09:00");
  const [workEnd, setWorkEnd] = useState("17:00");
  const [days, setDays] = useState("1");
  const [editing, setEditing] = useState<ScheduleItem | null>(null);

  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: fetchProfile });
  const { data: tasks = [] } = useQuery({ queryKey: ["tasks"], queryFn: fetchTasks });
  const { data: items = [] } = useQuery({ queryKey: ["schedule"], queryFn: fetchSchedule });

  useEffect(() => {
    if (profile) {
      setWorkStart(profile.work_start.slice(0, 5));
      setWorkEnd(profile.work_end.slice(0, 5));
    }
  }, [profile]);

  const generate = useMutation({
    mutationFn: async () => {
      const open = tasks
        .filter((t) => t.status !== "completed")
        .map((t) => ({
          id: t.id,
          title: t.title,
          priority: t.priority,
          due_date: t.due_date,
          estimated_minutes: t.estimated_minutes,
        }));
      if (open.length === 0) throw new Error("Add some open tasks first.");
      const res = await aiGenerateSchedule({
        data: { workStart, workEnd, days: Number(days), startDay: today, tasks: open },
      });
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not signed in");
      await supabase.from("schedule_items").delete().gte("day", today);
      const rows = (res.items ?? []).map((i) => ({
        task_id: open.some((t) => t.id === i.task_id) ? i.task_id : null,
        title: i.title,
        day: i.day,
        start_time: i.start_time,
        end_time: i.end_time,
        notes: i.notes || null,
      }));
      if (rows.length) {
        const { error } = await supabase.from("schedule_items").insert(rows);
        if (error) throw error;
      }
      await supabase
        .from("profiles")
        .update({ work_start: workStart, work_end: workEnd })
        .eq("id", auth.user.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedule"] });
      toast.success("Schedule generated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const complete = useMutation({
    mutationFn: async (item: ScheduleItem) => {
      const { error } = await supabase.from("schedule_items").update({ done: true }).eq("id", item.id);
      if (error) throw error;
      if (item.task_id) {
        await supabase.from("tasks").update({ status: "completed" }).eq("id", item.task_id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedule"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Marked complete");
    },
  });

  const saveEdit = useMutation({
    mutationFn: async (item: ScheduleItem) => {
      const { error } = await supabase
        .from("schedule_items")
        .update({ title: item.title, day: item.day, start_time: item.start_time, end_time: item.end_time })
        .eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedule"] });
      setEditing(null);
      toast.success("Schedule item updated");
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("schedule_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schedule"] }),
  });

  const upcoming = items.filter((i) => i.day >= today);
  const byDay = upcoming.reduce<Record<string, ScheduleItem[]>>((acc, i) => {
    (acc[i.day] ??= []).push(i);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Plan my time</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label>Work start</Label>
            <Input type="time" value={workStart} onChange={(e) => setWorkStart(e.target.value)} className="w-32" />
          </div>
          <div className="space-y-1">
            <Label>Work end</Label>
            <Input type="time" value={workEnd} onChange={(e) => setWorkEnd(e.target.value)} className="w-32" />
          </div>
          <div className="space-y-1">
            <Label>Range</Label>
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Today</SelectItem>
                <SelectItem value="5">5 days</SelectItem>
                <SelectItem value="7">7 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button disabled={generate.isPending} onClick={() => generate.mutate()}>
            {generate.isPending ? "Planning…" : upcoming.length ? "Regenerate schedule" : "Generate schedule"}
          </Button>
        </CardContent>
      </Card>

      {upcoming.length === 0 && <p className="text-sm text-muted-foreground">No schedule yet.</p>}

      {Object.entries(byDay).map(([day, dayItems]) => (
        <Card key={day}>
          <CardHeader><CardTitle className="text-base">{day}</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {dayItems.map((i) => (
              <div key={i.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2">
                <div>
                  <div className={i.done ? "line-through text-muted-foreground" : ""}>{i.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {i.start_time.slice(0, 5)}–{i.end_time.slice(0, 5)}{i.notes ? ` · ${i.notes}` : ""}
                  </div>
                </div>
                <div className="flex gap-2">
                  {!i.done && <Button size="sm" variant="outline" onClick={() => complete.mutate(i)}>Complete</Button>}
                  <Button size="sm" variant="outline" onClick={() => setEditing(i)}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => remove.mutate(i.id)}>Delete</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit schedule item</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Title</Label>
                <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label>Day</Label>
                  <Input type="date" value={editing.day} onChange={(e) => setEditing({ ...editing, day: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Start</Label>
                  <Input type="time" value={editing.start_time.slice(0, 5)} onChange={(e) => setEditing({ ...editing, start_time: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>End</Label>
                  <Input type="time" value={editing.end_time.slice(0, 5)} onChange={(e) => setEditing({ ...editing, end_time: e.target.value })} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => editing && saveEdit.mutate(editing)}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
