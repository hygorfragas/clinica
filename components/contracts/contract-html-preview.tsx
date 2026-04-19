import { cn } from "@/lib/utils";

type Props = {
  html: string;
  className?: string;
};

/**
 * Pré-visualização somente leitura, com aparência de documento acadêmico (ABNT aproximada).
 */
export function ContractHtmlPreview({ html, className }: Props) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-line/70 bg-[#faf8f5] px-6 py-8 text-[12pt] leading-[1.5] text-black shadow-inner ring-1 ring-black/[0.03]",
        "[&_h1]:mb-4 [&_h1]:text-center [&_h1]:text-base [&_h1]:font-bold [&_h1]:uppercase",
        "[&_h2]:mt-4 [&_h2]:text-sm [&_h2]:font-bold",
        "[&_h3]:text-sm [&_h3]:font-semibold",
        "[&_p]:my-2 [&_p]:text-justify",
        "[&_ul]:my-2 [&_ol]:my-2 [&_li]:my-0.5",
        "[&_a]:text-brand [&_a]:underline",
        className,
      )}
      style={{ fontFamily: '"Times New Roman", Times, serif' }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
