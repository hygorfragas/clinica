/**
 * Região corporal do procedimento (fotos clínicas).
 * Apenas `face` aciona o fluxo de ângulos para base do boneco digital (PRD).
 */

export const BODY_REGIONS = {
  face: "face",
  neck: "neck",
  torso: "torso",
  limbs: "limbs",
  gluteal: "gluteal",
  other: "other",
} as const;

export type BodyRegion = (typeof BODY_REGIONS)[keyof typeof BODY_REGIONS];

export const BODY_REGION_LABELS: Record<BodyRegion, string> = {
  face: "Rosto / face (boneco digital)",
  neck: "Pescoço",
  torso: "Tronco / abdômen",
  limbs: "Membros",
  gluteal: "Glúteos",
  other: "Outra região",
};

export const BODY_REGION_OPTIONS: { value: BodyRegion; label: string }[] = [
  { value: BODY_REGIONS.face, label: BODY_REGION_LABELS.face },
  { value: BODY_REGIONS.neck, label: BODY_REGION_LABELS.neck },
  { value: BODY_REGIONS.torso, label: BODY_REGION_LABELS.torso },
  { value: BODY_REGIONS.limbs, label: BODY_REGION_LABELS.limbs },
  { value: BODY_REGIONS.gluteal, label: BODY_REGION_LABELS.gluteal },
  { value: BODY_REGIONS.other, label: BODY_REGION_LABELS.other },
];

/** Ângulos recomendados para reconstrução / boneco facial (cabeça). */
export const FACE_BONECO_ANGLES = [
  "front",
  "left",
  "right",
  "top",
  "bottom",
] as const;

export type FaceBonecoAngle = (typeof FACE_BONECO_ANGLES)[number];

export const CAPTURE_ANGLE_LABELS: Record<
  FaceBonecoAngle | "custom" | "unspecified",
  string
> = {
  front: "Frente (anterior)",
  left: "Perfil esquerdo",
  right: "Perfil direito",
  top: "Superior (cabeça)",
  bottom: "Inferior (mandíbula / pescoço)",
  custom: "Outro ângulo (livre)",
  unspecified: "Sem classificação",
};

export const MAX_PHOTOS_PER_BATCH = 15;

export function isBodyRegion(v: string): v is BodyRegion {
  return (Object.values(BODY_REGIONS) as string[]).includes(v);
}

export function isFaceBonecoAngle(v: string): v is FaceBonecoAngle {
  return (FACE_BONECO_ANGLES as readonly string[]).includes(v);
}

export function isCaptureAngleForFace(
  v: string | null | undefined,
): v is FaceBonecoAngle | "custom" {
  if (!v) return false;
  return isFaceBonecoAngle(v) || v === "custom";
}

/** Quais ângulos do boneco já têm pelo menos uma foto (região face). */
export function faceAngleCoverage(
  angles: (string | null)[],
): Set<FaceBonecoAngle> {
  const s = new Set<FaceBonecoAngle>();
  for (const a of angles) {
    if (a && isFaceBonecoAngle(a)) s.add(a);
  }
  return s;
}

export function missingFaceBonecoAngles(
  covered: Set<FaceBonecoAngle>,
): FaceBonecoAngle[] {
  return FACE_BONECO_ANGLES.filter((a) => !covered.has(a));
}
