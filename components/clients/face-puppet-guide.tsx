import Image from "next/image";
import {
  CAPTURE_ANGLE_LABELS,
  type FaceBonecoAngle,
} from "@/lib/clinical/body-regions";

const REF1 = "/clinical/ref-boneco-facial-visao-anatomica.png";
const REF2 = "/clinical/ref-boneco-musculos-mimica.png";

export function FacePuppetGuide({
  missingAngles,
}: {
  missingAngles: FaceBonecoAngle[];
}) {
  return (
    <section className="overflow-hidden rounded-[1.75rem] bg-surface shadow-lift ring-1 ring-line">
      <div className="border-b border-line/70 bg-brand/5 px-6 py-4 md:px-8">
        <h2 className="text-base font-semibold text-ink">
          Boneco digital — visão clínica (referência)
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          O objetivo é reunir vistas do rosto da paciente para, em evoluções do
          produto, alinhar <strong className="font-medium text-ink">guias anatômicos</strong>{" "}
          (músculos da mímica, planos de injeção) à geometria real — no estilo das
          referências abaixo. Nesta versão, o sistema{" "}
          <strong className="font-medium text-ink">organiza e classifica</strong>{" "}
          as fotos por ângulo; a malha 3D interativa e sobreposição dinâmica são
          o próximo passo técnico (React Konva / canvas ou integração com malha
          facial), evitando prometer reconstrução 3D automática sem pipeline
          validado clinicamente.
        </p>
      </div>

      <div className="grid gap-6 p-6 md:grid-cols-2 md:p-8">
        <figure className="space-y-2">
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted ring-1 ring-line/60">
            <Image
              src={REF1}
              alt="Referência: rosto com metade anatômica (músculos e vasos)"
              fill
              className="object-cover object-top"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority={false}
            />
          </div>
          <figcaption className="text-xs text-ink-muted">
            Referência visual: combinação face natural + plano anatômico para
            planejamento.
          </figcaption>
        </figure>
        <figure className="space-y-2">
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted ring-1 ring-line/60">
            <Image
              src={REF2}
              alt="Referência: músculos da mímica em diferentes expressões"
              fill
              className="object-cover object-top"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
          <figcaption className="text-xs text-ink-muted">
            Referência: músculos da mímica — útil para explicar pontos de aplicação
            à paciente.
          </figcaption>
        </figure>
      </div>

      <div className="border-t border-line/60 px-6 py-5 md:px-8">
        <h3 className="text-sm font-semibold text-ink">
          Cobertura de ângulos nesta ficha (rosto)
        </h3>
        {missingAngles.length === 0 ? (
          <p className="mt-2 text-sm text-brand">
            Os cinco eixos principais (frente, perfis, cima e baixo) já aparecem
            em pelo menos uma foto classificada. Continue registrando ao longo do
            protocolo.
          </p>
        ) : (
          <p className="mt-2 text-sm text-ink-muted">
            Ainda não há foto classificada como:{" "}
            <span className="font-medium text-ink">
              {missingAngles
                .map((a) => CAPTURE_ANGLE_LABELS[a])
                .join(" · ")}
            </span>
            . Inclua quando possível para fechar a base do boneco.
          </p>
        )}
      </div>
    </section>
  );
}
