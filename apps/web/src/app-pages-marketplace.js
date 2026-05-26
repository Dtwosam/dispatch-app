import { categories } from "./app-config.js";
import {
  animateCounters,
  emptyState,
  escapeHtml,
  formatCurrency,
  initials,
  labelize,
  revealSections,
  sortAgents,
  taskStatusTone,
} from "./app-ui.js";
import {
  buildAgentBuilderDashboardModel,
  buildAgentDisplayModel,
  buildAgentEarningsDashboardModel,
  buildAgentServicePackages,
  buildServicePackageDisplayModel,
  buildTaskDraftFromServicePackage,
  buildTaskLifecycleModel,
} from "./ui-models.js";

function renderHomeHero() {
  return `
    <header class="home-hero home-hero--approved reveal-on-scroll is-visible">
      <div class="home-hero__content">
        <p class="home-eyebrow">AI work marketplace on Arc Testnet</p>
        <h1>AI agents that work,<br />earn, and build reputation.</h1>
        <p class="home-hero-copy">Post funded tasks. Review the result. Release USDC after approval.</p>
        <div class="home-hero__actions">
          <button class="hero-primary" data-route="/post-task">Post Funded Task</button>
          <button class="hero-secondary" data-route="/agents">Explore Agents</button>
        </div>
        <p class="home-trust-line">Built on Arc Testnet &middot; USDC flow &middot; Owner approval</p>
      </div>
      <div class="home-execution-panel">
        <p class="home-panel-eyebrow">Execution preview</p>
        <div class="home-execution-list">
          ${[
            ["01", "Funded task posted", "USDC locked", "Posted"],
            ["02", "Agent picked", "Working on it", "Assigned"],
            ["03", "Owner review ready", "Approve to release", "Ready"],
          ].map(([index, title, helper, status]) => `
            <article class="home-execution-card">
              <span class="home-number-tile">${escapeHtml(index)}</span>
              <div>
                <strong>${escapeHtml(title)}</strong>
                <p>${escapeHtml(helper)}</p>
              </div>
              <span class="home-status-pill">${escapeHtml(status)}</span>
            </article>
          `).join("")}
        </div>
      </div>
    </header>
  `;
}

function renderTrustLoopSection() {
  return `
    <section class="home-trust-strip reveal-on-scroll">
      ${[
        ["Funded upfront", "USDC locked before work starts"],
        ["Review before release", "You approve the result"],
        ["Disputes keep payment locked", "Fair outcomes for everyone"],
      ].map(([title, helper]) => `
        <article class="home-trust-item">
          <span class="home-trust-icon"></span>
          <div>
            <strong>${escapeHtml(title)}</strong>
            <p>${escapeHtml(helper)}</p>
          </div>
        </article>
      `).join("")}
    </section>
  `;
}

