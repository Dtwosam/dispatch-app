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
  const readinessCounts = agentRows.reduce((counts, row) => {
    const key = String(row.readinessLabel || "Limited data").toLowerCase().replace(/\s+/g, "_");
    return { ...counts, [key]: (counts[key] || 0) + 1 };
  }, {});
  const lockedValueDisplay = earningsDashboard.summary.pendingLockedValue > 0
    ? earningsDashboard.summary.pendingLockedDisplay
    : earningsDashboard.summary.disputedLockedDisplay;
  const lockedValueLabel = earningsDashboard.summary.pendingLockedValue > 0 ? "Pending / locked value" : "Disputed / locked value";
  const lockedValueHelper = earningsDashboard.summary.pendingLockedValue > 0
    ? "Funded assigned work not yet released."
    : "Value locked by disputed tasks when available.";

  el.appRoot.innerHTML = `
    <section data-structure="dashboard" class="builder-dashboard-page">
      <header class="builder-dashboard-header reveal-on-scroll is-visible">
        <div>
          <p class="builder-dashboard-eyebrow">Builder dashboard</p>
          <h1>Manage agent work.</h1>
          <p>Track agents, funded tasks, earnings, and readiness signals.</p>
        </div>
        <button class="hero-primary" data-route="/connect-agent">Connect Agent</button>
      </header>

      <article class="builder-preview-note reveal-on-scroll">
        <strong>Builder dashboard preview</strong>
        <p>${escapeHtml(summary.ownershipNote)}</p>
      </article>

      <section class="builder-summary-grid reveal-on-scroll">
        <article>
          <span>Agents listed</span>
          <strong data-count="${summary.agentsListed}">${summary.agentsListed}</strong>
          <p>${summary.activeAgents} active or available</p>
        </article>
        <article>
          <span>Tasks needing attention</span>
          <strong data-count="${summary.attentionCount}">${summary.attentionCount}</strong>
          <p>${summary.attentionCount ? "Review submitted, revision, or disputed work." : "No attention tasks"}</p>
        </article>
        <article>
          <span>Settled earnings</span>
          <strong>${escapeHtml(earningsDashboard.summary.settledEarningsDisplay)}</strong>
          <p>${earningsDashboard.summary.paidTasks} paid funded task${earningsDashboard.summary.paidTasks === 1 ? "" : "s"}</p>
        </article>
        <article>
          <span>${escapeHtml(lockedValueLabel)}</span>
          <strong>${escapeHtml(lockedValueDisplay)}</strong>
          <p>${escapeHtml(lockedValueHelper)}</p>
        </article>
      </section>

      <section class="builder-dashboard-tabs reveal-on-scroll">
        <div role="tablist" aria-label="Builder dashboard sections">
          <button class="${state.dashboardTab === "agents" ? "active" : ""}" data-dashboard-tab="agents">Agents</button>
          <button class="${state.dashboardTab === "attention" ? "active" : ""}" data-dashboard-tab="attention">Needs attention</button>
          <button class="${state.dashboardTab === "earnings" ? "active" : ""}" data-dashboard-tab="earnings">Earnings</button>
        </div>
      </section>

      <section class="builder-tab-panel reveal-on-scroll">
        ${state.dashboardTab === "attention"
          ? `
            <div class="builder-section-head">
              <div>
                <p class="builder-dashboard-eyebrow">Attention</p>
                <h2>Tasks needing attention</h2>
                <p>Submitted, revision, disputed, or active task states appear here.</p>
              </div>
            </div>
            <div class="builder-attention-list">
              ${attentionItems.map((item) => `
                <article class="builder-attention-row builder-attention-row--${taskStatusTone(item.statusLabel)}">
                  <div>
                    <strong>${escapeHtml(item.title)}</strong>
                    <p>${escapeHtml(item.agentName)} | ${escapeHtml(item.paymentLabel)}</p>
                  </div>
                  <span>${escapeHtml(item.statusLabel)}</span>
                  <div>
                    <small>Next</small>
                    <strong>${escapeHtml(item.nextAction)}</strong>
                    <p>${escapeHtml(item.whoActsNext)}</p>
                  </div>
                  <button data-route="/tasks/${item.taskId}">View Task</button>
                </article>
              `).join("") || `
                <article class="builder-empty-state">
                  <strong>No agent tasks need attention yet.</strong>
                  <p>Submitted, revision, or disputed tasks will appear here.</p>
                  <button data-route="/agents">Explore agents</button>
                </article>
              `}
            </div>
          `
          : state.dashboardTab === "earnings"
            ? `
              <div class="builder-section-head">
                <div>
                  <p class="builder-dashboard-eyebrow">Earnings</p>
                  <h2>Agent earnings from available task data</h2>
                  <p>${escapeHtml(earningsDashboard.note)}</p>
                </div>
              </div>
              <div class="builder-earnings-summary">
                <article><span>Settled earnings</span><strong>${escapeHtml(earningsDashboard.summary.settledEarningsDisplay)}</strong><p>${earningsDashboard.summary.paidTasks} paid funded task${earningsDashboard.summary.paidTasks === 1 ? "" : "s"}</p></article>
                <article><span>Pending / locked</span><strong>${escapeHtml(earningsDashboard.summary.pendingLockedDisplay)}</strong><p>Funded assigned work before release.</p></article>
                <article><span>Disputed / locked</span><strong>${escapeHtml(earningsDashboard.summary.disputedLockedDisplay)}</strong><p>Payment stays locked during disputes.</p></article>
              </div>
              <div class="builder-earnings-list">
                ${earningsDashboard.breakdowns.map((item) => `
                  <article class="builder-earning-row">
                    <div>
                      <strong>${escapeHtml(item.name)}</strong>
                      <p>${escapeHtml(item.typeLabel)} | Package from ${escapeHtml(item.packageStartingPriceDisplay)}</p>
                    </div>
                    <div><span>Settled</span><strong>${escapeHtml(item.settledEarningsDisplay)}</strong></div>
                    <div><span>Paid tasks</span><strong>${escapeHtml(item.paidTasksDisplay)}</strong></div>
                    <div><span>Locked</span><strong>${escapeHtml(item.pendingLockedDisplay)}</strong><small>Disputed: ${escapeHtml(item.disputedLockedDisplay)}</small></div>
                    <div><span>Approval</span><strong>${escapeHtml(item.approvalRateDisplay)}</strong></div>
                  </article>
                `).join("") || `
                  <article class="builder-empty-state">
                    <strong>No agent earnings yet.</strong>
                    <p>Earnings appear after approved funded tasks are released.</p>
                  </article>
                `}
              </div>
              <article class="builder-payment-activity">
                <div class="builder-section-head">
                  <div>
                    <p class="builder-dashboard-eyebrow">Payment activity</p>
                    <h2>Task-linked earning activity</h2>
                  </div>
                </div>
                <div class="builder-activity-list">
                  ${earningsDashboard.activityRows.map((item) => `
                    <article class="builder-activity-row">
                      <div>
                        <strong>${escapeHtml(item.title)}</strong>
                        <p>${escapeHtml(item.agentName)} | ${escapeHtml(item.amountDisplay)}</p>
                      </div>
                      <span>${escapeHtml(item.paymentState)}</span>
                      <span>${escapeHtml(item.settlementState)}</span>
                      <small>${escapeHtml(item.dateLabel)}</small>
                      ${item.txLink ? `<a href="${item.txLink}" target="_blank" rel="noreferrer">${escapeHtml(item.txLabel)}</a>` : `<em>No valid tx link</em>`}
                    </article>
                  `).join("") || `
                    <article class="builder-empty-state">
                      <strong>No payment activity yet.</strong>
                      <p>Approved funded task payments will appear here.</p>
                    </article>
                  `}
                </div>
              </article>
            `
            : `
              <div class="builder-section-head">
                <div>
                  <p class="builder-dashboard-eyebrow">Agents</p>
                  <h2>Builder-visible agents</h2>
                  <p>Agent setup, packages, readiness, and performance at a glance.</p>
                </div>
              </div>
              <div class="builder-agent-list">
                ${agentRows.map((row) => `
                  <article class="builder-agent-row">
                    <div class="builder-agent-identity">
                      <span>${escapeHtml(initials(row.name))}</span>
                      <div>
                        <strong>${escapeHtml(row.name)}</strong>
                        <p>${escapeHtml(row.typeLabel)} | ${escapeHtml(row.packageSummary)}</p>
                      </div>
                    </div>
                    <div class="builder-agent-readiness">
                      <span>${escapeHtml(row.readinessLabel)}</span>
                      <p>${escapeHtml(row.verificationLabel)} | ${row.verificationMissingCount} missing setup item${row.verificationMissingCount === 1 ? "" : "s"}</p>
                      <small>${escapeHtml(row.verificationNextAction)}</small>
                    </div>
                    <div class="builder-agent-performance">
                      <div><span>Paid tasks</span><strong>${escapeHtml(row.completedTasksDisplay)}</strong></div>
                      <div><span>Earned</span><strong>${escapeHtml(row.totalEarnedDisplay)}</strong></div>
                      <div><span>Approval</span><strong>${escapeHtml(row.approvalRateDisplay)}</strong></div>
                    </div>
                    <footer>
                      <button data-route="/agents/${row.slug}">View Profile</button>
                      ${row.firstPackageId ? `<button class="hero-primary" data-dashboard-package-agent="${row.agentId}" data-dashboard-package="${row.firstPackageId}">Start Package</button>` : `<button data-direct="${row.agentId}">Create Task</button>`}
                    </footer>
                  </article>
                `).join("") || `
                  <article class="builder-empty-state">
                    <strong>No agents listed yet.</strong>
                    <p>Connect or register an agent to begin.</p>
                    <button data-route="/connect-agent">Connect Agent</button>
                  </article>
                `}
              </div>
            `}
      </section>

      <section class="builder-readiness-panel reveal-on-scroll">
        <div>
          <p class="builder-dashboard-eyebrow">Readiness signals</p>
          <h2>Setup and history signals</h2>
          <p>Readiness is based on available agent setup, packages, task history, and honest missing-data fallbacks.</p>
        </div>
        <div>
          <span>Ready: ${readinessCounts.ready || 0}</span>
          <span>Limited data: ${readinessCounts.limited_data || 0}</span>
          <span>Needs check: ${(readinessCounts.connection_check_needed || 0) + (readinessCounts.needs_review || 0)}</span>
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
