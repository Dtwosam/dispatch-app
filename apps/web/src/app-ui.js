// Arc-focused marketplace UI helpers.
export function applyTheme(el, theme) {
  el.body.classList.toggle("theme-light", theme === "light");
}

export function compactNumber(value) {
  const numeric = Number(value || 0);
  if (Math.abs(numeric) >= 1000000) return `${(numeric / 1000000).toFixed(1).replace(/\.0$/, "")}m`;
  if (Math.abs(numeric) >= 1000) return `${(numeric / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return numeric.toLocaleString();
}

export function formatCurrency(value) {
  const numeric = Number(value || 0);
  const hasFraction = Math.abs(numeric % 1) > 0.000001;
  return `${numeric.toLocaleString(undefined, {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 6 : 0,
  })} USDC`;
}

export function formatPercent(value) {
  const numeric = Number(value || 0);
  return `${Math.round(numeric)}%`;
}

export function formatLatency(value) {
  const numeric = Number(value || 0);
  if (!numeric) return "0ms";
  if (numeric < 1000) return `${Math.round(numeric)}ms`;
  return `${(numeric / 1000).toFixed(1).replace(/\.0$/, "")}s`;
}

export function icon(name, size = 16) {
  const icons = {
    search: `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg>`,
    wallet: `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h11A2.5 2.5 0 0 1 19 7.5V9H5.5A2.5 2.5 0 0 0 3 11.5v-4Z"></path><path d="M3 11.5A2.5 2.5 0 0 1 5.5 9H20a1 1 0 0 1 1 1v6.5A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-5Z"></path><circle cx="17" cy="14" r="1"></circle></svg>`,
    plus: `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"></path><path d="M5 12h14"></path></svg>`,
    spark: `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"></path></svg>`,
    chart: `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V5"></path><path d="M4 19h16"></path><path d="m8 14 3-3 3 2 4-5"></path></svg>`,
    chevron: `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"></path></svg>`,
    pulse: `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l2-5 4 10 2-5h6"></path></svg>`,
  };
  return `<span class="ui-icon" aria-hidden="true">${icons[name] || icons.spark}</span>`;
}

export function updateStatus(el, title, body, tone = "neutral") {
  if (!el.statusToast) return;
  el.statusToast.className = "is-visible";
  el.statusToast.dataset.tone = tone;
  el.statusToast.innerHTML = `<section><strong>${escapeHtml(title)}</strong><p>${escapeHtml(body)}</p></section>`;
  clearTimeout(updateStatus.timeoutId);
  updateStatus.timeoutId = setTimeout(() => {
    el.statusToast.className = "";
    el.statusToast.dataset.tone = "";
    el.statusToast.innerHTML = "";
  }, 5200);
}

export function statusMessage(error, fallback) {
  if (error instanceof Error) {
    if (error.name === "ContractValidationError") {
      return `${error.message}. Dispatch could not prepare this action.`;
    }
    return error.message;
  }
  return fallback;
}

export function requireWallet(state) {
  if (!state.wallet.trim()) {
    throw new Error("Connect a wallet before continuing.");
  }
}

export function setChrome(el, eyebrow, title, sidebarTitle, sidebarLead, progress) {
  if (!el.brandSlot) return;
  el.brandSlot.innerHTML = `
    <div class="brand-mark">D</div>
    <div class="brand-copy">
      <strong>Dispatch</strong>
      <p>USDC-funded AI work on Arc Testnet.</p>
    </div>
  `;
}

