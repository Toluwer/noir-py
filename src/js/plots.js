let PLOTS = [], pwIx = 0, plotsSeen = false;

function sweepMpl(){
  const known = new Set(['app', 'palette', 'ai-modal', 'toasts', 'about-modal', 'file-pick', 'context-view']);
  document.querySelectorAll('[class*="mpl-"]').forEach(n => {
    let p = n;
    while (p.parentElement && p.parentElement !== document.body) p = p.parentElement;
    if (p.parentElement === document.body && !known.has(p.id)) p.remove();
  });
}

function capturePlots(){
  sweepMpl();
  if (!S.pyReady) return;
  const d = py('plots');
  const figs = (d && d.figs) || [];
  if (!figs.length) return;
  PLOTS = figs;
  if (S.view === 'plots') renderPlots();
  if (!plotsSeen){
    plotsSeen = true;
    setView('plots');
    toast('Figure Captured');
  }
}

function renderPlots(){
  pvList.textContent = '';
  if (!PLOTS.length){
    pvList.dataset.empty = 'No Plots Yet — Figures Appear Here After Each Run';
    return;
  }
  PLOTS.forEach((p, i) => {
    const item = h('div', 'pv-item');
    item.title = 'Open Figure ' + p.n;
    const img = h('img');
    img.src = 'data:image/png;base64,' + p.png;
    img.alt = 'Figure ' + p.n;
    item.appendChild(img);
    const cap = h('div', 'pv-cap');
    cap.appendChild(h('span', null, 'Figure ' + p.n));
    cap.appendChild(h('span', null, Math.round(p.png.length * 3 / 4 / 1024) + ' KB'));
    item.appendChild(cap);
    item.addEventListener('click', () => openPlot(i));
    pvList.appendChild(item);
  });
}

function openPlot(i){
  if (!PLOTS.length) return;
  if (!diffWrap.hidden) closeDiff();
  pwIx = Math.max(0, Math.min(i, PLOTS.length - 1));
  const p = PLOTS[pwIx];
  pwImg.src = 'data:image/png;base64,' + p.png;
  pwLabel.textContent = 'Figure ' + p.n + ' · ' + (pwIx + 1) + ' / ' + PLOTS.length;
  pwBody.classList.remove('actual');
  pwPrev.disabled = pwIx === 0;
  pwNext.disabled = pwIx === PLOTS.length - 1;
  plotWrap.hidden = false;
}

function closePlot(){
  plotWrap.hidden = true;
  pwImg.src = '';
}

function stepPlot(d){
  openPlot(pwIx + d);
}

function togglePlotSize(){
  pwBody.classList.toggle('actual');
}

function downloadPlot(){
  const p = PLOTS[pwIx];
  if (!p) return;
  const a = document.createElement('a');
  a.href = 'data:image/png;base64,' + p.png;
  a.download = 'figure-' + p.n + '.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
  toast('Downloaded figure-' + p.n + '.png');
}

$('pv-clear').addEventListener('click', () => {
  PLOTS = [];
  renderPlots();
  if (!plotWrap.hidden) closePlot();
});
pwPrev.addEventListener('click', () => stepPlot(-1));
pwNext.addEventListener('click', () => stepPlot(1));
pwSize.addEventListener('click', togglePlotSize);
$('pw-dl').addEventListener('click', downloadPlot);
$('pw-close').addEventListener('click', closePlot);

