import type React from "react";

type SvgProps = React.SVGProps<SVGSVGElement>;

const common: SvgProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 18 18",
  xmlns: "http://www.w3.org/2000/svg",
  role: "img",
  focusable: "false",
  "aria-hidden": true,
};

export function FlagItaly(props: SvgProps) {
  return (
    <svg {...common} {...props}>
      <rect width="18" height="18" rx="4" fill="#fff" />
      <rect x="0" y="0" width="6" height="18" rx="4" fill="#009246" />
      <rect x="12" y="0" width="6" height="18" rx="4" fill="#CE2B37" />
    </svg>
  );
}

export function FlagUK(props: SvgProps) {
  return (
    <svg {...common} {...props}>
      <rect width="18" height="18" rx="4" fill="#012169" />
      <path
        d="M0 2.2V0h2.2L18 15.8V18h-2.2L0 2.2Z"
        fill="#FFF"
        opacity="0.95"
      />
      <path d="M18 2.2V0h-2.2L0 15.8V18h2.2L18 2.2Z" fill="#FFF" opacity="0.95" />
      <path
        d="M0 3.6V0h3.6L18 14.4V18h-3.6L0 3.6Z"
        fill="#C8102E"
        opacity="0.9"
      />
      <path
        d="M18 3.6V0h-3.6L0 14.4V18h3.6L18 3.6Z"
        fill="#C8102E"
        opacity="0.9"
      />
      <rect x="0" y="7" width="18" height="4" fill="#FFF" />
      <rect x="7" y="0" width="4" height="18" fill="#FFF" />
      <rect x="0" y="7.8" width="18" height="2.4" fill="#C8102E" />
      <rect x="7.8" y="0" width="2.4" height="18" fill="#C8102E" />
    </svg>
  );
}

export function FlagFrance(props: SvgProps) {
  return (
    <svg {...common} {...props}>
      <rect width="18" height="18" rx="4" fill="#fff" />
      <rect x="0" y="0" width="6" height="18" rx="4" fill="#0055A4" />
      <rect x="12" y="0" width="6" height="18" rx="4" fill="#EF4135" />
    </svg>
  );
}

export function FlagSpain(props: SvgProps) {
  return (
    <svg {...common} {...props}>
      <rect width="18" height="18" rx="4" fill="#AA151B" />
      <rect x="0" y="4.5" width="18" height="9" fill="#F1BF00" />
    </svg>
  );
}

export function FlagGermany(props: SvgProps) {
  return (
    <svg {...common} {...props}>
      <rect width="18" height="18" rx="4" fill="#000" />
      <rect x="0" y="6" width="18" height="6" fill="#DD0000" />
      <rect x="0" y="12" width="18" height="6" rx="4" fill="#FFCE00" />
    </svg>
  );
}

export function FlagSaudi(props: SvgProps) {
  return (
    <svg {...common} {...props}>
      <rect width="18" height="18" rx="4" fill="#0B7D3B" />
      <rect x="3" y="10.8" width="12" height="1.4" rx="0.7" fill="#fff" opacity="0.95" />
      <rect x="6" y="9.8" width="6" height="0.7" rx="0.35" fill="#fff" opacity="0.95" />
    </svg>
  );
}

export function FlagChina(props: SvgProps) {
  return (
    <svg {...common} {...props}>
      <rect width="18" height="18" rx="4" fill="#DE2910" />
      <path
        d="M6.2 4.1l.6 1.8h1.9L7.1 7l.6 1.8-1.5-1.1-1.5 1.1L5.3 7 3.8 5.9h1.9l.5-1.8Z"
        fill="#FFDE00"
      />
    </svg>
  );
}

