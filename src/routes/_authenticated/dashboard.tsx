import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchMeetings, fetchSchedule, fetchTasks, labelFor, PRIORITIES, todayISO } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard | WorkMate AI" },
      { name: "description", content: "See today's tasks, deadlines, schedule and recent meetings in one place." },
      { property: "og:title", content: "Dashboard | WorkMate AI" },
      { property: "og:description", content: "Your daily productivity overview." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const today = todayISO();
  const tasks = useQuery({ queryKey: ["tasks"], queryFn: fetchTasks });
  const schedule = useQuery({ queryKey: ["schedule"], queryFn: fetchSchedule });
  const meetings = useQuery({ queryKey: ["meetings"], queryFn: fetchMeetings });

  const open = (tasks.data ?? []).filter((t) => t.status !== "completed");
  const todays = open.filter((t) => t.due_date === today);
  const upcoming = open.filter((t) => t.due_date && t.due_date > today).slice(0, 5);
  const todaySchedule = (schedule.data ?? []).filter((s) => s.day === today);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm"><Link to="/emails">Generate Email</Link></Button>
        <Button asChild size="sm" variant="outline"><Link to="/meetings">Summarize Meeting</Link></Button>
        <Button asChild size="sm" variant="outline"><Link to="/tasks">Add Task</Link></Button>
        <Button asChild size="sm" variant="outline"><Link to="/schedule">Generate Schedule</Link></Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Today's tasks</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {todays.length === 0 && <p className="text-muted-foreground">Nothing due today.</p>}
            {todays.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-2">
                <span>{t.title}</span>
                <Badge variant="secondary">{labelFor(PRIORITIES, t.priority)}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Upcoming deadlines</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {upcoming.length === 0 && <p className="text-muted-foreground">No upcoming deadlines.</p>}
            {upcoming.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-2">
                <span>{t.title}</span>
                <span className="text-muted-foreground">{t.due_date}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Today's schedule</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {todaySchedule.length === 0 && <p className="text-muted-foreground">No schedule for today.</p>}
            {todaySchedule.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2">
                <span className={s.done ? "line-through text-muted-foreground" : ""}>{s.title}</span>
                <span className="text-muted-foreground">{s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Recent meetings</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(meetings.data ?? []).length === 0 && <p className="text-muted-foreground">No meetings yet.</p>}
            {(meetings.data ?? []).slice(0, 5).map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-2">
                <span className="truncate">{m.title}</span>
                <span className="text-muted-foreground">{m.created_at.slice(0, 10)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
