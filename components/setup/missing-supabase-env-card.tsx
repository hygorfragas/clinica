import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function MissingSupabaseEnvCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Configure o Supabase</CardTitle>
        <CardDescription>
          As variáveis públicas do projeto ainda não estão definidas neste
          ambiente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-ink-muted">
        <p>
          Na raiz do projeto, crie{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs text-ink">
            .env.local
          </code>{" "}
          (a partir de{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs text-ink">
            .env.example
          </code>
          ) e defina:
        </p>
        <ul className="list-inside list-disc">
          <li>
            <code className="text-ink">NEXT_PUBLIC_SUPABASE_URL</code>
          </li>
          <li>
            <code className="text-ink">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
          </li>
        </ul>
        <p>Reinicie o servidor após salvar.</p>
        <p>
          <Link href="/" className="font-medium text-brand hover:underline">
            Voltar à página inicial
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