export function renderNav(el, routes, isActive, state) {
  const primaryOrder = ["/", "/agents", "/post-task", "/dashboard"];
  const secondaryOrder = ["/connect-agent", "/create-agent"];
  const byPath = new Map(routes);
  const primaryRoutes = primaryOrder.filter((path) => byPath.has(path)).map((path) => [path, byPath.get(path)]);
  const secondaryRoutes = [
    ...secondaryOrder.filter((path) => byPath.has(path)).map((path) => [path, byPath.get(path)]),
    ...routes.filter(([path]) => !primaryOrder.includes(path) && !secondaryOrder.includes(path)),
  ];
  const walletLabel = state.wallet?.trim() ? "Wallet Connected" : "Connect Wallet";
  el.routeList.innerHTML = `
    <div class="nav-shell">
      <nav class="desktop-nav" aria-label="Primary">
        ${primaryRoutes
          .map(([path, label]) => `<a href="${path}" data-route="${path}" ${isActive(path) ? 'aria-current="page"' : ""}>${label}</a>`)
          .join("")}
        <details class="desktop-nav__more">
          <summary>More ${icon("chevron", 14)}</summary>
          <div class="desktop-nav__menu">
            ${secondaryRoutes.map(([path, label]) => `<a href="${path}" data-route="${path}">${label}</a>`).join("")}
          </div>
        </details>
      </nav>
      <button class="mobile-nav-toggle" type="button" data-menu="open" aria-label="Open navigation">
        <span></span><span></span><span></span>
      </button>
    </div>
    <div class="mobile-drawer ${state.mobileNavOpen ? "is-open" : ""}" aria-hidden="${state.mobileNavOpen ? "false" : "true"}">
      <button class="mobile-drawer__backdrop" type="button" data-menu="close" aria-label="Close navigation"></button>
      <aside class="mobile-drawer__panel">
        <div class="mobile-drawer__top">
          <div>
            <p class="mini-label">Navigate</p>
            <strong>Dispatch</strong>
          </div>
          <button type="button" data-menu="close" aria-label="Close navigation">${icon("plus", 14)}</button>
        </div>
        <div class="mobile-drawer__status">
          <span class="network-pill"><span></span>Arc Testnet</span>
          <button class="wallet-action wallet-action--drawer" type="button" data-wallet="open">
            <span class="wallet-action__copy"><strong>${escapeHtml(walletLabel)}</strong></span>
          </button>
        </div>
        <nav class="mobile-drawer__nav" aria-label="Mobile">
          ${[...primaryRoutes, ...secondaryRoutes]
            .map(([path, label]) => `<a href="${path}" data-route="${path}" ${isActive(path) ? 'aria-current="page"' : ""}>${label}</a>`)
            .join("")}
        </nav>
      </aside>
    </div>
  `;
}

export function renderAppFooter(el, routes) {
  if (!el.appFooter) return;
  const footerPaths = ["/", "/agents", "/post-task", "/dashboard", "/connect-agent", "/create-agent"];
  const byPath = new Map(routes);
  const footerRoutes = footerPaths.filter((path) => byPath.has(path)).map((path) => [path, byPath.get(path)]);
  el.appFooter.innerHTML = `
    <div class="app-footer__inner">
      <div class="app-footer__brand">
        <strong>Dispatch</strong>
        <p>AI work marketplace on Arc Testnet.</p>
      </div>
      <nav class="app-footer__links" aria-label="Footer">
        ${footerRoutes.map(([path, label]) => `<button type="button" data-route="${path}">${escapeHtml(label)}</button>`).join("")}
      </nav>
      <span class="app-footer__pill"><span></span>Arc Testnet</span>
    </div>
  `;
}

export function renderTopbar(el, state, shortWallet) {
  const providerLabel = state.walletProviderLabel || "Wallet";
  const walletLabel = state.wallet.trim()
    ? state.walletConnectionType === "injected"
      ? `${providerLabel} ${shortWallet(state.wallet)}`
      : shortWallet(state.wallet)
    : "Connect Wallet";
  const chainMode = state.chainStatusError
    ? "Chain Offline"
    : !state.chainConfig
      ? "Checking Chain"
    : state.chainConfig.chainMode === "browser_wallet"
      ? "Browser Sign"
      : state.chainConfig.chainMode === "server_signer_proxy"
        ? "Server Signer"
        : "Read Only";
  el.topbarActions.innerHTML = `
    <span class="network-pill"><span></span>Arc Testnet</span>
    <button class="wallet-action" data-wallet="open">
      <span class="wallet-action__icon">${icon("wallet", 16)}</span>
      <span class="wallet-action__copy">
        <strong>${escapeHtml(walletLabel)}</strong>
        <small>${escapeHtml(chainMode)}</small>
      </span>
    </button>
  `;
}

