const paths = {
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  external: 'M14 3h7v7m0-7L10 14M10 3H4a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-6',
  home: 'm3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z',
  calendar: 'M8 2v4m8-4v4M3 10h18M4 4h16a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1m3 10h3m4 0h3m-10 4h3',
  ticket: 'M3 5h18v5a2 2 0 0 0 0 4v5H3v-5a2 2 0 0 0 0-4zm12 0v3m0 3v2m0 3v3',
  send: 'm22 2-7 20-4-9L2 9zm0 0L11 13',
  user: 'M20 21v-2a7 7 0 0 0-14 0v2zm-3-14a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  bot: 'M12 2v3m-6 0h12a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3M8 10v3m8-3v3m-7 4h6M1 10v5m22-5v5',
  search: 'M21 21l-5-5m2-6a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  pin: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0m-5 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  clock: 'M12 8v5l3 2m7-3a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  star: 'm12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z',
  game: 'M7 8h10c3 0 5 10 4 12-1 2-5-3-6-3H9c-1 0-5 5-6 3C2 18 4 8 7 8zm1 3v5m-2-3h4m6-1h.01m2 3h.01M9 8l1-3h4l1 3',
  anime: 'm4 10-1-7 7 4h4l7-4-1 7v7l-8 5-8-5zm4 3h1m6 0h1m-6 4h4',
  mask: 'M2 5c5 0 6 3 10 3s5-3 10-3l-2 12-5 4-3-3-3 3-5-4zm4 6 4 2m4 0 4-2',
  planet: 'M18 7a8 8 0 1 0-11 11M7 6a8 8 0 0 1 11 11M3 19c-5-5 14-22 19-17S8 24 3 19',
  grid: 'M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z',
  check: 'm5 12 4 4L19 6',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
  menu: 'M3 6h18M3 12h18M3 18h18',
  close: 'm6 6 12 12M6 18 18 6',
  play: 'm8 4 13 8-13 8z',
  shield: 'm12 2 9 4v6c0 6-9 10-9 10S3 18 3 12V6zm-5 10 3 3 7-7',
  info: 'M12 11v6m0-10h.01m10 5a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  refresh: 'M20 7A9 9 0 1 0 21 15M20 2v5h-5',
  copy: 'M9 9h12v12H9zM15 5V2H2v13h3',
  logout: 'M9 3H3v18h6m-1-9h14m-5-5 5 5-5 5',
};

export default function Icon({ name, size = 20, ...props }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name] || paths.star} /></svg>;
}
