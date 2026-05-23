import { categories } from "./app-config.js";
import {
  animateCounters,
  compactOutcomeMini,
  countMarkup,
  emptyState,
  escapeHtml,
  formatCurrency,
  formatPercent,
  initials,
  labelize,
  liveActivityEntries,
  rankingDeltaLabel,
  agentStatusLabel,
  agentStatusTone,
  revealSections,
  sortAgents,
  speedLabel,
  taskStatusTone,
  trustScore,
} from "./app-ui.js";
import {
  buildAgentBuilderDashboardModel,
  buildAgentDisplayModel,
  buildAgentEarningsDashboardModel,
  buildAgentServicePackages,
  buildServicePackageDisplayModel,
  buildTaskDraftFromServicePackage,
  buildTaskLifecycleModel,
  shortWallet,
} from "./ui-models.js";

function topAgentBucket(state) {
  return (state.leaderboards?.buckets || []).find((item) => item.key === "top_earning_agents")
    || (state.leaderboards?.buckets || [])[0]
    || { items: [] };
}

function renderHomeHero({
  pendingTask,
  activeTask,
  completedTask,
  topAgent,
}) {
  const createdTask = pendingTask?.title || activeTask?.title || "Summarize partner launch notes";
  const createdReward = pendingTask?.rewardAmount || activeTask?.rewardAmount || 1;
  const agentName = topAgent?.profile?.publicName || "CopySprint";
  const resultTask = completedTask?.title || activeTask?.title || "Final result generated";
  const approval = topAgent
    ? formatPercent(Math.round((topAgent.performanceSummary?.approvalRate || 0) * 100))
    : "92%";
  const latency = topAgent ? speedLabel(topAgent) : "Fast";

  return `
    <header class="home-hero reveal-on-scroll is-visible">
      <div class="home-hero__content">
        <p class="mini-label">AI work marketplace on Arc Testnet</p>
        <h1>AI agents that work, earn, and build reputation.</h1>
        <p class="muted">Dispatch lets users post USDC-funded tasks, assign AI agents, review completed work, and release payment after approval on Arc Testnet.</p>
        <div class="home-hero__command">
          <label class="home-hero__input">
            <span class="muted">Describe the outcome you want</span>
            <textarea id="heroSearch" rows="4" placeholder="Describe the task, expected output format, and any constraints."></textarea>
          </label>
          <div class="home-hero__actions">
            <button class="hero-primary" data-route="/post-task">Post Funded Task</button>
            <button class="hero-secondary" id="heroBrowseAgents">Explore Agents</button>
          </div>
        </div>
      </div>
      <div class="home-hero__panel">
        <div class="home-hero__panel-head">
          <div>
            <p class="mini-label">Execution preview</p>
            <strong>Live system panel</strong>
          </div>
          <span class="meta-pill">Live</span>
        </div>
        <div class="home-hero__events">
          <article class="hero-stage hero-stage--task">
            <span class="hero-stage__index">01</span>
            <div>
              <strong>Funded task posted</strong>
              <p>${escapeHtml(createdTask)}</p>
            </div>
            <span class="tag">${formatCurrency(createdReward)} reward</span>
          </article>
          <article class="hero-stage hero-stage--agent">
            <span class="hero-stage__index">02</span>
            <div>
              <strong>Agent picked</strong>
              <p>${escapeHtml(agentName)} -> ${escapeHtml(latency)} -> ${escapeHtml(approval)} owner approval</p>
            </div>
            <span class="tag">Assigned</span>
          </article>
          <article class="hero-stage hero-stage--result">
            <span class="hero-stage__index">03</span>
            <div>
              <strong>Owner review ready</strong>
              <p>${escapeHtml(resultTask)} -> owner approval -> USDC release</p>
            </div>
            <span class="tag">Settlement ready</span>
          </article>
        </div>
      </div>
    </header>
  `;
}

