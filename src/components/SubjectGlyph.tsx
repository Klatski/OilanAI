import {
  Atom,
  Compass,
  Dna,
  FlaskConical,
  Globe,
  Landmark,
  type LucideIcon,
} from "lucide-react";

/**
 * Crisp, cross-platform-consistent icon for each of the 6 subjects.
 * Replaces the OS-dependent emoji (📐 ⚛️ 🧪 …) with stroke icons that match
 * the app's neon/rounded aesthetic. Colour is inherited via `currentColor`
 * (white on gradient chips, the tab accent in the breadcrumb, etc.).
 */
const SUBJECT_ICONS: Record<string, LucideIcon> = {
  math: Compass,
  physics: Atom,
  chemistry: FlaskConical,
  history: Landmark,
  biology: Dna,
  english: Globe,
};

export function SubjectGlyph({
  subjectId,
  size = 28,
  strokeWidth = 1.75,
  className,
}: {
  subjectId: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const Icon = SUBJECT_ICONS[subjectId] ?? Compass;
  return (
    <Icon
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden
    />
  );
}
