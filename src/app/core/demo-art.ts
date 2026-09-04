const DEMO_ART = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
  <rect width="1200" height="900" fill="#e9e5df"/>
  <rect x="72" y="72" width="1056" height="756" fill="#fffdf9" stroke="#111111" stroke-width="3"/>
  <circle cx="866" cy="314" r="218" fill="#f2b24d"/>
  <circle cx="866" cy="314" r="132" fill="#3346b8"/>
  <circle cx="866" cy="314" r="54" fill="#f5dfb0"/>
  <rect x="206" y="210" width="360" height="360" fill="#1d7d70"/>
  <rect x="250" y="254" width="272" height="272" fill="#f2d9cf"/>
  <path d="M206 650H994" stroke="#111111" stroke-width="4"/>
  <path d="M206 650L360 566L490 650" fill="none" stroke="#df6658" stroke-width="14"/>
  <text x="206" y="706" font-family="Arial, sans-serif" font-size="30" letter-spacing="5" fill="#111111">CREATION / STUDY 01</text>
  <text x="206" y="758" font-family="Arial, sans-serif" font-size="18" letter-spacing="2" fill="#88847d">A QUIET IMAGE WORKBENCH</text>
</svg>`;

export const DEMO_ART_DATA_URL = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(DEMO_ART)}`;

export function createDemoGeneratedImage(prompt: string): string {
  const safePrompt = prompt.slice(0, 42).replace(/[<&>]/g, '');
  const art = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="768" viewBox="0 0 1024 768">
    <rect width="1024" height="768" fill="#000000"/>
    <rect x="56" y="56" width="912" height="656" fill="#ffffff"/>
    <path d="M56 540L326 270L512 456L700 190L968 458V712H56Z" fill="#bebebe"/>
    <circle cx="744" cy="246" r="86" fill="#000000"/>
    <path d="M56 600H968" stroke="#000000" stroke-width="3"/>
    <text x="104" y="650" font-family="Arial, sans-serif" font-size="23" letter-spacing="4" fill="#000000">AI STUDY / DEMO MODE</text>
    <text x="104" y="684" font-family="Arial, sans-serif" font-size="15" letter-spacing="1" fill="#bebebe">${safePrompt}</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(art)}`;
}
