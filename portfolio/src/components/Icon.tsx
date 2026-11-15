const P: Record<string, string> = {
  frame: 'M5 2v16M15 2v16M2 5h16M2 15h16',
  sun: 'M10 3V1.5M10 18.5V17M3 10H1.5M18.5 10H17M5 5 4 4M16 16l-1-1M5 15l-1 1M16 4l-1 1M13.5 10a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z',
  moon: 'M16.5 12.2A7 7 0 0 1 7.8 3.5a7 7 0 1 0 8.7 8.7Z',
  arrow: 'M4 10h12M11 5l5 5-5 5',
  out: 'M7 5h8v8M15 5 5 15',
  grid: 'M3 3h6v6H3zM11 3h6v6h-6zM3 11h6v6H3zM11 11h6v6h-6z',
  list: 'M3 5h14M3 10h14M3 15h14',
  mail: 'M2.5 5h15v10h-15zM2.5 5.5l7.5 5.5 7.5-5.5',
  download: 'M10 3v10M6 9.5l4 4 4-4M3.5 16.5h13',
  plus: 'M10 4v12M4 10h12',
  minus: 'M4 10h12',
  fit: 'M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4',
  copy: 'M7 7h9v10H7zM4 13V3h9',
  check: 'M4 10.5l4 4 8-9',
  trash: 'M4 6h12M8 6V3.5h4V6M5.5 6l.7 10.5h7.6L14.5 6',
  up: 'M10 16V4M5 9l5-5 5 5',
  down: 'M10 4v12M5 11l5 5 5-5',
  eye: 'M1.5 10S4.5 4.5 10 4.5 18.5 10 18.5 10 15.5 15.5 10 15.5 1.5 10 1.5 10ZM12.5 10a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z',
  star: 'M10 2.5l2.3 4.8 5.2.7-3.8 3.6.9 5.2-4.6-2.5-4.6 2.5.9-5.2L2.5 8l5.2-.7z',
  x: 'M5 5l10 10M15 5 5 15',
  file: 'M5 2.5h7l3.5 3.5v11.5H5zM12 2.5V6h3.5',
  user: 'M10 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM3.5 17.5c.6-3.3 3.2-5 6.5-5s5.900 1.7 6.5 5',
  settings: 'M3 6h8M15 6h2M3 14h2M9 14h8M13 4v4M7 12v4',
  layers: 'M10 3 2.5 7 10 11l7.5-4zM2.500 10.5 10 14.5l7.500-4M2.5 14 10 18l7.5-4',
  image: 'M2.5 4h15v12h-15zM2.5 13l4.500-4 4 3.500 2.500-2 4 3.500M13 7.500h.01',
  link: 'M8.500 11.500a3.500 3.500 0 0 0 5 0l3-3a3.500 3.500 0 0 0-5-5l-1 1M11.500 8.500a3.500 3.500 0 0 0-5 0l-3 3a3.500 3.500 0 0 0 5 5l1-1',
  note: 'M3 3h14v9l-5 5H3zM17 12h-5v5',
  print: 'M5.500 7V3h9v4M5.500 14H3V7h14v7h-2.500M5.500 11.500h9V17h-9z',
  work: 'M3 6.500h14v10H3zM7 6.500V4h6v2.500',
  cursor: 'M4 3l12 5.500-5 1.500-2 5z',
  duplicate: 'M7 7h10v10H7zM3 13V3h10',
  drag: 'M7.500 5h.01M12.500 5h.01M7.500 10h.01M12.500 10h.01M7.500 15h.01M12.500 15h.01',
  info: 'M10 17.500a7.500 7.500 0 1 0 0-15 7.500 7.500 0 0 0 0 15ZM10 9v5M10 6.500h.01',
  menu: 'M3 6h14M3 10h14M3 14h14',
};

export type IconName = keyof typeof P;

export function Icon({ name, size = 16 }: { name: string; size?: number }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={P[name] ?? P.frame} />
    </svg>
  );
}

export function LinkedInIcon({ size = 16 }: { size?: number }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M4.5 7.500h2.600V16H4.500zM5.800 3.500a1.500 1.500 0 1 1 0 3 1.500 1.500 0 0 1 0-3ZM8.700 7.500h2.500v1.200c.5-.9 1.500-1.400 2.700-1.400 2.200 0 3.100 1.400 3.100 3.700V16h-2.600v-4.400c0-1.200-.4-1.900-1.400-1.900-1.100 0-1.700.8-1.700 2V16H8.700z" />
    </svg>
  );
}
