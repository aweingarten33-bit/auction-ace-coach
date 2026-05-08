import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Loader2, RefreshCw } from "lucide-react";

interface Article { title: string; url: string; category: string; }

export default function FantasyLifeFeed() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setErr(null);
    const { data, error } = await supabase.functions.invoke("fantasy-life", {});
    if (error || (data as any)?.error) {
      setErr((data as any)?.error ?? error?.message ?? "Failed to load");
      setLoading(false);
      return;
    }
    setArticles((data as any)?.articles ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">
          Latest from fantasylife.com
        </p>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading} className="h-7 px-2">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {loading && articles.length === 0 && (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      )}

      {err && (
        <Card className="border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
          {err}
        </Card>
      )}

      <div className="space-y-2">
        {articles.map((a) => (
          <a
            key={a.url}
            href={a.url}
            target="_blank"
            rel="noreferrer"
            className="block rounded-md border border-border/40 bg-secondary/20 p-3 hover:bg-secondary/40"
          >
            <div className="mb-1 flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">{a.category}</Badge>
              <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium leading-snug">{a.title}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
