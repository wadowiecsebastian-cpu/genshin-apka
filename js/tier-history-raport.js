document.addEventListener('DOMContentLoaded', function () {
  if (!window.tierHistory) {
    console.error('tier-history-raport.js: window.tierHistory is missing.');
    return;
  }

  // Base mapping used by tier-history.js (letters -> numeric 0–5)
  const ratingMap = { 'D': 0, 'C': 1, 'B': 2, 'A': 3, 'S': 4, 'SS': 5 };

  function versionCompare(a, b) {
    const [aMaj, aMin] = a.split('.').map(Number);
    const [bMaj, bMin] = b.split('.').map(Number);
    if (aMaj !== bMaj) return aMaj - bMaj;
    return (aMin || 0) - (bMin || 0);
  }

  function ratingToNumber(r) {
    return ratingMap[r] != null ? ratingMap[r] : null;
  }

  // Trend type (now in English)
  function trendFromSequence(nums) {
    if (!nums.length) return 'stable';
    const unique = Array.from(new Set(nums));
    if (unique.length === 1) return 'stable';

    let nonDecreasing = true;
    let nonIncreasing = true;
    for (let i = 1; i < nums.length; i++) {
      if (nums[i] < nums[i - 1]) nonDecreasing = false;
      if (nums[i] > nums[i - 1]) nonIncreasing = false;
    }
    const delta = nums[nums.length - 1] - nums[0];
    if (delta > 0 && nonDecreasing) return 'rising';
    if (delta < 0 && nonIncreasing) return 'falling';
    return 'volatile';
  }

  function longestSSStreak(nums) {
    let best = 0;
    let current = 0;
    for (let i = 0; i < nums.length; i++) {
      if (nums[i] === 5) {
        current++;
        if (current > best) best = current;
      } else {
        current = 0;
      }
    }
    return best;
  }

  function average(arr) {
    if (!arr.length) return 0;
    let sum = 0;
    for (let i = 0; i < arr.length; i++) sum += arr[i];
    return sum / arr.length;
  }

  // Numeric formatting for statistics
  function formatNumber(x) {
    return x.toFixed(2);
  }

  // Mapping back from numeric 0–5 to D/C/B/A/S/SS for display
  const ratingLevelsNumeric = [0, 1, 2, 3, 4, 5];
  const ratingLevelsLetters = ['D', 'C', 'B', 'A', 'S', 'SS'];

  function numberToRatingLetter(value) {
    if (value == null || isNaN(value)) return '';
    let bestIndex = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < ratingLevelsNumeric.length; i++) {
      const diff = Math.abs(value - ratingLevelsNumeric[i]);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIndex = i;
      }
    }
    return ratingLevelsLetters[bestIndex];
  }

  function slugify(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  // --- 1. Character data processing ---

  const characters = [];
  const versionMap = {}; // version -> [ratingNumeric]

  Object.keys(window.tierHistory).forEach(function (name) {
    const raw = window.tierHistory[name];
    const history = raw.history || {};
    const versions = Object.keys(history).sort(versionCompare);
    if (!versions.length) return;

    const nums = [];
    versions.forEach(function (ver) {
      const r = history[ver] && history[ver].rating;
      const n = ratingToNumber(r);
      if (n == null) return;
      nums.push(n);

      if (!versionMap[ver]) versionMap[ver] = [];
      versionMap[ver].push(n);
    });

    if (!nums.length) return;

    const firstVersion = versions[0];
    const lastVersion = versions[versions.length - 1];
    const firstRating = history[firstVersion].rating;
    const lastRating = history[lastVersion].rating;
    const avgNumeric = average(nums);
    const trend = trendFromSequence(nums);
    const netChange = nums[nums.length - 1] - nums[0];
    const ssStreak = longestSSStreak(nums);

    characters.push({
      name: name,
      rarity: raw.rarity || '',
      weapon: raw.weapon || '',
      element: raw.element || '',
      role: raw.role || '',
      debut: raw.debiut || firstVersion,
      versions: versions,
      nums: nums,
      firstVersion: firstVersion,
      lastVersion: lastVersion,
      firstRating: firstRating,
      lastRating: lastRating,
      avgNumeric: avgNumeric,
      trend: trend,
      netChange: netChange,
      ssStreak: ssStreak
    });
  });

  characters.sort(function (a, b) {
    return a.name.localeCompare(b.name, 'pl');
  });

  const allVersionLabels = Object.keys(versionMap).sort(versionCompare);
  const globalAvgValues = allVersionLabels.map(function (ver) {
    return average(versionMap[ver] || []);
  });
  const globalAvgOverall = average(globalAvgValues);
  const globalMin = Math.min.apply(null, globalAvgValues);
  const globalMax = Math.max.apply(null, globalAvgValues);

  const rarityCounts = {};
  const roleCounts = {};
  const elementBuckets = {};
  const trendCounts = { 'rising': 0, 'falling': 0, 'stable': 0, 'volatile': 0 };

  characters.forEach(function (c) {
    rarityCounts[c.rarity] = (rarityCounts[c.rarity] || 0) + 1;
    roleCounts[c.role] = (roleCounts[c.role] || 0) + 1;
    if (!elementBuckets[c.element]) elementBuckets[c.element] = [];
    elementBuckets[c.element].push(c.avgNumeric);
    trendCounts[c.trend] = (trendCounts[c.trend] || 0) + 1;
  });

  const elementLabels = Object.keys(elementBuckets);
  const elementValues = elementLabels.map(function (el) {
    return average(elementBuckets[el]);
  });

  // Top lists
  const topAverage = characters
    .slice()
    .sort(function (a, b) {
      if (b.avgNumeric !== a.avgNumeric) return b.avgNumeric - a.avgNumeric;
      return a.name.localeCompare(b.name, 'pl');
    })
    .slice(0, 10);

  const ssStreakTop = characters
    .filter(function (c) { return c.ssStreak > 0; })
    .slice()
    .sort(function (a, b) {
      if (b.ssStreak !== a.ssStreak) return b.ssStreak - a.ssStreak;
      return b.avgNumeric - a.avgNumeric;
    })
    .slice(0, 10);

  const buffsTop = characters
    .filter(function (c) { return c.netChange > 0; })
    .slice()
    .sort(function (a, b) {
      if (b.netChange !== a.netChange) return b.netChange - a.netChange;
      return b.avgNumeric - a.avgNumeric;
    })
    .slice(0, 10);

  const nerfsTop = characters
    .filter(function (c) { return c.netChange < 0; })
    .slice()
    .sort(function (a, b) {
      if (a.netChange !== b.netChange) return a.netChange - b.netChange;
      return a.avgNumeric - b.avgNumeric;
    })
    .slice(0, 10);

  // --- 2. Simple canvas chart helpers ---

  function prepareCanvas(canvas) {
    if (!canvas) return null;
    const parentWidth = canvas.clientWidth || canvas.parentNode.clientWidth || 800;
    const height = canvas.getAttribute('data-height') ?
      parseInt(canvas.getAttribute('data-height'), 10) : 260;
    canvas.width = parentWidth;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return ctx;
  }

  function drawAxes(ctx, opts) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    const padding = opts.padding || { left: 40, right: 10, top: 20, bottom: 35 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    ctx.fillStyle = '#101010';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;

    // X axis
    ctx.beginPath();
    ctx.moveTo(padding.left, h - padding.bottom);
    ctx.lineTo(w - padding.right, h - padding.bottom);
    ctx.stroke();

    // Y axis
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, h - padding.bottom);
    ctx.stroke();

    return { padding: padding, chartW: chartW, chartH: chartH };
  }

  function drawLineChart(canvasId, labels, values, options) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !labels.length || !values.length) return;
    const ctx = prepareCanvas(canvas);
    if (!ctx) return;

    const padding = { left: 40, right: 12, top: 20, bottom: 40 };
    const base = drawAxes(ctx, { padding: padding });
    const chartW = base.chartW;
    const chartH = base.chartH;
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    const minVal = options && typeof options.minY === 'number'
      ? options.minY
      : Math.min.apply(null, values);
    const maxVal = options && typeof options.maxY === 'number'
      ? options.maxY
      : Math.max.apply(null, values);
    const range = (maxVal - minVal) || 1;

    const isRatingScale = options && options.ratingScale;

    // horizontal grid lines + Y labels
    ctx.strokeStyle = '#333';
    ctx.fillStyle = '#888';
    ctx.lineWidth = 1;
    const steps = options && options.ySteps ? options.ySteps : 6;
    for (let i = 0; i <= steps; i++) {
      const v = minVal + (range * i) / steps;
      const y = padding.top + chartH - (chartH * (v - minVal)) / range;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartW, y);
      ctx.stroke();
      ctx.font = '11px Segoe UI, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      let labelText;
      if (isRatingScale) {
        labelText = numberToRatingLetter(v); // D / C / B / A / S / SS
      } else {
        labelText = v.toFixed(1);
      }
      ctx.fillText(labelText, padding.left - 4, y);
    }

    // line
    ctx.strokeStyle = '#ffcc33';
    ctx.lineWidth = 2;
    ctx.beginPath();
    labels.forEach(function (lab, idx) {
      const x = padding.left + (chartW * (labels.length === 1 ? 0.5 : idx / (labels.length - 1)));
      const y = padding.top + chartH - (chartH * (values[idx] - minVal)) / range;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // points
    ctx.fillStyle = '#ffcc33';
    labels.forEach(function (lab, idx) {
      const x = padding.left + (chartW * (labels.length === 1 ? 0.5 : idx / (labels.length - 1)));
      const y = padding.top + chartH - (chartH * (values[idx] - minVal)) / range;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // version labels on X axis
    ctx.fillStyle = '#ccc';
    ctx.font = '10px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const stepLabel = labels.length > 16 ? 3 : (labels.length > 10 ? 2 : 1);
    labels.forEach(function (lab, idx) {
      if (idx % stepLabel !== 0 && idx !== labels.length - 1) return;
      const x = padding.left + (chartW * (labels.length === 1 ? 0.5 : idx / (labels.length - 1)));
      const y = h - padding.bottom + 4;
      ctx.fillText(lab, x, y);
    });
  }

  function drawBarChart(canvasId, labels, values, options) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !labels.length || !values.length) return;
    const ctx = prepareCanvas(canvas);
    if (!ctx) return;

    const padding = { left: 40, right: 12, top: 20, bottom: 40 };
    const base = drawAxes(ctx, { padding: padding });
    const chartW = base.chartW;
    const chartH = base.chartH;
    const h = ctx.canvas.height;

    const isRatingScale = options && options.ratingScale;

    const minVal = 0;
    const maxVal = isRatingScale ? 5 : (Math.max.apply(null, values) || 1);
    const range = maxVal - minVal;

    ctx.strokeStyle = '#333';
    ctx.fillStyle = '#888';
    const steps = options && options.ySteps ? options.ySteps : 5;
    for (let i = 0; i <= steps; i++) {
      const v = minVal + (range * i) / steps;
      const y = padding.top + chartH - (chartH * (v - minVal)) / range;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartW, y);
      ctx.stroke();
      ctx.font = '11px Segoe UI, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      let labelText;
      if (isRatingScale) {
        labelText = numberToRatingLetter(v);
      } else {
        labelText = v.toFixed(0);
      }
      ctx.fillText(labelText, padding.left - 4, y);
    }

    const barCount = labels.length;
    const barWidth = chartW / (barCount * 1.5);
    const gap = barWidth / 2;

    labels.forEach(function (lab, idx) {
      const value = values[idx];
      const x = padding.left + gap + idx * (barWidth + gap);
      const barH = (chartH * (value - minVal)) / range;
      const y = padding.top + chartH - barH;

      ctx.fillStyle = '#f5a623';
      ctx.fillRect(x, y, barWidth, barH);

      ctx.fillStyle = '#ccc';
      ctx.font = '10px Segoe UI, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(lab, x + barWidth / 2, h - padding.bottom + 4);
    });
  }

  // --- 3. Text content and tables ---

  const globalAvgSummary = document.getElementById('global-avg-summary');
  if (globalAvgSummary) {
    const avgLetter = numberToRatingLetter(globalAvgOverall);
    const minLetter = numberToRatingLetter(globalMin);
    const maxLetter = numberToRatingLetter(globalMax);

    globalAvgSummary.textContent =
      'Global average rating over the analysed period is around ' + avgLetter +
      ' (approx. ' + formatNumber(globalAvgOverall) + ' internally). ' +
      'Lowest patch averages are close to ' + minLetter +
      ' and the highest ones approach ' + maxLetter + '.';
  }

  const elementSummary = document.getElementById('element-avg-summary');
  if (elementSummary) {
    const pairs = elementLabels
      .map(function (el, idx) {
        const v = elementValues[idx];
        const letter = numberToRatingLetter(v);
        return el + ': ' + letter + ' (' + formatNumber(v) + ')';
      })
      .join(' | ');
    elementSummary.textContent = 'Average rating by element (D–SS): ' + pairs + '.';
  }

  const trendSummary = document.getElementById('trend-summary');
  if (trendSummary) {
    trendSummary.textContent =
      'Trend types: rising: ' + (trendCounts['rising'] || 0) +
      ' characters | falling: ' + (trendCounts['falling'] || 0) +
      ' characters | stable: ' + (trendCounts['stable'] || 0) +
      ' characters | volatile: ' + (trendCounts['volatile'] || 0) + ' characters.';
  }

  function fillTable(tableId, headerCells, rows) {
    const table = document.getElementById(tableId);
    if (!table) return;
    table.innerHTML = '';
    const thead = document.createElement('thead');
    const trHead = document.createElement('tr');
    headerCells.forEach(function (text) {
      const th = document.createElement('th');
      th.textContent = text;
      trHead.appendChild(th);
    });
    thead.appendChild(trHead);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    rows.forEach(function (row) {
      const tr = document.createElement('tr');
      row.forEach(function (cell) {
        const td = document.createElement('td');
        td.textContent = cell;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
  }

  // Top 10 by average rating
  fillTable(
    'table-top-average',
    ['Character', 'Rarity', 'Role', 'Average rating (D–SS)', 'Trend'],
    topAverage.map(function (c) {
      const letter = numberToRatingLetter(c.avgNumeric);
      return [
        c.name,
        c.rarity,
        c.role,
        letter + ' (' + formatNumber(c.avgNumeric) + ')',
        c.trend
      ];
    })
  );

  // Longest SS streaks
  fillTable(
    'table-ss-streaks',
    ['Character', 'SS streak length (versions)', 'Average rating (D–SS)'],
    ssStreakTop.map(function (c) {
      const letter = numberToRatingLetter(c.avgNumeric);
      return [
        c.name,
        String(c.ssStreak),
        letter + ' (' + formatNumber(c.avgNumeric) + ')'
      ];
    })
  );

  // Biggest buffs
  fillTable(
    'table-buffs',
    ['Character', 'Net change (tiers)', 'Initial rating', 'Current rating'],
    buffsTop.map(function (c) {
      return [
        c.name,
        '+' + formatNumber(c.netChange),
        c.firstRating + ' (version ' + c.firstVersion + ')',
        c.lastRating + ' (version ' + c.lastVersion + ')'
      ];
    })
  );

  // Biggest nerfs
  fillTable(
    'table-nerfs',
    ['Character', 'Net change (tiers)', 'Initial rating', 'Current rating'],
    nerfsTop.map(function (c) {
      return [
        c.name,
        formatNumber(c.netChange),
        c.firstRating + ' (version ' + c.firstVersion + ')',
        c.lastRating + ' (version ' + c.lastVersion + ')'
      ];
    })
  );

  // Final summary
  const summaryBlock = document.getElementById('report-summary');
  if (summaryBlock) {
    summaryBlock.textContent =
      'The full rating history turns this view into an analytical dashboard for working on the tier list. ' +
      'You can quickly identify legends (long SS streaks), risky characters (strong drops) and units ' +
      'that gradually gain value over multiple patches.';
  }

  // --- 4. Character cards ---

  const profilesContainer = document.getElementById('character-profiles');
  if (profilesContainer) {
    characters.forEach(function (c) {
      const card = document.createElement('article');
      card.className = 'character-card';

      const header = document.createElement('div');
      header.className = 'character-card-header';

      const portrait = document.createElement('img');
      portrait.className = 'character-portrait-report';
      portrait.alt = c.name;
      portrait.src = 'images/characters/' + c.name + '.png';

      const titleWrap = document.createElement('div');
      const h3 = document.createElement('h3');
      h3.textContent = c.name;
      const meta = document.createElement('p');
      meta.className = 'character-meta-line';
      meta.textContent =
        'Role: ' + c.role +
        ' | Element: ' + c.element +
        ' | Rarity: ' + c.rarity;

      titleWrap.appendChild(h3);
      titleWrap.appendChild(meta);

      header.appendChild(portrait);
      header.appendChild(titleWrap);
      card.appendChild(header);

      const details = document.createElement('p');
      details.className = 'character-details-line';
      const avgLetter = numberToRatingLetter(c.avgNumeric);
      details.textContent =
        'Debut: ' + c.debut +
        ' | First rating: ' + c.firstRating + ' (version ' + c.firstVersion + ')' +
        ' | Latest rating: ' + c.lastRating + ' (version ' + c.lastVersion + ')' +
        ' | Average rating: ' + avgLetter + ' (' + formatNumber(c.avgNumeric) + ')' +
        ' | Net change: ' + (c.netChange > 0 ? '+' : '') + formatNumber(c.netChange) +
        ' | Trend: ' + c.trend;

      card.appendChild(details);

      const canvas = document.createElement('canvas');
      canvas.id = 'char-chart-' + slugify(c.name);
      canvas.setAttribute('data-height', '220');
      card.appendChild(canvas);

      profilesContainer.appendChild(card);

      drawLineChart(
        canvas.id,
        c.versions,
        c.nums,
        { minY: 0, maxY: 5, ySteps: 5, ratingScale: true }
      );
    });
  }

  // --- 5. Global charts ---

  // Global average rating over patches (D–SS axis)
  drawLineChart(
    'chart-global-avg',
    allVersionLabels,
    globalAvgValues,
    { minY: 0, maxY: 5, ySteps: 5, ratingScale: true }
  );

  // Rarity distribution (counts)
  const rarityLabels = Object.keys(rarityCounts);
  const rarityValues = rarityLabels.map(function (r) { return rarityCounts[r]; });
  drawBarChart('chart-rarity', rarityLabels, rarityValues, { ySteps: 6 });

  // Role distribution (counts)
  const roleLabels = Object.keys(roleCounts);
  const roleValues = roleLabels.map(function (r) { return roleCounts[r]; });
  drawBarChart('chart-role', roleLabels, roleValues, { ySteps: 6 });

  // Average rating by element (D–SS axis)
  drawBarChart('chart-element-avg', elementLabels, elementValues, { ySteps: 5, ratingScale: true });

  // Trend distribution (counts)
  const trendLabels = ['rising', 'falling', 'stable', 'volatile'];
  const trendValues = trendLabels.map(function (t) { return trendCounts[t] || 0; });
  drawBarChart('chart-trend', trendLabels, trendValues, { ySteps: 6 });

});
