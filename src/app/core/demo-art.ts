// Keep the supplied editorial portrait as the initial canvas image and reset target.
export const DEMO_ART_DATA_URL = '/assets/demo-image.png';

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
