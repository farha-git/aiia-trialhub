import { useServerFn } from "@tanstack/react-start";
import { Bot, LoaderCircle, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { askClinicalAssistant } from "@/lib/clinical-chat.server";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  id: string;
};

const suggestions = [
  "Which study needs attention first?",
  "Summarize the open safety events.",
  "What does the report export include?",
];

function createMessage(role: ChatMessage["role"], text: string): ChatMessage {
  return { role, text, id: `${Date.now()}-${Math.random()}` };
}

export function ClinicalChatbot() {
  const askAssistant = useServerFn(askClinicalAssistant);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    createMessage("assistant", "Hello. I can answer questions about the synthetic study portfolio, safety items, compliance status, KPIs, and report exports."),
  ]);
  const messageListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messageListRef.current?.scrollTo({ top: messageListRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, open]);

  const sendMessage = async (text = draft) => {
    const question = text.trim();
    if (!question || loading) return;

    const history = messages.slice(-10).map((message) => ({
      role: message.role === "assistant" ? "model" as const : "user" as const,
      text: message.text,
    }));
    setMessages((current) => [...current, createMessage("user", question)]);
    setDraft("");
    setLoading(true);

    try {
      const result = await askAssistant({ data: { question, history } });
      setMessages((current) => [...current, createMessage("assistant", result.answer)]);
    } catch {
      setMessages((current) => [...current, createMessage("assistant", "I couldn't reach the project assistant. Check the server configuration and try again.")]);
    } finally {
      setLoading(false);
    }
  };

  return <>
    {open && <section role="dialog" aria-modal="false" aria-labelledby="clinical-chat-title" className="fixed bottom-24 right-4 z-[60] flex h-[min(640px,calc(100dvh-8rem))] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl sm:bottom-24 sm:right-6">
      <header className="flex items-center justify-between gap-3 border-b border-border bg-primary px-4 py-3 text-primary-foreground">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full border border-primary-foreground/20 bg-primary-foreground/10"><Bot className="size-5" /></span>
          <div className="min-w-0"><h2 id="clinical-chat-title" className="truncate text-sm font-semibold">TrialShield Assistant</h2><p className="mt-0.5 text-[11px] text-primary-foreground/65">Project data · Gemini</p></div>
        </div>
        <Button type="button" variant="ghost" size="icon" aria-label="Close assistant" className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" onClick={() => setOpen(false)}><X className="size-4" /></Button>
      </header>

      <div ref={messageListRef} className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
        {messages.map((message) => <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
          <p className={`max-w-[88%] whitespace-pre-wrap rounded-xl px-3.5 py-2.5 text-sm leading-5 ${message.role === "user" ? "rounded-br-sm bg-secondary text-secondary-foreground" : "rounded-bl-sm border border-border bg-surface text-foreground"}`}>{message.text}</p>
        </div>)}
        {loading && <div className="flex items-center gap-2 text-xs text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />Checking the project data...</div>}
        {messages.length === 1 && <div className="space-y-2 pt-1">{suggestions.map((suggestion) => <button key={suggestion} type="button" className="block w-full rounded-md border border-border px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-secondary/40 hover:bg-muted hover:text-foreground" onClick={() => void sendMessage(suggestion)}>{suggestion}</button>)}</div>}
      </div>

      <div className="border-t border-border bg-surface p-3">
        <p className="mb-2 px-1 text-[10px] leading-4 text-muted-foreground">Demo data only. Do not enter participant names, IDs, or other identifiable health information. Messages are sent to Gemini.</p>
        <form className="flex items-end gap-2" onSubmit={(event) => { event.preventDefault(); void sendMessage(); }}>
          <label className="sr-only" htmlFor="clinical-chat-input">Ask the project assistant</label>
          <Textarea id="clinical-chat-input" value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} placeholder="Ask about studies, safety, or compliance..." maxLength={2000} rows={2} disabled={loading} className="min-h-10 max-h-28 resize-none rounded-lg bg-background text-sm" />
          <Button type="submit" size="icon" aria-label="Send message" disabled={loading || !draft.trim()} className="size-10 shrink-0 rounded-full"><Send className="size-4" /></Button>
        </form>
      </div>
    </section>}

    <Button type="button" aria-label={open ? "Close project assistant" : "Open project assistant"} title="Ask the TrialShield project assistant" onClick={() => setOpen((current) => !current)} className="fixed bottom-5 right-4 z-[60] size-14 rounded-full border-2 border-background bg-primary p-0 text-primary-foreground shadow-xl ring-1 ring-primary/15 transition-transform hover:scale-105 hover:bg-primary/90 focus-visible:ring-4 focus-visible:ring-secondary sm:bottom-6 sm:right-6">
      {open ? <X className="size-6" /> : <><MessageCircle className="size-6" /><Sparkles className="absolute right-2 top-2 size-3 rounded-full bg-primary p-0.5 text-accent" /></>}
    </Button>
  </>;
}
