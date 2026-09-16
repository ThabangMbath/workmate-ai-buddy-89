import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { aiAssistant } from "@/lib/ai.functions";
import { todayISO } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/assistant")({
  head: () => ({
    meta: [
      { title: "AI Assistant | WorkMate AI" },
      { name: "description", content: "Ask questions about your tasks, meetings, schedule and emails." },
      { property: "og:title", content: "AI Assistant | WorkMate AI" },
      { property: "og:description", content: "Chat with your workplace assistant." },
    ],
  }),
  component: AssistantPage,
});

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "What tasks do I have today?",
  "Summarize my latest meeting.",
  "What are my upcoming deadlines?",
];

function AssistantPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");

  const ask = useMutation({
    mutationFn: (question: string) => aiAssistant({ data: { question, today: todayISO() } }),
    onSuccess: (res) => setMessages((m) => [...m, { role: "assistant", content: res.answer }]),
    onError: (e: Error) => toast.error(e.message),
  });

  function send(question: string) {
    if (!question.trim()) return;
    setMessages((m) => [...m, { role: "user", content: question }]);
    setInput("");
    ask.mutate(question);
  }

  return (
    <Card className="mx-auto max-w-3xl">
      <CardContent className="space-y-3 p-4">
        <div className="min-h-64 space-y-3 text-sm">
          {messages.length === 0 && (
            <div className="space-y-2">
              <p className="text-muted-foreground">Ask about your tasks, meetings, schedule or emails.</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <Button key={s} size="sm" variant="outline" onClick={() => send(s)}>{s}</Button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : ""}>
              <span className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-md px-3 py-2 text-left ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {m.content}
              </span>
            </div>
          ))}
          {ask.isPending && <p className="text-muted-foreground">Thinking…</p>}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask a question…" />
          <Button type="submit" disabled={ask.isPending}>Send</Button>
        </form>
      </CardContent>
    </Card>
  );
}
