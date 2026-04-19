import { redirect } from "next/navigation";

type PageProps = { params: Promise<{ clientId: string }> };

export default async function LegacyDocumentosRedirect({ params }: PageProps) {
  const { clientId } = await params;
  redirect(`/pacientes/${clientId}/anexos`);
}
