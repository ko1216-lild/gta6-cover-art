// Fixed scenes for screenshots: ?shot=editor shows the page with a sample photo; ?shot=cover shows the cover alone.
// `photo` picks the sample (samples/<photo>.jpg) and `caption` the words. Optional extras the capture may pass:
// `subtitle`, `layout`, `grade`, `size` (e.g. 1080x1350) and `pos`. window.__shotReady is set once painted.
export async function runShot(shot, query, setup) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const opts = {
    photo: query.get('photo') ?? 'pier',
    caption: query.get('caption') ?? 'Sunset Heist',
    subtitle: query.get('subtitle') ?? '',
    layout: query.get('layout') ?? undefined,
    grade: query.get('grade') ?? undefined,
    size: query.get('size') ?? undefined,
    pos: query.get('pos') ?? undefined,
  };
  // Editor shots show a richer scene so the whole tool is visible at work.
  if (shot === 'editor' && !query.get('layout')) opts.layout = 'classic';
  if (shot === 'editor' && !query.get('subtitle')) opts.subtitle = 'Vice City Nights';
  await setup(opts);
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