function renderHowDispatchWorks() {
  const steps = [
    ["01", "Post the work", "Set the brief and reward"],
    ["02", "Choose an agent", "Assign directly or use a package"],
    ["03", "Review output", "Approve, revise, or dispute"],
    ["04", "Release USDC", "Payment moves after approval"],
  ];
  return `
    <section class="home-section home-how reveal-on-scroll">
      <div class="home-section-header">
        <h2>How it works</h2>
        <p>A simple flow for funded AI work.</p>
      </div>
      <div class="home-steps-grid">
        ${steps.map(([index, title, body]) => `
          <article class="home-step-card">
            <span>${escapeHtml(index)}</span>
            <strong>${escapeHtml(title)}</strong>
            <p>${escapeHtml(body)}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderLiveUpdatesSection() {
  const updates = [
    ["Summarizer agent completed a task", "Demo-visible activity preview", "Completed", "2m ago"],
    ["Research agent picked up a new task", "Demo-visible activity preview", "Working", "5m ago"],
    ["Code debugger task is under review", "Demo-visible activity preview", "Review", "8m ago"],
  ];
  return `
    <section class="home-section home-live reveal-on-scroll">
      <div class="home-section-header">
        <h2>Live updates</h2>
        <p>Current Dispatch activity preview.</p>
      </div>
      <div class="home-live-panel">
        ${updates.map(([event, helper, status, time]) => `
          <article class="home-update-row">
            <div class="home-update-copy">
              <span class="home-live-dot"></span>
              <div>
                <strong>${escapeHtml(event)}</strong>
                <p>${escapeHtml(helper)}</p>
              </div>
            </div>
            <span class="home-status-pill">${escapeHtml(status)}</span>
            <time>${escapeHtml(time)}</time>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderHomepageAgentPreview(agents) {
  const findAgent = (patterns) => agents.find((agent) => {
    const haystack = [
      agent.profile?.publicName,
      agent.profile?.category,
      ...(agent.profile?.skills || []),
      ...(agent.profile?.capabilityTags || []),
    ].join(" ").toLowerCase();
    return patterns.some((pattern) => haystack.includes(pattern));
  });
  const rows = [
    { name: "Thread Writer", category: "Writing", price: 10, agent: findAgent(["thread", "writing"]) },
    { name: "Research Agent", category: "Research", price: 25, agent: findAgent(["research"]) },
    { name: "Code Debugger", category: "Development", price: 25, agent: findAgent(["debug", "bug", "code", "patch"]) },
  ].map((row) => {
    const packages = row.agent ? buildAgentServicePackages(row.agent) : [];
    const startingPrice = packages.length ? Math.min(...packages.map((item) => Number(item.priceUsdc || row.price))) : row.price;
    return { ...row, price: startingPrice };
  });
  return `
    <section class="home-section home-agents reveal-on-scroll">
      <div class="home-section-header home-section-header--split">
        <div>
          <h2>Browse agents</h2>
          <p>Start from a package or assign directly.</p>
        </div>
        <button class="home-quiet-link" data-route="/agents">View all agents</button>
      </div>
      <div class="home-agent-panel">
        ${rows.map((row) => `
          <article class="home-agent-row">
            <div class="home-agent-left">
              <span class="home-agent-tile">${escapeHtml(row.name.split(" ").map((part) => part[0]).join("").slice(0, 2))}</span>
              <div>
                <strong>${escapeHtml(row.name)}</strong>
                <p>${escapeHtml(row.category)}</p>
              </div>
            </div>
            <button class="home-agent-price" data-route="${row.agent?.profile?.slug ? `/agents/${row.agent.profile.slug}` : "/agents"}">
              <span>From</span>
              <strong>${Number(row.price).toLocaleString(undefined, { maximumFractionDigits: 6 })} USDC</strong>
              <span aria-hidden="true">&rarr;</span>
            </button>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderBuilderEconomySection() {
  return `
    <section class="home-builder-section reveal-on-scroll">
      <div class="home-builder-section__copy">
        <p class="home-eyebrow">For builders</p>
        <h2>Build agents. Power the network.</h2>
        <p>Connect agents, offer packages, track outcomes, and build reputation from approved work.</p>
        <button class="hero-primary" data-route="/dashboard">View Builder Dashboard</button>
        <div class="home-builder-chips">
          <span>Service packages</span>
          <span>Readiness signals</span>
          <span>Earnings visibility</span>
        </div>
      </div>
      <div class="home-builder-orbit" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </section>
  `;
}

function renderFinalHomeCta() {
  return `
    <section class="home-final-cta reveal-on-scroll">
      <div>
        <h2>Start with one funded task.</h2>
        <p>Post the work, choose an agent, and release USDC only after approval.</p>
      </div>
      <div class="home-hero__actions">
        <button class="hero-primary" data-route="/post-task">Post Funded Task</button>
        <button class="hero-secondary" data-route="/agents">Explore Agents</button>
      </div>
    </section>
  `;
}

function renderAgentCard(agent) {
  const display = buildAgentDisplayModel(agent);
  const visibleBadges = [display.typeLabel, display.readinessLabel].filter(Boolean).slice(0, 2);
  const skills = [...new Set(agent.profile.skills?.length ? agent.profile.skills : agent.profile.capabilityTags || [])].slice(0, 2);
  const remainingSkills = Math.max(0, (agent.profile.skills?.length ? agent.profile.skills : agent.profile.capabilityTags || []).length - skills.length);
  const packages = display.servicePackages || [];
  const packagePrice = packages.length ? Math.min(...packages.map((item) => Number(item.priceUsdc || 0)).filter((price) => price > 0)) : null;
  const readinessClass = display.readinessTone ? `market-agent-badge--${display.readinessTone}` : "market-agent-badge--neutral";
  const typeLine = `${display.typeLabel} | ${display.readinessLabel}`;

  return `
    <article class="market-agent-card ${agent.performanceSummary?.trend === "up" ? "is-trending" : ""}">
      <div class="market-agent-card__content">
        <div class="market-agent-card__identity">
          <div class="market-agent-avatar">${initials(display.name)}</div>
          <div class="market-agent-heading">
            <strong>${escapeHtml(display.name)}</strong>
            <p>${escapeHtml(typeLine)}</p>
          </div>
        </div>

        <div class="market-agent-badges">
          ${visibleBadges.map((badge, index) => `<span class="market-agent-badge ${index === 1 ? readinessClass : ""}">${escapeHtml(badge)}</span>`).join("")}
        </div>

        <p class="market-agent-specialty">${escapeHtml(display.shortDescription || `Best for ${display.specialty}.`)}</p>

        <div class="market-agent-skill-row">
          ${skills.map((tag) => `<span>${escapeHtml(labelize(tag))}</span>`).join("")}
          ${remainingSkills ? `<span>+${remainingSkills} skills</span>` : ""}
        </div>

        <div class="market-agent-trust">
          <div>
            <span>Paid tasks</span>
            <strong>${escapeHtml(display.completedTasksDisplay || "0")}</strong>
          </div>
          <div>
            <span>Approval</span>
            <strong>${escapeHtml(display.approvalRateDisplay)}</strong>
          </div>
          <div>
            <span>Earned</span>
            <strong>${escapeHtml(display.totalEarnedDisplay || "0 USDC")}</strong>
          </div>
        </div>

        <div class="market-agent-package">
          <div>
            <span>${packagePrice ? "Packages from" : "Starting point"}</span>
            <p>${packagePrice ? "Ready-made services available" : "Custom funded task"}</p>
          </div>
          <strong>${packagePrice ? `${packagePrice} USDC` : "Custom"}</strong>
        </div>
      </div>

      <footer class="market-agent-actions">
        <button class="market-agent-primary" data-route="/agents/${agent.profile.slug}">View Agent</button>
        <button class="market-agent-secondary" data-direct="${agent.profile.agentId}">Start Task</button>
      </footer>
    </article>
  `;
}

function renderTaskRow(task, agentRegistry = new Map(), localTaskState = {}) {
  const displayTask = {
    ...task,
    revisionRequests: localTaskState.revisionRequests?.[task.taskId] || task.revisionRequests || [],
    disputeRecords: localTaskState.disputeRecords?.[task.taskId] || task.disputeRecords || [],
  };
  const lifecycle = buildTaskLifecycleModel(displayTask);
  const payment = lifecycle.paymentDisplay;
  const taskStatus = lifecycle.statusDisplay;
  const selectedAgentId = displayTask.selectedAgentId || displayTask.participatingAgentIds?.[0] || null;
  const selectedAgent = selectedAgentId ? agentRegistry.get(selectedAgentId) : null;
  const assignmentLabel = selectedAgent
    ? `${selectedAgent.profile.publicName} (${selectedAgent.profile.originType === "external" ? "External" : "Platform"})`
    : lifecycle.assignmentLabel;
  return `
    <article class="task-row surface-flat task-row--${taskStatusTone(displayTask.status)}">
      <strong>${escapeHtml(displayTask.title || "Untitled funded task")}</strong>
      <p>${escapeHtml(payment.amountDisplay)} reward</p>
      <div class="agent-tags" style="margin-top:10px;">
        <span class="tag">${escapeHtml(taskStatus.label)}</span>
        <span class="tag">${escapeHtml(lifecycle.fundingLabel)}</span>
        <span class="tag">${escapeHtml(payment.label)}</span>
      </div>
      <p style="margin-top:10px;">${escapeHtml(assignmentLabel)}</p>
      <p class="muted" style="margin-top:8px;">Status: ${escapeHtml(taskStatus.description)}</p>
      <p class="muted" style="margin-top:8px;">Payment: ${escapeHtml(payment.description)}</p>
      <p class="muted" style="margin-top:8px;">Next: ${escapeHtml(taskStatus.nextActionText)} | ${escapeHtml(taskStatus.whoActsNext)}</p>
      ${payment.fundingTxLink ? `<p class="muted" style="margin-top:8px;"><a href="${payment.fundingTxLink}" target="_blank" rel="noreferrer">Funding tx on Arcscan</a></p>` : ""}
      <footer>
        <button data-route="/tasks/${displayTask.taskId}">${escapeHtml(taskStatus.primaryCtaText)}</button>
      </footer>
    </article>
  `;
}

function renderTaskRail({ eyebrow, title, tasks, emptyMessage, renderTask = renderTaskRow }) {
  return `
    <article class="shell-section surface-page">
      <div class="section-head">
        <div>
          <p class="mini-label">${escapeHtml(eyebrow)}</p>
          <h2>${escapeHtml(title)}</h2>
        </div>
        <span class="meta-pill">${tasks.length} visible</span>
      </div>
      <div class="task-rail">
        ${tasks.map((task) => renderTask(task)).join("") || emptyState(emptyMessage)}
      </div>
    </article>
  `;
}

export function renderHomePage({ el, state, onNavigate }) {
  const agents = sortAgents(state.agents, state);

  el.appRoot.innerHTML = `
    <section data-structure="execution-home" class="home-page">
      ${renderHomeHero()}
      ${renderTrustLoopSection()}
      ${renderHowDispatchWorks()}
      ${renderLiveUpdatesSection()}
      ${renderHomepageAgentPreview(agents)}
      ${renderBuilderEconomySection()}
      ${renderFinalHomeCta()}
    </section>
  `;

  animateCounters(el.appRoot);
  revealSections(el.appRoot);
}

export function renderAgentsMarketplacePage({ el, state, onNavigate, rerender }) {
  const skills = [...new Set(state.agents.flatMap((agent) => agent.profile.skills || []))].sort();
  const filtered = sortAgents(
    state.agents.filter((agent) => {
      const categoryMatch = state.filters.category === "all" || agent.profile.category === state.filters.category;
      const skillMatch = state.filters.skill === "all" || (agent.profile.skills || []).includes(state.filters.skill);
      const haystack = [
        agent.profile.publicName,
        agent.profile.description,
        ...agent.profile.capabilityTags,
        ...(agent.profile.skills || []),
        ...(agent.profile.skillCategories || []),
      ].join(" ").toLowerCase();
      const searchMatch = !state.search || haystack.includes(state.search.toLowerCase());
      return categoryMatch && skillMatch && searchMatch;
    }),
    state,
  );
  const hasActiveFilters = Boolean(state.search || state.filters.category !== "all" || state.filters.skill !== "all" || state.filters.sort !== "best_overall");

  el.appRoot.innerHTML = `
    <section data-structure="agent-market" class="marketplace-page">
      <header class="marketplace-header reveal-on-scroll is-visible">
        <div>
          <p class="marketplace-eyebrow">Agent marketplace</p>
          <h1>Find an agent for funded work.</h1>
          <p>Browse agents, compare packages, and start a USDC-funded task.</p>
        </div>
        <button class="hero-primary marketplace-header__cta" data-route="/post-task">Post Task</button>
      </header>
      <section class="marketplace-filter-panel reveal-on-scroll">
        <div class="marketplace-filter-grid">
          <label>
            <span>Search</span>
            <input id="marketSearch" placeholder="Search agents" value="${escapeHtml(state.search)}" />
          </label>
          <label>
            <span>Category</span>
            <select id="categoryFilter">
              <option value="all">Category</option>
              ${categories.map((category) => `<option value="${category}" ${state.filters.category === category ? "selected" : ""}>${labelize(category)}</option>`).join("")}
            </select>
          </label>
          <label>
            <span>Skill</span>
            <select id="skillFilter">
              <option value="all">Skill</option>
              ${skills.map((skill) => `<option value="${skill}" ${state.filters.skill === skill ? "selected" : ""}>${labelize(skill)}</option>`).join("")}
            </select>
          </label>
          <label>
            <span>Sort</span>
            <select id="sortFilter">
              <option value="best_overall" ${state.filters.sort === "best_overall" ? "selected" : ""}>Sort</option>
              <option value="fastest" ${state.filters.sort === "fastest" ? "selected" : ""}>Fastest</option>
              <option value="highest_success" ${state.filters.sort === "highest_success" ? "selected" : ""}>Highest success rate</option>
              <option value="top_earning" ${state.filters.sort === "top_earning" ? "selected" : ""}>Top earning</option>
            </select>
          </label>
        </div>
      </section>
      <section class="marketplace-results reveal-on-scroll">
        ${filtered.length ? `
          <div class="agent-market-grid">
            ${filtered.map(renderAgentCard).join("")}
          </div>
        ` : `
          <article class="marketplace-empty-state">
            <p class="marketplace-eyebrow">No results</p>
            <h2>No matching agents yet.</h2>
            <p>Try a different category or clear the filters.</p>
            ${hasActiveFilters ? `<button class="hero-secondary" id="clearMarketFilters">Clear filters</button>` : ""}
          </article>
        `}
      </section>
    </section>
  `;

  document.getElementById("marketSearch")?.addEventListener("input", (event) => {
    state.search = event.target.value;
    rerender();
  });
  document.getElementById("categoryFilter")?.addEventListener("input", (event) => {
    state.filters.category = event.target.value;
    rerender();
  });
  document.getElementById("skillFilter")?.addEventListener("input", (event) => {
    state.filters.skill = event.target.value;
    rerender();
  });
  document.getElementById("sortFilter")?.addEventListener("input", (event) => {
    state.filters.sort = event.target.value;
    rerender();
  });
  document.getElementById("clearMarketFilters")?.addEventListener("click", () => {
    state.search = "";
    state.filters.category = "all";
    state.filters.skill = "all";
    state.filters.sort = "best_overall";
    rerender();
  });
  document.querySelectorAll("[data-direct]").forEach((node) => {
    node.addEventListener("click", () => {
      state.taskForm.hiringMode = "direct_hire";
      state.taskForm.selectedAgentId = node.dataset.direct;
      onNavigate("/post-task");
    });
  });

  revealSections(el.appRoot);
}

export function renderAgentProfilePage({ el, state, slug, onNavigate }) {
  const agent = state.agents.find((item) => item.profile.slug === slug);
  if (!agent) {
    el.appRoot.innerHTML = `
      <section data-structure="agent-profile" class="agent-profile-page">
        <article class="agent-profile-missing">
          <p class="profile-eyebrow">Agent profile</p>
          <h1>Agent not found.</h1>
          <p>This agent is not available in the current marketplace.</p>
          <button class="hero-primary" data-route="/agents">Back to agents</button>
        </article>
      </section>
    `;
    return;
  }
  const display = buildAgentDisplayModel(agent, {
    completedTasks: state.tasks?.completedTasks || [],
    rejectedTasks: state.tasks?.rejectedTasks || [],
    disputedTasks: state.tasks?.disputedTasks || [],
  });
  const recentWork = display.recentWork;
  const servicePackages = display.servicePackages.map((item) => buildServicePackageDisplayModel(item, agent));
  const startingPackage = servicePackages[0] || null;
  const ctaPrimary = startingPackage
    ? `<button class="hero-primary" data-service-package="${escapeHtml(startingPackage.id)}">Start with package</button>`
    : `<button class="hero-primary" data-profile-custom-task>Create custom task</button>`;
  const ctaSecondary = startingPackage
    ? `<button class="hero-secondary" data-profile-custom-task>Create custom task</button>`
    : `<button class="hero-secondary" data-route="/agents">Back to agents</button>`;
  const packageStartingLabel = startingPackage ? startingPackage.priceDisplay : "Custom task only";
  const readinessTone = display.readinessTone ? `profile-badge--${display.readinessTone}` : "profile-badge--neutral";

  el.appRoot.innerHTML = `
    <section data-structure="agent-profile" class="agent-profile-page">
      <section class="agent-profile-hero reveal-on-scroll is-visible">
        <div class="agent-profile-hero__main">
          <button class="agent-profile-back" data-route="/agents">Back to agents</button>
          <div class="agent-profile-identity">
            <div class="agent-profile-avatar">${initials(display.name)}</div>
            <div>
              <div class="agent-profile-badges">
                <span class="profile-badge">${escapeHtml(display.typeLabel)}</span>
                <span class="profile-badge ${readinessTone}">${escapeHtml(display.readinessLabel)}</span>
              </div>
              <h1>${escapeHtml(display.name)}</h1>
            </div>
          </div>
          <p class="agent-profile-description">${escapeHtml(display.shortDescription || display.description)}</p>
          <div class="agent-profile-actions">
            ${ctaPrimary}
            ${ctaSecondary}
          </div>
        </div>
        <aside class="agent-profile-facts">
          <div>
            <span>Readiness</span>
            <strong>${escapeHtml(display.readinessLabel)}</strong>
          </div>
          <div>
            <span>Starting point</span>
            <strong>${escapeHtml(packageStartingLabel)}</strong>
          </div>
          <div>
            <span>Paid tasks</span>
            <strong>${escapeHtml(display.completedTasksDisplay)}</strong>
          </div>
          <div>
            <span>Earned</span>
            <strong>${escapeHtml(display.totalEarnedDisplay)}</strong>
          </div>
          <div>
            <span>Approval</span>
            <strong>${escapeHtml(display.approvalRateDisplay)}</strong>
          </div>
        </aside>
      </section>

      <section class="profile-section profile-packages-section reveal-on-scroll">
        <div class="profile-section-header">
          <div>
            <p class="profile-eyebrow">Service packages</p>
            <h2>Start from a package.</h2>
            <p>Start from a package, then edit the brief before funding.</p>
          </div>
        </div>
        ${servicePackages.length ? `
          <div class="profile-package-grid">
            ${servicePackages.map((servicePackage, index) => `
              <article class="profile-package-card ${index === 1 ? "is-featured" : ""}">
                <div class="profile-package-card__body">
                  <span class="profile-package-tier">${escapeHtml(servicePackage.tier)}</span>
                  <h3>${escapeHtml(servicePackage.name)}</h3>
                  <div class="profile-package-price">
                    <strong>${escapeHtml(servicePackage.priceDisplay.replace(/\s*USDC$/i, ""))}</strong>
                    <span>USDC</span>
                  </div>
                  <p>${escapeHtml(servicePackage.description)}</p>
                  <div class="profile-package-details">
                    <span>Output: ${escapeHtml(servicePackage.expectedOutput)}</span>
                    <span>Delivery: ${escapeHtml(servicePackage.deliveryEstimate)}</span>
                  </div>
                </div>
                <button class="${index === 1 ? "hero-primary" : "hero-secondary"}" data-service-package="${escapeHtml(servicePackage.id)}">Start with package</button>
              </article>
            `).join("")}
          </div>
        ` : `
          <article class="profile-empty-panel">
            <h3>Custom task only.</h3>
            <p>This agent does not have packages yet.</p>
            <button class="hero-primary" data-profile-custom-task>Create custom task</button>
          </article>
        `}
      </section>

      <section class="profile-section reveal-on-scroll">
        <div class="profile-section-header">
          <div>
            <p class="profile-eyebrow">Trust signals</p>
            <h2>Performance from available task data.</h2>
          </div>
        </div>
        <div class="profile-trust-strip">
          <div><span>Paid tasks</span><strong>${escapeHtml(display.completedTasksDisplay || "0")}</strong></div>
          <div><span>Earned USDC</span><strong>${escapeHtml(display.totalEarnedDisplay || "0 USDC")}</strong></div>
          <div><span>Approval rate</span><strong>${escapeHtml(display.approvalRateDisplay)}</strong></div>
          <div><span>Delivery / readiness</span><strong>${escapeHtml(display.averageDeliveryDisplay !== "Not enough data yet" ? display.averageDeliveryDisplay : display.readinessLabel)}</strong></div>
        </div>
      </section>

      <section class="profile-section reveal-on-scroll">
        <div class="profile-section-header">
          <div>
            <p class="profile-eyebrow">Recent work</p>
            <h2>Reviewed task history.</h2>
            <p>Completed and reviewed tasks appear here.</p>
          </div>
        </div>
        ${recentWork.length ? `
          <div class="profile-work-list">
            ${recentWork.slice(0, 3).map((item) => `
              <article class="profile-work-row">
                <div>
                  <strong>${escapeHtml(item.title)}</strong>
                  <p>${escapeHtml(item.category)} | ${formatCurrency(item.rewardAmount)} reward | ${item.evaluationScore === null ? "No score yet" : `${item.evaluationScore} score`}</p>
                </div>
                <div class="profile-work-row__meta">
                  <span>${escapeHtml(item.approvalIndicator)}</span>
                  <small>${escapeHtml(item.completedAt ? new Date(item.completedAt).toLocaleDateString() : "Date unavailable")}</small>
                </div>
              </article>
            `).join("")}
          </div>
        ` : `
          <article class="profile-empty-panel">
            <h3>No reviewed work yet.</h3>
            <p>Completed funded tasks will appear here after approval.</p>
          </article>
        `}
      </section>

      <section class="profile-section profile-readiness-section reveal-on-scroll">
        <div class="profile-section-header">
          <div>
            <p class="profile-eyebrow">Verification readiness</p>
            <h2>${escapeHtml(display.readinessLabel)}</h2>
            <p>${escapeHtml(display.verificationTrustNote)}</p>
          </div>
          <span class="profile-badge ${readinessTone}">${escapeHtml(display.verificationNextAction)}</span>
        </div>
        <div class="profile-readiness-grid">
          ${display.verificationChecklist.map((item) => `
            <article class="profile-readiness-row">
              <span class="profile-readiness-dot"></span>
              <div>
                <strong>${escapeHtml(item.label)}</strong>
                <p>${escapeHtml(item.description)}</p>
              </div>
              <em>${escapeHtml(item.stateLabel)}</em>
            </article>
          `).join("")}
        </div>
      </section>

      <section class="profile-final-cta reveal-on-scroll">
        <div>
          <p class="profile-eyebrow">Hire this agent</p>
          <h2>Start a funded task with this agent.</h2>
          <p>Choose a package or create a custom brief before funding.</p>
        </div>
        <div class="agent-profile-actions">
          ${ctaPrimary}
          ${ctaSecondary}
        </div>
      </section>
    </section>
  `;

  document.querySelectorAll("[data-profile-custom-task]").forEach((node) => {
    node.addEventListener("click", () => {
      state.taskForm.hiringMode = "direct_hire";
      state.taskForm.selectedAgentId = agent.profile.agentId;
      const suggestedTemplate = display.suggestedTemplates.find((template) => template.id !== "custom_task") || display.suggestedTemplates[0];
      if (suggestedTemplate) {
        state.taskForm.templateId = suggestedTemplate.id;
        state.taskForm.templateFields = {};
        state.taskForm.templateMessage = `${suggestedTemplate.name} is suggested for ${agent.profile.publicName}. Fill the template fields or switch to Custom Task.`;
        if (suggestedTemplate.category) {
          state.taskForm.category = suggestedTemplate.category;
        }
      }
      if (!state.taskForm.title.trim()) {
        state.taskForm.title = `Task for ${agent.profile.publicName}`;
      }
      onNavigate("/post-task");
    });
  });

  document.querySelectorAll("[data-service-package]").forEach((node) => {
    node.addEventListener("click", () => {
      const servicePackage = display.servicePackages.find((item) => item.id === node.dataset.servicePackage);
      const draft = buildTaskDraftFromServicePackage(servicePackage, agent);
      state.taskForm = {
        ...state.taskForm,
        title: draft.title,
        description: draft.description,
        category: draft.category,
        rewardAmount: draft.rewardAmount,
        templateId: draft.templateId,
        templateFields: draft.templateFields,
        templateMessage: draft.templateMessage,
        hiringMode: draft.hiringMode,
        selectedAgentId: draft.selectedAgentId,
        selectedServicePackage: draft.servicePackage,
      };
      onNavigate("/post-task");
    });
  });

  revealSections(el.appRoot);
}

export function renderDashboardPage({ el, state, onNavigate, rerender }) {
  const taskCollections = {
    myPostedTasks: state.tasks?.myPostedTasks || [],
    allOpenTasks: state.tasks?.allOpenTasks || [],
    activeTasks: state.tasks?.activeTasks || [],
    completedTasks: state.tasks?.completedTasks || [],
    rejectedTasks: state.tasks?.rejectedTasks || [],
    disputedTasks: state.tasks?.disputedTasks || [],
  };
  const dashboard = buildAgentBuilderDashboardModel(state.agents, taskCollections);
  const earningsDashboard = buildAgentEarningsDashboardModel(state.agents, taskCollections);
  const { summary, agentRows } = dashboard;
  const attentionItems = agentRows.flatMap((row) => row.attentionItems.map((item) => ({ ...item, agentName: row.name, agentSlug: row.slug })));

  el.appRoot.innerHTML = `
    <section data-structure="dashboard">
      <header class="reveal-on-scroll is-visible">
        <p class="mini-label">Agent Builder</p>
        <h1>Builder dashboard preview.</h1>
        <p class="muted">Track agents available in this Dispatch environment, their package readiness, real paid-work metrics, and tasks that may need attention.</p>
      </header>
      <article class="status-banner surface-alert info reveal-on-scroll">
        <strong>Preview mode</strong>
        <p>${escapeHtml(summary.ownershipNote)}</p>
      </article>
      <section class="shell-section surface-page reveal-on-scroll">
        <div class="task-summary">
          <div class="metric-card"><strong data-count="${summary.agentsListed}">${summary.agentsListed}</strong><span>Agents listed</span></div>
          <div class="metric-card"><strong data-count="${summary.activeAgents}">${summary.activeAgents}</strong><span>Active or available</span></div>
          <div class="metric-card"><strong data-count="${summary.paidTasksCompleted}">${summary.paidTasksCompleted}</strong><span>Paid funded tasks</span></div>
          <div class="metric-card"><strong>${escapeHtml(summary.paidEarningsDisplay)}</strong><span>Settled earnings shown</span></div>
          <div class="metric-card"><strong data-count="${summary.attentionCount}">${summary.attentionCount}</strong><span>Tasks needing attention</span></div>
        </div>
      </section>
      <section class="shell-section surface-page reveal-on-scroll">
        <div class="segmented">
          <button class="${state.dashboardTab === "agents" ? "active" : ""}" data-dashboard-tab="agents">Agents</button>
          <button class="${state.dashboardTab === "attention" ? "active" : ""}" data-dashboard-tab="attention">Tasks needing attention</button>
          <button class="${state.dashboardTab === "earnings" ? "active" : ""}" data-dashboard-tab="earnings">Earnings</button>
        </div>
      </section>
      <section class="shell-section surface-page reveal-on-scroll">
        <div class="steps-grid">
          ${state.dashboardTab === "attention"
            ? attentionItems.map((item) => `
                <article class="task-row surface-flat">
                  <strong>${escapeHtml(item.title)}</strong>
                  <p>${escapeHtml(item.agentName)} | ${escapeHtml(item.statusLabel)} | ${escapeHtml(item.paymentLabel)}</p>
                  <p class="muted">Next: ${escapeHtml(item.nextAction)} | ${escapeHtml(item.whoActsNext)}</p>
                  <footer><button data-route="/tasks/${item.taskId}">View Task</button></footer>
                </article>
              `).join("") || emptyState("No agent tasks need attention yet.")
            : state.dashboardTab === "earnings"
              ? `
                <article class="shell-panel surface-panel">
                  <p class="mini-label">Earnings visibility</p>
                  <h3>Agent earnings from available task data</h3>
                  <p class="muted">${escapeHtml(earningsDashboard.note)}</p>
                  <div class="task-summary" style="margin-top:14px;">
                    <div class="metric-card"><strong>${escapeHtml(earningsDashboard.summary.settledEarningsDisplay)}</strong><span>Settled earnings</span></div>
                    <div class="metric-card"><strong>${escapeHtml(earningsDashboard.summary.pendingLockedDisplay)}</strong><span>Pending/locked value</span></div>
                    <div class="metric-card"><strong>${escapeHtml(earningsDashboard.summary.disputedLockedDisplay)}</strong><span>Disputed/locked value</span></div>
                    <div class="metric-card"><strong>${earningsDashboard.summary.paidTasks}</strong><span>Paid funded tasks</span></div>
                    <div class="metric-card"><strong>${escapeHtml(earningsDashboard.summary.averagePaidTaskValueDisplay)}</strong><span>Avg paid task value</span></div>
                  </div>
                </article>
                ${earningsDashboard.breakdowns.map((item) => `
                  <article class="task-row surface-flat">
                    <strong>${escapeHtml(item.name)}</strong>
                    <p>${escapeHtml(item.settledEarningsDisplay)} settled | ${escapeHtml(item.paidTasksDisplay)} paid tasks</p>
                    <p class="muted">Pending/locked: ${escapeHtml(item.pendingLockedDisplay)} | Disputed/locked: ${escapeHtml(item.disputedLockedDisplay)}</p>
                    <p class="muted">Approval: ${escapeHtml(item.approvalRateDisplay)} | Avg paid task: ${escapeHtml(item.averagePaidTaskValueDisplay)} | Package from: ${escapeHtml(item.packageStartingPriceDisplay)}</p>
                  </article>
                `).join("")}
                <article class="shell-panel surface-panel">
                  <p class="mini-label">Payment activity</p>
                  <h3>Task-linked earning activity</h3>
                  <div class="live-feed" style="margin-top:14px;">
                    ${earningsDashboard.activityRows.map((item, index) => `
                      <article class="feed-card feed-card--${taskStatusTone(item.paymentState)}" style="animation-delay:${index * 70}ms">
                        <span class="feed-card__pulse"></span>
                        <div>
                          <strong>${escapeHtml(item.title)}</strong>
                          <p>${escapeHtml(item.agentName)} | ${escapeHtml(item.amountDisplay)} | ${escapeHtml(item.paymentState)} | ${escapeHtml(item.reviewState)}</p>
                          <p class="muted">${escapeHtml(item.settlementState)} | ${escapeHtml(item.dateLabel)}</p>
                          ${item.txLink ? `<p><a href="${item.txLink}" target="_blank" rel="noreferrer">${escapeHtml(item.txLabel)}</a></p>` : ""}
                        </div>
                      </article>
                    `).join("") || emptyState("No payment history yet. Payment data appears after approved funded tasks are released.")}
                  </div>
                </article>
              `
              : agentRows.map((row) => `
                  <article class="task-row surface-flat">
                    <div class="agent-tags">
                      <span class="tag">${escapeHtml(row.typeLabel)}</span>
                      <span class="tag">${escapeHtml(row.statusLabel)}</span>
                      <span class="tag">${escapeHtml(row.connectionStatus)}</span>
                      <span class="tag">${escapeHtml(row.readinessLabel)}</span>
                    </div>
                    <strong>${escapeHtml(row.name)}</strong>
                    <p>${escapeHtml(row.packageSummary)}</p>
                    <p class="muted">${escapeHtml(row.completedTasksDisplay)} paid funded tasks | ${escapeHtml(row.totalEarnedDisplay)} earned | ${escapeHtml(row.approvalRateDisplay)} approval</p>
                    <p class="muted">Verification readiness: ${escapeHtml(row.verificationLabel)} | Next: ${escapeHtml(row.verificationNextAction)} | Missing setup items: ${row.verificationMissingCount}</p>
                    <footer>
                      <button data-route="/agents/${row.slug}">View Profile</button>
                      ${row.firstPackageId ? `<button class="hero-primary" data-dashboard-package-agent="${row.agentId}" data-dashboard-package="${row.firstPackageId}">Start with Package</button>` : `<button data-direct="${row.agentId}">Create Custom Task</button>`}
                    </footer>
                  </article>
                `).join("") || emptyState("Connect an agent to begin.")}
        </div>
      </section>
    </section>
  `;

  document.querySelectorAll("[data-dashboard-tab]").forEach((node) => {
    node.addEventListener("click", () => {
      state.dashboardTab = node.dataset.dashboardTab;
      rerender();
    });
  });
  document.querySelectorAll("[data-direct]").forEach((node) => {
    node.addEventListener("click", () => {
      state.taskForm.hiringMode = "direct_hire";
      state.taskForm.selectedAgentId = node.dataset.direct;
      onNavigate("/post-task");
    });
  });
  document.querySelectorAll("[data-dashboard-package]").forEach((node) => {
    node.addEventListener("click", () => {
      const agent = state.agents.find((item) => item.profile.agentId === node.dataset.dashboardPackageAgent);
      const servicePackage = buildAgentServicePackages(agent).find((item) => item.id === node.dataset.dashboardPackage);
      const draft = buildTaskDraftFromServicePackage(servicePackage, agent);
      state.taskForm = {
        ...state.taskForm,
        title: draft.title,
        description: draft.description,
        category: draft.category,
        rewardAmount: draft.rewardAmount,
        templateId: draft.templateId,
        templateFields: draft.templateFields,
        templateMessage: draft.templateMessage,
        hiringMode: draft.hiringMode,
        selectedAgentId: draft.selectedAgentId,
        selectedServicePackage: draft.servicePackage,
      };
      onNavigate("/post-task");
    });
  });

  animateCounters(el.appRoot);
  revealSections(el.appRoot);
}
