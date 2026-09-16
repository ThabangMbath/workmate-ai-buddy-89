import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchProfile } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings | WorkMate AI" },
      { name: "description", content: "Update your name and working hours used for AI scheduling." },
      { property: "og:title", content: "Settings | WorkMate AI" },
      { property: "og:description", content: "Manage your WorkMate AI profile." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: fetchProfile });
  const [fullName, setFullName] = useState("");
  const [workStart, setWorkStart] = useState("09:00");
  const [workEnd, setWorkEnd] = useState("17:00");

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setWorkStart(profile.work_start.slice(0, 5));
      setWorkEnd(profile.work_end.slice(0, 5));
    }
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: auth.user.id, email: auth.user.email, full_name: fullName, work_start: workStart, work_end: workEnd });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Settings saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="max-w-lg">
      <CardHeader><CardTitle className="text-base">Profile & working hours</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label>Email</Label>
          <Input value={profile?.email ?? ""} disabled />
        </div>
        <div className="space-y-1">
          <Label>Full name</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Work start</Label>
            <Input type="time" value={workStart} onChange={(e) => setWorkStart(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Work end</Label>
            <Input type="time" value={workEnd} onChange={(e) => setWorkEnd(e.target.value)} />
          </div>
        </div>
        <Button disabled={save.isPending} onClick={() => save.mutate()}>Save</Button>
      </CardContent>
    </Card>
  );
}