export function renderWalletSheet({
  el,
  state,
  shortWallet,
  walletAvailable,
  walletProviderLabel,
  onClose,
  onConnectInjected,
  onDisconnect,
  onSwitchNetwork,
}) {
  const providerLabel = walletProviderLabel || "Rabby";
  const walletNetwork = state.walletNetwork || {};
  const chainMode = state.chainStatusError
    ? "Chain status unavailable"
    : !state.chainConfig
      ? "Checking chain access"
    : state.chainConfig.chainMode === "browser_wallet"
      ? "Browser signing"
      : state.chainConfig.chainMode === "server_signer_proxy"
        ? "Server signer"
        : "Read only";
  el.walletSheet.classList.toggle("open", true);
  const networkLabel = walletNetwork.chainId
    ? (walletNetwork.isArcTestnet ? "Arc Testnet" : `Wrong network (${walletNetwork.chainId})`)
    : "Network not checked";
  const balanceLabel = walletNetwork.usdcBalance == null
    ? "Balance unavailable"
    : `${Number(walletNetwork.usdcBalance).toLocaleString(undefined, { maximumFractionDigits: 6 })} testnet USDC`;
  const connected = Boolean(state.wallet.trim());
  const onArc = Boolean(walletNetwork.isArcTestnet);
  const primaryAction = !connected
    ? `<button class="hero-primary" type="button" id="connectInjectedWallet" ${walletAvailable ? "" : "disabled"}>${walletAvailable ? "Connect wallet" : "No wallet detected"}</button>`
    : !onArc
      ? `<button class="hero-primary" type="button" id="switchArcNetwork">Switch to Arc Testnet</button>`
      : `<div class="wallet-ready-status" role="status"><span class="wallet-status-dot is-ready"></span><strong>Wallet ready</strong></div>`;
  const readinessLabel = !connected
    ? "Connect wallet to continue."
    : !onArc
      ? "Switch to Arc Testnet."
      : walletNetwork.usdcBalance == null
        ? "Balance unavailable."
        : "Wallet ready for Dispatch task funding.";
  el.walletSheet.innerHTML = `
    <div class="wallet-sheet-backdrop" data-wallet="close"></div>
    <div class="wallet-sheet-panel">
      <div class="wallet-sheet-handle"></div>
      <div class="wallet-sheet-header">
        <div>
          <p class="mini-label">Wallet</p>
          <h3>${connected ? "Wallet connected" : "Connect wallet"}</h3>
          <p class="muted">Use Arc Testnet to fund tasks and release USDC after approval.</p>
        </div>
        <button class="wallet-sheet-close" type="button" data-wallet="close" aria-label="Close wallet panel">${icon("plus", 14)}</button>
      </div>

      <div class="wallet-readiness-grid">
        <article class="wallet-readiness-card">
          <div class="wallet-readiness-card__head">
            <span class="wallet-status-dot ${connected ? "is-ready" : "is-pending"}"></span>
            <span>Wallet</span>
          </div>
          <strong>${connected ? "Connected" : "Not connected"}</strong>
          <p>${connected ? `${escapeHtml(shortWallet(state.wallet))} via ${escapeHtml(providerLabel)}` : `Connect ${escapeHtml(providerLabel)} to start funded work.`}</p>
        </article>
        <article class="wallet-readiness-card">
          <div class="wallet-readiness-card__head">
            <span class="wallet-status-dot ${onArc ? "is-ready" : "is-warning"}"></span>
            <span>Network</span>
          </div>
          <strong>${escapeHtml(networkLabel)}</strong>
          <p>${connected && !onArc ? "Switch to Arc Testnet to continue." : escapeHtml(chainMode)}</p>
        </article>
        <article class="wallet-readiness-card">
          <div class="wallet-readiness-card__head">
            <span class="wallet-status-dot ${connected && walletNetwork.usdcBalance != null ? "is-ready" : "is-pending"}"></span>
            <span>Funding</span>
          </div>
          <strong>${escapeHtml(balanceLabel)}</strong>
          <p>${walletNetwork.nativeGasBalance == null ? "Arc Testnet balance appears here when available." : `Gas: ${escapeHtml(Number(walletNetwork.nativeGasBalance).toLocaleString(undefined, { maximumFractionDigits: 6 }))}`}</p>
        </article>
      </div>

      <article class="wallet-session-card wallet-action-card">
        <div class="wallet-session-actions">
          ${primaryAction}
          ${connected ? `<button type="button" id="connectInjectedWallet">${`Reconnect ${escapeHtml(providerLabel)}`}</button>` : ""}
          ${connected ? `<button type="button" id="disconnectWallet">Disconnect</button>` : ""}
          <button type="button" data-wallet="close">Close</button>
        </div>
        <p class="disabled-reason">${escapeHtml(readinessLabel)}</p>
      </article>
      <div class="wallet-sheet-note">
        <span class="live-dot"></span>
        <p>Arc Testnet is used for Dispatch task funding and payment review flows. Testnet USDC has no financial value.</p>
      </div>
    </div>
  `;

  document.getElementById("connectInjectedWallet")?.addEventListener("click", () => {
    onConnectInjected?.();
  });

  document.getElementById("disconnectWallet")?.addEventListener("click", () => {
    onDisconnect?.();
  });

  document.getElementById("switchArcNetwork")?.addEventListener("click", () => {
    onSwitchNetwork?.();
  });

  document.querySelectorAll("[data-wallet='close']").forEach((node) => {
    node.addEventListener("click", onClose);
  });
}

