import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchEmails, TONES } from "@/lib/data";
import { aiGenerateEmail } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/emails")({
  head: () => ({
    meta: [
      { title: "Emails | WorkMate AI" },
      { name: "description", content: "Generate, edit and save professional emails in the tone you choose." },
      { property: "og:title", content: "Emails | WorkMate AI" },
      { property: "og:description", content: "AI smart email generator." },
    ],
  }),
  component: EmailsPage,
});

function EmailsPage() {
  const qc = useQueryClient();
  const [purpose, setPurpose] = useState("");
  const [recipient, setRecipient] = useState("");
  const [keyPoints, setKeyPoints] = useState("");
  const [tone, setTone] = useState("professional");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const { data: emails = [] } = useQuery({ queryKey: ["emails"], queryFn: fetchEmails });

  const generate = useMutation({
    mutationFn: () => aiGenerateEmail({ data: { purpose, recipient, keyPoints, tone } }),
    onSuccess: (res) => {
      setSubject(res.subject);
      setBody(res.body);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("emails").insert({
        purpose, recipient, key_points: keyPoints, tone, subject, body,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["emails"] });
      toast.success("Email saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("emails").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["emails"] }),
  });

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    toast.success("Copied");
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Smart email generator</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Purpose</Label>
              <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Request a project update" />
            </div>
            <div className="space-y-1">
              <Label>Recipient</Label>
              <Input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Sarah, product manager" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Key points</Label>
            <Textarea rows={4} value={keyPoints} onChange={(e) => setKeyPoints(e.target.value)} />
          </div>
          <div className="space-y-1 md:w-48">
            <Label>Tone</Label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TONES.map((t) => <SelectItem key={t} value={t}>{t[0]!.toUpperCase() + t.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={!purpose.trim() || generate.isPending} onClick={() => generate.mutate()}>
              {generate.isPending ? "Generating…" : body ? "Regenerate" : "Generate"}
            </Button>
            {body && <Button variant="outline" onClick={() => copy(`${subject}\n\n${body}`)}>Copy</Button>}
            {body && <Button variant="outline" disabled={save.isPending} onClick={() => save.mutate()}>Save</Button>}
          </div>

          {(subject || body) && (
            <div className="space-y-2 rounded-md border p-3">
              <div className="space-y-1">
                <Label>Subject</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Body (editable)</Label>
                <Textarea rows={12} value={body} onChange={(e) => setBody(e.target.value)} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Saved emails</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          {emails.length === 0 && <p className="text-muted-foreground">No saved emails yet.</p>}
          {emails.map((e) => (
            <div key={e.id} className="rounded-md border p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{e.subject || "(no subject)"}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.recipient || "no recipient"} · {e.tone} · {e.created_at.slice(0, 10)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => copy(`${e.subject ?? ""}\n\n${e.body}`)}>Copy</Button>
                  <Button size="sm" variant="ghost" onClick={() => remove.mutate(e.id)}>Delete</Button>
                </div>
              </div>
              <pre className="mt-2 whitespace-pre-wrap font-sans text-muted-foreground">{e.body}</pre>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