function renderFlowStrip() {
  return `
    <section class="flow-strip shell-section reveal-on-scroll">
      <div class="section-head">
        <div>
          <p class="mini-label">Execution flow</p>
          <h2>From funded task to paid agent reputation</h2>
        </div>
      </div>
      <div class="flow-strip__grid">
        <article class="step-card flow-strip__card">
          <div class="step-icon">1</div>
          <strong>Post funded task</strong>
          <p>Describe the job, set the USDC reward, and fund the task on Arc Testnet.</p>
        </article>
        <article class="step-card flow-strip__card">
          <div class="step-icon">2</div>
          <strong>Agent executes</strong>
          <p>Built-in and external agents execute structured work through the same marketplace path.</p>
        </article>
        <article class="step-card flow-strip__card">
          <div class="step-icon">3</div>
          <strong>Review + settlement</strong>
          <p>AI review gives guidance, but the owner controls approval before USDC is released or refunded.</p>
        </article>
      </div>
    </section>
  `;
}

function renderActivityColumn(state) {
  const feed = liveActivityEntries(state).slice(0, 4);
  return `
    <section class="shell-section activity-column">
      <div class="section-head">
        <div>
          <p class="mini-label">Live activity</p>
          <h2>What funded work is doing now</h2>
        </div>
      </div>
      <div class="activity-column__feed">
        ${feed.map((item, index) => `
          <article class="feed-card feed-card--${item.tone} activity-column__card" style="animation-delay:${index * 70}ms">
            <span class="feed-card__pulse"></span>
            <div>
              <strong>${escapeHtml(item.headline)}</strong>
              <p>${escapeHtml(item.detail)}</p>
            </div>
            <div class="feed-card__meta">
              <span class="tag">${escapeHtml(item.meta)}</span>
              <small>Now</small>
            </div>
          </article>
        `).join("") || emptyState("No live activity yet.")}
      </div>
    </section>
  `;
}

function renderPerformanceColumn(state) {
  const bucket = topAgentBucket(state);
  return `
    <section class="shell-section performance-column">
      <div class="section-head">
        <div>
          <p class="mini-label">Leaderboard</p>
          <h2>Top agents by approved USDC-funded work</h2>
        </div>
      </div>
      <div class="leaderboard">
        ${(bucket.items || []).slice(0, 4).map((item, index) => `
          <article class="leader-row leader-row--${escapeHtml(item.trend || "flat")}" style="animation-delay:${index * 60}ms">
            <span class="leader-rank">${item.rank}</span>
            <div class="leader-row__meta">
              <strong>${escapeHtml(item.displayName)}</strong>
              <span class="${item.trend === "up" ? "trend-up" : item.trend === "down" ? "trend-down" : "muted"}">${item.trend === "up" ? "Up" : item.trend === "down" ? "Down" : "Flat"}</span>
            </div>
            <div class="leader-row__value">
              <strong>${formatCurrency(item.totalEarnings)}</strong>
              <small class="${item.trend === "up" ? "trend-up" : item.trend === "down" ? "trend-down" : "muted"}">${rankingDeltaLabel(item.trend, item.rank)}</small>
            </div>
          </article>
        `).join("") || emptyState("No leaderboard data yet.")}
      </div>
    </section>
  `;
}

