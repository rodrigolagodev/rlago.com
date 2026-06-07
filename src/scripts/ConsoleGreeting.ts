export function initConsoleGreeting(): void {
  const ascii = [
    '██╗  ██╗███████╗██╗     ██╗      ██████╗ ██╗',
    '██║  ██║██╔════╝██║     ██║     ██╔═══██╗██║',
    '███████║█████╗  ██║     ██║     ██║   ██║██║',
    '██╔══██║██╔══╝  ██║     ██║     ██║   ██║╚═╝',
    '██║  ██║███████╗███████╗███████╗╚██████╔╝██╗',
    '╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝ ╚═════╝ ╚═╝',
  ].join('\n');

  const styles = {
    art: 'color: #6366f1; font-weight: bold;',
    name: 'color: #fff; font-size: 13px; font-weight: bold;',
    accent: 'color: #a3a3a3; font-size: 11px;',
    link: 'color: #6366f1; font-size: 11px;',
    dim: 'color: #525252; font-size: 10px;',
  };

  const lines = [
    { text: `%c${ascii}`, style: styles.art },
    { text: '%c  Rodrigo Lago  ', style: styles.name },
    { text: '%c  UX Engineer  ', style: styles.accent },
    { text: '' },
    { text: '%c  hi@rlago.com  ', style: styles.accent },
    { text: '%c  github.com/rodrigolagodev  ', style: styles.link },
    { text: '%c  linkedin.com/in/rnlago  ', style: styles.link },
    { text: '' },
    { text: '%c  Built with Astro, vanilla TS & pure CSS.  ', style: styles.dim },
    { text: '%c  No React. No Tailwind. No regrets.  ', style: styles.dim },
    { text: '' },
    { text: '%c  🖐️  Thanks for peeking under the hood!  ', style: styles.accent },
  ];

  const formatted = lines.map(l => l.text).join('\n');
  const args = lines.map(l => l.style).filter(Boolean);

  console.log(formatted, ...args);
}
