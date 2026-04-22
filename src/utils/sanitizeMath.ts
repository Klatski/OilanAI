/**
 * Safety net: convert common LaTeX / Markdown-math into readable plain text.
 *
 * The system prompt already tells the model "write formulas as plain text",
 * but models sometimes slip and produce `$\frac{-b \pm \sqrt{D}}{2a}$` anyway.
 * This function turns those into human-readable strings like
 * `(−b ± √(D)) / 2a` before rendering to the chat bubble.
 *
 * Keep this conservative — we only rewrite patterns we fully understand.
 */

const SUPERSCRIPT: Record<string, string> = {
  "-": "⁻",
  "+": "⁺",
  "(": "⁽",
  ")": "⁾",
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  n: "ⁿ",
  i: "ⁱ",
};

function toSuperscript(s: string): string {
  // Only simple case: all characters have a known superscript form.
  let out = "";
  for (const ch of s) {
    const mapped = SUPERSCRIPT[ch];
    if (mapped === undefined) return `^(${s})`;
    out += mapped;
  }
  return out;
}

const GREEK_MAP: Record<string, string> = {
  alpha: "α",
  beta: "β",
  gamma: "γ",
  Gamma: "Γ",
  delta: "δ",
  Delta: "Δ",
  epsilon: "ε",
  varepsilon: "ε",
  zeta: "ζ",
  eta: "η",
  theta: "θ",
  Theta: "Θ",
  iota: "ι",
  kappa: "κ",
  lambda: "λ",
  Lambda: "Λ",
  mu: "μ",
  nu: "ν",
  xi: "ξ",
  Xi: "Ξ",
  pi: "π",
  Pi: "Π",
  rho: "ρ",
  sigma: "σ",
  Sigma: "Σ",
  tau: "τ",
  phi: "φ",
  Phi: "Φ",
  chi: "χ",
  psi: "ψ",
  Psi: "Ψ",
  omega: "ω",
  Omega: "Ω",
};

const SYMBOL_MAP: Record<string, string> = {
  cdot: "·",
  cdots: "…",
  dots: "…",
  ldots: "…",
  times: "×",
  div: "÷",
  pm: "±",
  mp: "∓",
  leq: "≤",
  geq: "≥",
  le: "≤",
  ge: "≥",
  neq: "≠",
  approx: "≈",
  equiv: "≡",
  infty: "∞",
  infin: "∞",
  sum: "∑",
  prod: "∏",
  int: "∫",
  rightarrow: "→",
  Rightarrow: "⇒",
  to: "→",
  leftarrow: "←",
  Leftarrow: "⇐",
  leftrightarrow: "↔",
  angle: "∠",
  degree: "°",
  deg: "°",
  circ: "°",
  in: "∈",
  notin: "∉",
  subset: "⊂",
  supset: "⊃",
  cup: "∪",
  cap: "∩",
  emptyset: "∅",
  forall: "∀",
  exists: "∃",
  partial: "∂",
  nabla: "∇",
  sqrt: "√",
};

/**
 * Strip `$...$`, `\(...\)`, `\[...\]` delimiters but keep the content.
 */
function stripMathDelimiters(text: string): string {
  return text
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, inner) => inner)
    .replace(/\$([^\n$]+?)\$/g, (_, inner) => inner)
    .replace(/\\\(([^]+?)\\\)/g, (_, inner) => inner)
    .replace(/\\\[([^]+?)\\\]/g, (_, inner) => inner);
}

function rewriteFractions(text: string): string {
  // Run a few passes to handle nested \frac{...}{...}
  let prev: string;
  let out = text;
  let safety = 0;
  do {
    prev = out;
    out = out.replace(
      /\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g,
      (_, num, den) => `(${num.trim()}) / (${den.trim()})`
    );
    safety++;
  } while (out !== prev && safety < 5);
  return out;
}

function rewriteSqrt(text: string): string {
  return text.replace(
    /\\sqrt\s*\{([^{}]+)\}/g,
    (_, inner) => `√(${inner.trim()})`
  );
}

function rewriteExponents(text: string): string {
  // x^{ab} / x^{-1} → x with super-script
  let out = text.replace(/\^\{([^{}]+)\}/g, (_, inner) => toSuperscript(inner));
  // x^2, x^-3 (no braces)
  out = out.replace(/\^(-?\d)/g, (_, d) => toSuperscript(d));
  return out;
}

function rewriteSubscripts(text: string): string {
  // Keep subscripts readable: x_1 → x₁, x_{10} → x_(10)
  const SUB: Record<string, string> = {
    "0": "₀",
    "1": "₁",
    "2": "₂",
    "3": "₃",
    "4": "₄",
    "5": "₅",
    "6": "₆",
    "7": "₇",
    "8": "₈",
    "9": "₉",
  };
  let out = text.replace(/_\{([^{}]+)\}/g, (_, inner) => {
    let mapped = "";
    for (const ch of inner) {
      if (SUB[ch] === undefined) return `_(${inner})`;
      mapped += SUB[ch];
    }
    return mapped;
  });
  out = out.replace(/_(\d)/g, (_, d) => SUB[d] ?? `_${d}`);
  return out;
}

function rewriteNamedCommands(text: string): string {
  // \alpha, \cdot, \sum… (word boundary or non-letter after)
  return text.replace(/\\([a-zA-Z]+)/g, (whole, name: string) => {
    if (name in GREEK_MAP) return GREEK_MAP[name];
    if (name in SYMBOL_MAP) return SYMBOL_MAP[name];
    // Strip \left \right \displaystyle \text etc — they carry no semantic content here
    if (
      name === "left" ||
      name === "right" ||
      name === "bigl" ||
      name === "bigr" ||
      name === "Bigl" ||
      name === "Bigr" ||
      name === "displaystyle" ||
      name === "textstyle"
    ) {
      return "";
    }
    if (name === "text" || name === "mathrm" || name === "mathbf") {
      return ""; // the brace content will be handled separately
    }
    return whole;
  });
}

function rewriteTextBraces(text: string): string {
  // \text{abc}, \mathrm{abc} — already stripped command, now unwrap braces
  return text.replace(/([^\\])\{([^{}]+)\}/g, (m, prefix, inner) => {
    // keep braces if the previous char is a backslash (still a command) — shouldn't happen here
    return `${prefix}${inner}`;
  });
}

export function sanitizeMath(input: string): string {
  if (!input) return input;
  let out = stripMathDelimiters(input);
  out = rewriteFractions(out);
  out = rewriteSqrt(out);
  out = rewriteExponents(out);
  out = rewriteSubscripts(out);
  out = rewriteNamedCommands(out);
  out = rewriteTextBraces(out);
  // tidy up double spaces created by stripping commands
  out = out.replace(/[ \t]{2,}/g, " ");
  return out;
}