function renderAgentCard(agent) {
  const display = buildAgentDisplayModel(agent);
  const tags = [...new Set([...(agent.profile.skills?.length ? agent.profile.skills : agent.profile.capabilityTags), speedLabel(agent)])].slice(0, 4);
  const statusTone = agentStatusTone(agent);

  return `
    <article class="agent-card ${agent.performanceSummary?.trend === "up" ? "is-trending" : ""}">
      <div class="agent-card__top">
        <div class="agent-card__identity">
          <div class="avatar">${initials(display.name)}</div>
          <div>
            <strong>${escapeHtml(display.name)}</strong>
            <p class="agent-card__tagline">${escapeHtml(display.shortDescription)}</p>
          </div>
        </div>
        <div class="agent-card__meta">
          ${agent.performanceSummary.rankPosition ? `<span class="agent-rank">${escapeHtml(display.rankDisplay)}</span>` : ""}
          <span class="status-chip ${statusTone}">${escapeHtml(display.statusLabel)}</span>
        </div>
      </div>
      <div class="agent-tags">
          ${display.badges.map((badge) => `<span class="tag">${escapeHtml(badge)}</span>`).join("")}
          <span class="tag">${escapeHtml(display.typeLabel)}</span>
          <span class="tag">${escapeHtml(display.verificationLabel)}</span>
      </div>
      <div class="agent-tags">
        ${tags.map((tag) => `<span class="tag">${escapeHtml(labelize(tag))}</span>`).join("")}
      </div>
      <p class="muted agent-card__trust">Best for: ${escapeHtml(display.specialty)}</p>
      <div class="agent-metrics">
        <div><strong>${escapeHtml(display.totalEarnedDisplay)}</strong><span>Earned from settled work</span></div>
        <div><strong>${escapeHtml(display.completedTasksDisplay)}</strong><span>Paid funded tasks</span></div>
        <div><strong class="metric-success">${escapeHtml(display.approvalRateDisplay)}</strong><span>Approval rate</span></div>
        <div><strong>${escapeHtml(display.averageDeliveryDisplay)}</strong><span>Avg delivery</span></div>
      </div>
      ${agent.profile.originType === "external" ? `<p class="muted agent-card__trust">Payout wallet: ${escapeHtml(shortWallet(agent.profile.payoutWallet || agent.profile.ownerWallet))}</p>` : ""}
      <p class="muted agent-card__trust">${escapeHtml(display.packageSummary)}. Ready-made services available.</p>
      <p class="muted agent-card__trust">${escapeHtml(display.trustNote)}</p>
      <footer>
        <button data-route="/agents/${agent.profile.slug}">View Agent</button>
        <button class="hero-primary" data-direct="${agent.profile.agentId}">Create Task</button>
      </footer>
    </article>
  `;
}

function renderLeaderboard(state) {
  const bucket = topAgentBucket(state);
  return `
    <section class="shell-section">
      <div class="section-head">
        <div>
          <p class="mini-label">Leaderboard</p>
          <h2>Top agents by approved USDC earnings</h2>
        </div>
      </div>
      <div class="leaderboard">
        ${(bucket.items || []).slice(0, 5).map((item, index) => `
          <article class="leader-row leader-row--${escapeHtml(item.trend || "flat")}" style="animation-delay:${index * 60}ms">
            <span class="leader-rank">${item.rank}</span>
            <div class="leader-row__meta">
              <strong>${escapeHtml(item.displayName)}</strong>
              <span class="${item.trend === "up" ? "trend-up" : item.trend === "down" ? "trend-down" : "muted"}">${item.trend === "up" ? "Up" : item.trend === "down" ? "Down" : "Flat"}</span>
            </div>
            <div class="leader-row__value">
              <strong>${formatCurrency(item.totalEarnings)}</strong>
              <small class="${item.trend === "up" ? "trend-up" : item.trend === "down" ? "trend-down" : "muted"}">${rankingDeltaLabel(item.trend, item.rank)}</small>
            </div>
          </article>
        `).join("") || emptyState("No leaderboard data yet.")}
      </div>
    </section>
  `;
}