export function closeWalletSheet(el) {
  el.walletSheet.classList.remove("open");
  el.walletSheet.innerHTML = "";
}

export function statusChip(status, subline = "") {
  const lower = String(status || "").toLowerCase();
  const tone = ["approved", "settled", "accepted"].includes(lower)
    ? "good"
    : ["rejected", "refunded", "cancelled", "disputed"].includes(lower)
      ? "warn"
      : "pending";
  return `<div class="status-chip ${tone}">${escapeHtml(labelize(status))}${subline ? ` | ${escapeHtml(labelize(subline))}` : ""}</div>`;
}

export function setButtonLoading(button, loading, text = "") {
  if (!button) return;
  if (loading) {
    if (!button.dataset.originalLabel) button.dataset.originalLabel = button.innerHTML;
    button.disabled = true;
    button.classList.add("is-loading");
    button.innerHTML = `<span class="spinner" aria-hidden="true"></span><span>${escapeHtml(text || "Loading")}</span>`;
    return;
  }
  button.disabled = false;
  button.classList.remove("is-loading");
  if (button.dataset.originalLabel) {
    button.innerHTML = button.dataset.originalLabel;
  }
}

export function speedLabel(agent) {
  const latency = agent.performanceSummary?.averageResponseTimeMs || agent.performanceSummary?.averageLatencyMs || agent.profile.expectedLatencyMsRange.maxMs;
  if (latency <= 12000) return "Fast";
  if (latency <= 28000) return "Balanced";
  return "Deep";
}

export function trustScore(agent) {
  return Math.round(agent.performanceSummary?.rankScore || agent.performanceSummary?.reliabilityScore || 0);
}

export function trendWeight(agent) {
  return agent.performanceSummary?.trend === "up" ? 2 : agent.performanceSummary?.trend === "flat" ? 1 : 0;
}

export function sortAgents(items, state) {
  return [...items].sort((left, right) => {
    if (state.filters.sort === "top_earning") {
      return (right.performanceSummary.totalEarnings || 0) - (left.performanceSummary.totalEarnings || 0);
    }
    if (state.filters.sort === "highest_success") {
      return (right.performanceSummary.successRate || 0) - (left.performanceSummary.successRate || 0)
        || (right.performanceSummary.approvalRate || 0) - (left.performanceSummary.approvalRate || 0)
        || (right.performanceSummary.tasksCompleted || 0) - (left.performanceSummary.tasksCompleted || 0);
    }
    if (state.filters.sort === "fastest") {
      return (left.performanceSummary.averageResponseTimeMs || left.performanceSummary.averageLatencyMs || left.profile.expectedLatencyMsRange.maxMs)
        - (right.performanceSummary.averageResponseTimeMs || right.performanceSummary.averageLatencyMs || right.profile.expectedLatencyMsRange.maxMs);
    }
    return (right.performanceSummary.rankScore || 0) - (left.performanceSummary.rankScore || 0)
      || (right.performanceSummary.successRate || 0) - (left.performanceSummary.successRate || 0)
      || (right.performanceSummary.approvalRate || 0) - (left.performanceSummary.approvalRate || 0)
      || (right.performanceSummary.tasksCompleted || 0) - (left.performanceSummary.tasksCompleted || 0);
  });
}

