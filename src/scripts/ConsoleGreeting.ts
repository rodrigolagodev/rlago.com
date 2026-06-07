export function initConsoleGreeting(): void {
  const styles = {
    accent: 'color: #a3a3a3; font-size: 11px;',
    name: 'color: #fff; font-size: 13px; font-weight: bold;',
    link: 'color: #6366f1; font-size: 11px;',
    dim: 'color: #525252; font-size: 10px;',
    reset: 'font-size: 11px;',
  };

  const lines = [
    { text: '%c  Rodrigo Lago  ', style: 'background: #171717; color: #fff; font-size: 16px; font-weight: bold; padding: 8px 16px; border-radius: 4px;' },
    { text: '%c  UX Engineer  ', style: 'background: #262626; color: #a3a3a3; font-size: 13px; padding: 6px 16px; border-radius: 4px;' },
    { text: '' },
    { text: `%c  hi@rlago.com  `, style: styles.accent },
    { text: `%c  github.com/rodrigolagodev  `, style: styles.link },
    { text: `%c  linkedin.com/in/rnlago  `, style: styles.link },
    { text: '' },
    { text: `%c  Built with Astro, vanilla TS & pure CSS.  `, style: styles.dim },
    { text: `%c  No React. No Tailwind. No regrets.  `, style: styles.dim },
    { text: '' },
    { text: `%c  🖐️  Thanks for peeking under the hood!  `, style: styles.reset },
  ];

  const formatted = lines.map(l => l.text).join('\n');
  const args = lines.map(l => l.style).filter(Boolean);

  console.log(formatted, ...args);
}