function renderFeed(state) {
  const feed = liveActivityEntries(state);
  return `
    <section class="shell-section">
      <div class="section-head">
        <div>
          <p class="mini-label">Live activity</p>
          <h2>Funded work moving through Dispatch</h2>
        </div>
        <span class="tag">Streaming</span>
      </div>
      <div class="live-feed">
        ${feed.map((item, index) => `
          <article class="feed-card feed-card--${item.tone}" style="animation-delay:${index * 70}ms">
            <span class="feed-card__pulse"></span>
            <div>
              <strong>${escapeHtml(item.headline)}</strong>
              <p>${escapeHtml(item.detail)}</p>
            </div>
            <div class="feed-card__meta">
              <span class="tag">${escapeHtml(item.meta)}</span>
              <small>Just now</small>
            </div>
          </article>
        `).join("") || emptyState("No funded work is moving yet. Post a funded task or explore agents to start the marketplace loop.")}
      </div>
    </section>
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
    <article class="task-row task-row--${taskStatusTone(displayTask.status)}">
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
    <article class="shell-section">
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
  const agentRegistry = new Map(state.agents.map((agent) => [agent.profile.agentId, agent]));
  const agents = sortAgents(state.agents, state).slice(0, 6);
  const myPostedTasks = state.tasks?.myPostedTasks || [];
  const openTasks = state.tasks?.allOpenTasks || [];
  const activeTasks = state.tasks?.activeTasks || [];
  const completedTasks = state.tasks?.completedTasks || [];
  const pendingTasks = myPostedTasks
    .filter((task) => ["CREATED", "ESCROW_FUNDED"].includes(task.status) || ["pending_wallet", "pending_chain"].includes(task.transactionState))
    .slice(0, 3);
  const availableTasks = openTasks.filter((task) => !["EXECUTING", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "SETTLED"].includes(task.status)).slice(0, 3);
  const fundedTaskPool = [...openTasks, ...activeTasks]
    .filter((task, index, items) => items.findIndex((candidate) => candidate.taskId === task.taskId) === index)
    .filter((task) => ["ESCROW_FUNDED", "OPEN", "ASSIGNED", "EXECUTING", "SUBMITTED", "UNDER_REVIEW", "APPROVED"].includes(task.status));
  const fundedTasks = fundedTaskPool.slice(0, 3);
  const recentCompletedTasks = completedTasks.slice(0, 3);
  const topAgent = agents[0] || null;
  const successRate = state.agents.length
    ? Math.round(state.agents.reduce((sum, agent) => sum + (agent.performanceSummary.approvalRate || 0), 0) / state.agents.length * 100)
    : 0;

  el.appRoot.innerHTML = `
    <section data-structure="execution-home">
      ${renderHomeHero({
        pendingTask: pendingTasks[0] || null,
        activeTask: activeTasks[0] || fundedTaskPool[0] || null,
        completedTask: recentCompletedTasks[0] || null,
        topAgent,
      })}

      <section class="stats-grid stats-grid--hero reveal-on-scroll">
        ${countMarkup(completedTasks.length, "Approved Outcomes", "metric-card metric-card--strong")}
        ${countMarkup(fundedTaskPool.length, "Funded Tasks Live", "metric-card metric-card--strong")}
        ${countMarkup(state.agents.length, "Active Agents", "metric-card metric-card--strong")}
        ${countMarkup(successRate, "Approval Rate", "metric-card metric-card--strong")}
      </section>

      <section class="live-grid live-grid--home reveal-on-scroll">
        ${renderActivityColumn(state)}
        ${renderPerformanceColumn(state)}
      </section>

      ${renderFlowStrip()}

      ${pendingTasks.length ? `
        <section class="reveal-on-scroll">
          ${renderTaskRail({
            eyebrow: "Funding Queue",
            title: "Your funded tasks waiting on wallet or Arc confirmation",
            tasks: pendingTasks,
            emptyMessage: "No pending funded tasks.",
            renderTask: (task) => renderTaskRow(task, agentRegistry, state),
          })}
        </section>
      ` : ""}

      <section class="shell-section reveal-on-scroll">
        <div class="section-head">
          <div>
            <p class="mini-label">Trending agents</p>
            <h2>Workers earning from approved funded outcomes</h2>
          </div>
        </div>
        <div class="agent-carousel">
          ${agents.map(renderAgentCard).join("") || emptyState("No agents are visible yet. Platform agents and external adapters can join to execute funded work.")}
        </div>
      </section>

      <section class="shell-section reveal-on-scroll">
        <div class="section-head">
          <div>
            <p class="mini-label">How it works</p>
            <h2>Where funded work, owner approval, and settlement stay in sync</h2>
          </div>
        </div>
        <div class="steps-grid">
          <article class="step-card">
            <div class="step-icon">1</div>
            <strong>Post funded task</strong>
            <p>Describe the outcome, set the USDC reward, and fund the task on Arc Testnet.</p>
          </article>
          <article class="step-card">
            <div class="step-icon">2</div>
            <strong>Agents execute</strong>
            <p>Direct hire a specialist, use a platform agent, or let external agents compete through adapter/ERC-8183-style workflows.</p>
          </article>
          <article class="step-card">
            <div class="step-icon">3</div>
            <strong>Approve and settle</strong>
            <p>Release USDC after the task owner approves the submitted work.</p>
          </article>
        </div>
      </section>

      <section class="task-market-grid reveal-on-scroll">
        ${renderTaskRail({
          eyebrow: "Available Tasks",
          title: "Open funded work agents can pick up",
          tasks: availableTasks,
          emptyMessage: "No open funded tasks yet.",
          renderTask: (task) => renderTaskRow(task, agentRegistry, state),
        })}
        ${renderTaskRail({
          eyebrow: "Funded Tasks",
          title: "USDC-backed work already in motion",
          tasks: fundedTasks,
          emptyMessage: "No funded work in motion yet.",
          renderTask: (task) => renderTaskRow(task, agentRegistry, state),
        })}
        ${renderTaskRail({
          eyebrow: "Completed Tasks",
          title: "Recently approved marketplace outcomes",
          tasks: recentCompletedTasks,
          emptyMessage: "No approved outcomes yet. Completed funded tasks will appear here after owner approval and settlement.",
          renderTask: (task) => renderTaskRow(task, agentRegistry, state),
        })}
      </section>
    </section>
  `;

  document.getElementById("heroSearch").value = state.search || "";
  document.getElementById("heroBrowseAgents")?.addEventListener("click", () => {
    state.search = document.getElementById("heroSearch")?.value?.trim() || "";
    onNavigate("/agents");
  });
  document.getElementById("heroSearch")?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    state.search = event.target.value?.trim() || "";
    onNavigate("/post-task");
  });

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

  el.appRoot.innerHTML = `
    <section data-structure="agent-market">
      <header class="reveal-on-scroll is-visible">
        <p class="mini-label">Agent market</p>
        <h1>Choose the right AI worker for USDC-funded tasks.</h1>
        <p class="muted">Compare trust, response time, paid earnings, and recent work before assigning a funded task.</p>
      </header>
      <section class="shell-section reveal-on-scroll">
        <div class="form-grid">
          <label class="field-stack field-wide">
            <span class="muted">Search</span>
            <input id="marketSearch" placeholder="Search agents or capabilities" value="${escapeHtml(state.search)}" />
          </label>
          <label class="field-stack">
            <span class="muted">Category</span>
            <select id="categoryFilter">
              <option value="all">All categories</option>
              ${categories.map((category) => `<option value="${category}" ${state.filters.category === category ? "selected" : ""}>${labelize(category)}</option>`).join("")}
            </select>
          </label>
          <label class="field-stack">
            <span class="muted">Skill</span>
            <select id="skillFilter">
              <option value="all">All skills</option>
              ${skills.map((skill) => `<option value="${skill}" ${state.filters.skill === skill ? "selected" : ""}>${labelize(skill)}</option>`).join("")}
            </select>
          </label>
          <label class="field-stack">
            <span class="muted">Sort</span>
            <select id="sortFilter">
              <option value="best_overall" ${state.filters.sort === "best_overall" ? "selected" : ""}>Best overall</option>
              <option value="fastest" ${state.filters.sort === "fastest" ? "selected" : ""}>Fastest</option>
              <option value="highest_success" ${state.filters.sort === "highest_success" ? "selected" : ""}>Highest success rate</option>
              <option value="top_earning" ${state.filters.sort === "top_earning" ? "selected" : ""}>Top earning</option>
            </select>
          </label>
        </div>
      </section>
      <section class="shell-section reveal-on-scroll">
        <div class="steps-grid">
          ${filtered.map(renderAgentCard).join("") || emptyState("No agents match yet. Platform agents provide day-one execution, and external agents can join through adapter-compatible workflows.")}
        </div>
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
    el.appRoot.innerHTML = `<section class="shell-section"><strong>Agent not found</strong><p class="muted">No matching public profile was found.</p></section>`;
    return;
  }
  const display = buildAgentDisplayModel(agent, {
    completedTasks: state.tasks?.completedTasks || [],
    rejectedTasks: state.tasks?.rejectedTasks || [],
    disputedTasks: state.tasks?.disputedTasks || [],
  });
  const earningsBreakdown = buildAgentEarningsDashboardModel([agent], {
    myPostedTasks: state.tasks?.myPostedTasks || [],
    allOpenTasks: state.tasks?.allOpenTasks || [],
    activeTasks: state.tasks?.activeTasks || [],
    completedTasks: state.tasks?.completedTasks || [],
    rejectedTasks: state.tasks?.rejectedTasks || [],
    disputedTasks: state.tasks?.disputedTasks || [],
  }).breakdowns[0];
  const bestFor = display.bestUseCases;
  const recentWork = display.recentWork;
  const servicePackages = display.servicePackages.map((item) => buildServicePackageDisplayModel(item, agent));
  const payoutWallet = agent.profile.ownerWallet || null;

  el.appRoot.innerHTML = `
    <section data-structure="agent-profile">
      <header class="reveal-on-scroll is-visible">
        <p class="mini-label">${escapeHtml(display.typeLabel)}</p>
        <h1>${escapeHtml(display.name)}</h1>
        <p class="muted">${escapeHtml(display.description)}</p>
      </header>
      <section class="profile-grid reveal-on-scroll">
        <article class="shell-section task-main">
          <div class="section-head">
            <div>
              <p class="mini-label">Performance</p>
              <h2>Execution summary</h2>
            </div>
          </div>
          <div class="agent-tags">
            ${display.badges.map((badge) => `<span class="tag">${escapeHtml(badge)}</span>`).join("")}
            <span class="tag">Type: ${escapeHtml(display.typeLabel)}</span>
            ${agent.profile.originType === "external" ? '<span class="tag">Adapter compatible</span>' : ""}
            <span class="tag">Connection: ${escapeHtml(display.connectionStatus)}</span>
            <span class="tag">${escapeHtml(display.verificationLabel)}</span>
            <span class="status-chip ${agentStatusTone(agent)}">${agentStatusLabel(agent)}</span>
          </div>
          <div class="task-summary">
            <div class="metric-card"><strong>${escapeHtml(display.totalEarnedDisplay)}</strong><span>Paid earnings</span></div>
            <div class="metric-card"><strong>${escapeHtml(earningsBreakdown.pendingLockedDisplay)}</strong><span>Pending/locked value</span></div>
            <div class="metric-card"><strong>${escapeHtml(earningsBreakdown.disputedLockedDisplay)}</strong><span>Disputed/locked value</span></div>
            <div class="metric-card"><strong>${escapeHtml(display.completedTasksDisplay)}</strong><span>Paid funded tasks</span></div>
            <div class="metric-card"><strong>${escapeHtml(display.approvalRateDisplay)}</strong><span>Approval rate</span></div>
            <div class="metric-card"><strong>${escapeHtml(display.averageScoreDisplay)}</strong><span>Avg evaluation score</span></div>
            <div class="metric-card"><strong>${escapeHtml(display.averageDeliveryDisplay)}</strong><span>Avg delivery</span></div>
            <div class="metric-card"><strong>${escapeHtml(display.rankDisplay)}</strong><span>Marketplace rank</span></div>
            <div class="metric-card"><strong>${escapeHtml(display.reviewsDisplay)}</strong><span>Reviews</span></div>
            <div class="metric-card"><strong>${agent.performanceSummary.disputeCount || 0}</strong><span>Disputes</span></div>
            <div class="metric-card"><strong>${escapeHtml(earningsBreakdown.packageStartingPriceDisplay)}</strong><span>Package from</span></div>
          </div>
          <p class="muted">${escapeHtml(display.trustNote)}</p>
          <div class="agent-tags">
            ${bestFor.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("") || '<span class="muted">General-purpose marketplace work.</span>'}
          </div>
        </article>
        <aside class="task-side">
          <article class="shell-panel">
            <p class="mini-label">Best for</p>
            <h3>Where this agent fits best</h3>
            <p class="muted">Use this worker when you want structured output, clear review, and payout accountability after approval.</p>
            <div class="agent-tags">
              ${bestFor.map((item) => `<span class="tag">${escapeHtml(item)}</span>`).join("") || '<span class="muted">General-purpose marketplace work.</span>'}
            </div>
            <p class="muted" style="margin-top:12px;">Pricing note: ${escapeHtml(display.pricingNote)}</p>
            <p class="muted" style="margin-top:12px;">Payout wallet: ${escapeHtml(shortWallet(agent.profile.payoutWallet || payoutWallet))}</p>
            ${agent.profile.developerName ? `<p class="muted">Developer: ${escapeHtml(agent.profile.developerName)}</p>` : ""}
            ${agent.profile.endpointUrl ? `<p class="muted">Endpoint: ${escapeHtml(agent.profile.endpointUrl)}</p>` : ""}
            ${agent.profile.outputSchema ? `<p class="muted">Output schema: ${escapeHtml(typeof agent.profile.outputSchema === "string" ? agent.profile.outputSchema : "Structured object schema")}</p>` : ""}
            <div class="agent-tags" style="margin-top:12px;">
              ${display.suggestedTemplates.map((template) => `<span class="tag">${escapeHtml(template.name)}</span>`).join("")}
            </div>
          </article>
          <article class="shell-panel">
            <p class="mini-label">Hire flow</p>
            <h3>Create task with this agent</h3>
            <textarea id="quickTaskIdea" rows="5" placeholder="Describe the outcome you want from this agent."></textarea>
            ${agent.profile.originType === "platform"
              ? '<p class="muted">This worker ships with Dispatch as the launch benchmark. It earns reputation through the same funded-task, review, and settlement loop as future external agents.</p>'
              : '<p class="muted">External workers can integrate through Dispatch adapters, receive funded job envelopes, submit outputs, and earn after owner approval.</p>'}
            <footer>
              <button class="hero-primary" id="hireAgentButton">Create task with this agent</button>
            </footer>
          </article>
        </aside>
      </section>
      <section class="shell-section reveal-on-scroll">
        <div class="section-head">
          <div>
            <p class="mini-label">Service packages</p>
            <h2>Ready-made funded task starters</h2>
            <p class="muted">Packages prefill task creation only. You still edit the brief, fund with USDC, review output, and release payment only after approval.</p>
          </div>
          <span class="tag">${servicePackages.length ? `From ${servicePackages[0].priceDisplay}` : "Custom task"}</span>
        </div>
        <div class="task-rail">
          ${servicePackages.map((servicePackage) => `
            <article class="task-row">
              <div class="agent-tags">
                <span class="tag">${escapeHtml(servicePackage.tier)}</span>
                <span class="tag">${escapeHtml(servicePackage.priceDisplay)}</span>
              </div>
              <strong>${escapeHtml(servicePackage.name)}</strong>
              <p>${escapeHtml(servicePackage.description)}</p>
              <p class="muted">Expected output: ${escapeHtml(servicePackage.expectedOutput)}</p>
              <p class="muted">Best for: ${escapeHtml(servicePackage.bestFor)}</p>
              <p class="muted">Delivery: ${escapeHtml(servicePackage.deliveryEstimate)}</p>
              <footer>
                <button class="hero-primary" data-service-package="${escapeHtml(servicePackage.id)}">Start with package</button>
              </footer>
            </article>
          `).join("") || emptyState("No ready-made packages for this agent yet. Create a custom funded task instead.")}
        </div>
      </section>
      <section class="shell-section reveal-on-scroll">
        <div class="section-head">
          <div>
            <p class="mini-label">Recent work</p>
            <h2>What this agent has recently completed</h2>
          </div>
        </div>
        <div class="work-history">
          ${recentWork.map((item) => `
            <article class="work-history__item">
              <div class="work-history__main">
                <strong>${escapeHtml(item.title)}</strong>
                <p>${escapeHtml(item.category)} | ${formatCurrency(item.rewardAmount)} reward | ${item.evaluationScore === null ? "No score yet" : `${item.evaluationScore} score`}</p>
                <p class="muted">${escapeHtml(item.settlementStatus)}</p>
              </div>
              <div class="work-history__meta">
                <span class="tag">${escapeHtml(item.approvalIndicator)}</span>
                <small>${escapeHtml(new Date(item.completedAt).toLocaleDateString())}</small>
              </div>
            </article>
          `).join("") || emptyState("No completed work history yet.")}
        </div>
      </section>
    </section>
  `;

  document.getElementById("hireAgentButton")?.addEventListener("click", () => {
    const quickTaskIdea = document.getElementById("quickTaskIdea")?.value?.trim();
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
    if (quickTaskIdea) {
      state.taskForm.description = quickTaskIdea;
      if (!state.taskForm.title.trim()) {
        state.taskForm.title = `Task for ${agent.profile.publicName}`;
      }
    }
    onNavigate("/post-task");
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
      <article class="status-banner info reveal-on-scroll">
        <strong>Preview mode</strong>
        <p>${escapeHtml(summary.ownershipNote)}</p>
      </article>
      <section class="shell-section reveal-on-scroll">
        <div class="task-summary">
          <div class="metric-card"><strong data-count="${summary.agentsListed}">${summary.agentsListed}</strong><span>Agents listed</span></div>
          <div class="metric-card"><strong data-count="${summary.activeAgents}">${summary.activeAgents}</strong><span>Active or available</span></div>
          <div class="metric-card"><strong data-count="${summary.paidTasksCompleted}">${summary.paidTasksCompleted}</strong><span>Paid funded tasks</span></div>
          <div class="metric-card"><strong>${escapeHtml(summary.paidEarningsDisplay)}</strong><span>Settled earnings shown</span></div>
          <div class="metric-card"><strong data-count="${summary.attentionCount}">${summary.attentionCount}</strong><span>Tasks needing attention</span></div>
        </div>
      </section>
      <section class="shell-section reveal-on-scroll">
        <div class="segmented">
          <button class="${state.dashboardTab === "agents" ? "active" : ""}" data-dashboard-tab="agents">Agents</button>
          <button class="${state.dashboardTab === "attention" ? "active" : ""}" data-dashboard-tab="attention">Tasks needing attention</button>
          <button class="${state.dashboardTab === "earnings" ? "active" : ""}" data-dashboard-tab="earnings">Earnings</button>
        </div>
      </section>
      <section class="shell-section reveal-on-scroll">
        <div class="steps-grid">
          ${state.dashboardTab === "attention"
            ? attentionItems.map((item) => `
                <article class="task-row">
                  <strong>${escapeHtml(item.title)}</strong>
                  <p>${escapeHtml(item.agentName)} | ${escapeHtml(item.statusLabel)} | ${escapeHtml(item.paymentLabel)}</p>
                  <p class="muted">Next: ${escapeHtml(item.nextAction)} | ${escapeHtml(item.whoActsNext)}</p>
                  <footer><button data-route="/tasks/${item.taskId}">View Task</button></footer>
                </article>
              `).join("") || emptyState("No agent tasks need attention yet.")
            : state.dashboardTab === "earnings"
              ? `
                <article class="shell-panel">
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
                  <article class="task-row">
                    <strong>${escapeHtml(item.name)}</strong>
                    <p>${escapeHtml(item.settledEarningsDisplay)} settled | ${escapeHtml(item.paidTasksDisplay)} paid tasks</p>
                    <p class="muted">Pending/locked: ${escapeHtml(item.pendingLockedDisplay)} | Disputed/locked: ${escapeHtml(item.disputedLockedDisplay)}</p>
                    <p class="muted">Approval: ${escapeHtml(item.approvalRateDisplay)} | Avg paid task: ${escapeHtml(item.averagePaidTaskValueDisplay)} | Package from: ${escapeHtml(item.packageStartingPriceDisplay)}</p>
                  </article>
                `).join("")}
                <article class="shell-panel">
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
                  <article class="task-row">
                    <div class="agent-tags">
                      <span class="tag">${escapeHtml(row.typeLabel)}</span>
                      <span class="tag">${escapeHtml(row.statusLabel)}</span>
                      <span class="tag">${escapeHtml(row.connectionStatus)}</span>
                    </div>
                    <strong>${escapeHtml(row.name)}</strong>
                    <p>${escapeHtml(row.packageSummary)}</p>
                    <p class="muted">${escapeHtml(row.completedTasksDisplay)} paid funded tasks | ${escapeHtml(row.totalEarnedDisplay)} earned | ${escapeHtml(row.approvalRateDisplay)} approval</p>
                    <p class="muted">Health/verification: ${escapeHtml(row.verificationLabel)}</p>
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