export function agentStatusLabel(agent) {
  const status = agent.performanceSummary?.status || "new";
  if (status === "active") return "Active";
  if (status === "unavailable") return "Unavailable";
  return "New";
}

export function agentStatusTone(agent) {
  const status = agent.performanceSummary?.status || "new";
  if (status === "active") return "good";
  if (status === "unavailable") return "warn";
  return "pending";
}

export function activityItems(state) {
  const leaders = (state.leaderboards?.buckets || []).flatMap((bucket) => bucket.items.slice(0, 1));
  const tasks = [...(state.tasks?.completedTasks || []), ...(state.tasks?.activeTasks || [])].slice(0, 4);

  return [
    ...leaders.map((item) => `${item.displayName} climbed the leaderboard -> ${formatCurrency(item.totalEarnings || 0)}`),
    ...tasks.map((task) => `${task.title} -> ${labelize(task.status)} -> ${formatCurrency(task.rewardAmount)}`),
  ].slice(0, 6);
}

export function liveActivityEntries(state) {
  const leaders = (state.leaderboards?.buckets || []).flatMap((bucket) => bucket.items.slice(0, 2));
  const tasks = [...(state.tasks?.activeTasks || []), ...(state.tasks?.completedTasks || [])].slice(0, 5);
  return [
    ...leaders.map((item, index) => ({
      id: `leader-${item.agentId || item.displayName}-${index}`,
      tone: item.trend === "up" ? "success" : item.trend === "down" ? "trending" : "neutral",
      headline: `${item.displayName} moved on the leaderboard`,
      detail: `${formatCurrency(item.totalEarnings || 0)} total earnings`,
      meta: item.trend === "up" ? "Ranking up" : item.trend === "down" ? "Cooling off" : "Holding",
    })),
    ...tasks.map((task, index) => ({
      id: `task-${task.taskId || index}`,
      tone: taskStatusTone(task.status),
      headline: task.title,
      detail: `${labelize(task.status)} -> ${formatCurrency(task.rewardAmount)}`,
      meta: task.status === "EXECUTING" ? "Working now" : task.status === "OPEN" ? "Fresh task" : "Recently updated",
    })),
  ].slice(0, 7);
}

export function rankingDeltaLabel(trend, rank) {
  if (trend === "up") return `+${Math.max(1, 4 - Number(rank || 1))}`;
  if (trend === "down") return `-${Math.max(1, Number(rank || 1) - 1)}`;
  return "0";
}

export function taskStatusTone(status) {
  const normalized = String(status || "").toUpperCase();
  if (["APPROVED", "SETTLED", "COMPLETED", "ACCEPTED"].includes(normalized)) return "success";
  if (["DISPUTED", "REJECTED", "FAILED", "REFUNDED"].includes(normalized)) return "trending";
  return "neutral";
}

function stateTitleFromMessage(message, fallback = "Nothing here yet.") {
  const source = String(message || "").trim();
  if (!source) return fallback;
  const firstSentence = source.split(". ")[0]?.trim();
  if (!firstSentence) return fallback;
  return firstSentence.length > 48 ? fallback : firstSentence.replace(/\.$/, ".");
}

export function emptyState(message, options = {}) {
  const title = options.title || stateTitleFromMessage(message);
  const body = options.body || (title === message ? "Updates will appear here when data is available." : message) || "Waiting for update.";
  const variant = options.variant || "empty";
  const inline = options.inline !== false;
  const markClass = inline ? "empty-inline__mark" : "empty-state__mark";
  const className = inline
    ? `empty-inline state-inline state-inline--${escapeHtml(variant)}`
    : `empty-state state-card state-card--${escapeHtml(variant)}`;
  const actionMarkup = options.action
    ? `<div class="empty-state-actions"><button class="${escapeHtml(options.action.className || "hero-secondary")}" ${options.action.route ? `data-route="${escapeHtml(options.action.route)}"` : ""} ${options.action.id ? `id="${escapeHtml(options.action.id)}"` : ""}>${escapeHtml(options.action.label || "Continue")}</button></div>`
    : "";
  return `
    <div class="${className}" role="status">
      <span class="${markClass}">${icon("spark", inline ? 14 : 16)}</span>
      <div>
        <strong>${escapeHtml(title)}</strong>
        ${body ? `<p>${escapeHtml(body)}</p>` : ""}
        ${actionMarkup}
      </div>
    </div>
  `;
}

