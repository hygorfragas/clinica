import { SignOutButton } from "@/components/layout/sign-out-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AguardandoAcessoPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Acesso pendente</CardTitle>
          <CardDescription>
            Sua conta ainda não foi vinculada a uma clínica. Peça ao super
            administrador ou ao administrador da sua clínica para liberar o
            acesso.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-ink-muted">
            Depois que o cadastro for associado a uma clínica, você poderá usar a
            agenda e o prontuário normalmente.
          </p>
          <SignOutButton />
        </CardContent>
      </Card>
    </div>
  );
}
