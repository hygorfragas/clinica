import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function CadastroMigrationRequired() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Banco ainda não preparado</CardTitle>
        <CardDescription>
          O app não conseguiu consultar o estado do cadastro no Supabase. Em
          geral falta aplicar as migrações SQL no projeto remoto.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-ink-muted">
        <p>No diretório do projeto, rode (com CLI logada no projeto certo):</p>
        <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs text-ink">
          npx supabase db push
        </pre>
        <p>
          Ou copie e execute no SQL Editor do Supabase os arquivos em{" "}
          <code className="rounded bg-muted px-1 text-ink">supabase/migrations/</code>
          , na ordem dos nomes (incluindo{" "}
          <code className="text-ink">platform_super_admin</code> e a função{" "}
          <code className="text-ink">clinic_bootstrap_status</code>).
        </p>
        <p>
          <Link href="/login" className="font-medium text-brand hover:underline">
            Voltar ao login
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