export function richEmptyState(title, body, actions = [], variant = "empty") {
  return `
    <div class="empty-state state-card state-card--${escapeHtml(variant)}" role="status">
      <span class="empty-state__mark">${icon("spark", 16)}</span>
      <div>
        <strong>${escapeHtml(title)}</strong>
        <p>${escapeHtml(body)}</p>
        ${actions.length ? `<div class="empty-state-actions">${actions.join("")}</div>` : ""}
      </div>
    </div>
  `;
}

export function countMarkup(value, label, className = "") {
  const numeric = Number(value) || 0;
  return `<div class="${className || "metric-card"}"><strong data-count="${numeric}" data-format="${Math.abs(numeric) >= 1000 ? "compact" : "integer"}">${compactNumber(numeric)}</strong><span>${escapeHtml(label)}</span></div>`;
}

export function animateCounters(scope = document) {
  scope.querySelectorAll("[data-count]").forEach((node) => {
    const target = Number(node.dataset.count || 0);
    if (!Number.isFinite(target) || node.dataset.animated === "true") return;
    node.dataset.animated = "true";
    const start = performance.now();
    const duration = 650;
    const from = 0;
    const kind = node.dataset.format || "integer";
    const format = kind === "compact"
      ? (value) => compactNumber(value)
      : kind === "currency"
        ? (value) => formatCurrency(value)
      : target >= 1000
        ? (value) => Math.round(value).toLocaleString()
        : (value) => String(Math.round(value));
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - progress) * (1 - progress);
      node.textContent = format(from + (target - from) * eased);
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

export function compactOutcomeMini(agent) {
  const points = (agent.performanceSummary?.recentOutcomes || []).slice(-5);
  if (!points.length) return `<div class="mini-outcomes empty">No recent outcomes yet</div>`;
  return `
    <div class="mini-outcomes">
      ${points.map((point) => `<span class="mini-outcome ${escapeHtml(point.outcome)}" style="height:${Math.max(16, Math.min(100, point.value))}%"></span>`).join("")}
    </div>
  `;
}

export function dashboardMomentumStrip(agents) {
  if (!agents.length) return "<div class='mini-outcomes empty'>No agent momentum yet</div>";
  return `
    <div class="mini-outcomes">
      ${agents.slice(0, 6).map((agent) => `<span class="mini-outcome approved" style="height:${Math.max(18, Math.min(100, trustScore(agent)))}%"></span>`).join("")}
    </div>
  `;
}

export function taskUrgencyClass(deadline) {
  const delta = new Date(deadline).getTime() - Date.now();
  if (delta <= 6 * 60 * 60 * 1000) return "critical";
  if (delta <= 24 * 60 * 60 * 1000) return "soon";
  return "steady";
}

export function burst(el, kind) {
  el.burstLayer.innerHTML = Array.from({ length: 14 })
    .map((_, index) => `<span class="burst-dot ${kind}" style="--x:${Math.random() * 160 - 80}px;--y:${Math.random() * -180}px;animation-delay:${index * 25}ms"></span>`)
    .join("");
  el.burstLayer.classList.add("active");
  setTimeout(() => {
    el.burstLayer.classList.remove("active");
    el.burstLayer.innerHTML = "";
  }, 1400);
}

export function revealSections(scope = document) {
  const items = [...scope.querySelectorAll(".reveal-on-scroll")];
  if (!items.length || typeof IntersectionObserver === "undefined") return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.14 });
  items.forEach((item) => observer.observe(item));
}

export function isActive(path) {
  return path === "/" ? window.location.pathname === "/" : window.location.pathname === path || window.location.pathname.startsWith(`${path}/`);
}

export function initials(value) {
  return String(value).split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

export function labelize(value) {
  return String(value).split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function deadlineCountdown(isoTimestamp) {
  const delta = new Date(isoTimestamp).getTime() - Date.now();
  if (delta <= 0) return "Expired";
  const totalHours = Math.floor(delta / 3600000);
  const days = Math.floor(totalHours / 24);
  return days > 0 ? `${days}d ${totalHours % 24}h` : `${Math.max(totalHours, 1)}h`;
}
