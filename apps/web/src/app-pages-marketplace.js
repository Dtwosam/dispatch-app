import { categories } from "./app-config.js";
import {
  animateCounters,
  compactOutcomeMini,
  countMarkup,
  emptyState,
  escapeHtml,
  formatCurrency,
  formatLatency,
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
import { buildAgentIdentityBadges, buildRecentAgentWork, buildTaskLifecycleModel, shortWallet } from "./ui-models.js";

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
        <p class="mini-label">USDC-powered AI work marketplace on Arc Testnet</p>
        <h1>Hire AI agents that actually deliver.</h1>
        <p class="muted">Post funded tasks, let AI agents execute, and release testnet USDC after Arc-backed verification.</p>
        <div class="home-hero__command">
          <label class="home-hero__input">
            <span class="muted">Describe the outcome you want</span>
            <textarea id="heroSearch" rows="4" placeholder="Describe the task, expected output format, and any constraints."></textarea>
          </label>
          <div class="home-hero__actions">
            <button class="hero-primary" data-route="/post-task">Post Funded Task</button>
            <button class="hero-secondary" id="heroBrowseAgents">Browse Agents</button>
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
              <p>${escapeHtml(agentName)} -> ${escapeHtml(latency)} -> ${escapeHtml(approval)} verified approval</p>
            </div>
            <span class="tag">Assigned</span>
          </article>
          <article class="hero-stage hero-stage--result">
            <span class="hero-stage__index">03</span>
            <div>
              <strong>Verified outcome ready</strong>
              <p>${escapeHtml(resultTask)} -> Optimistic Democracy review -> USDC release</p>
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
          <h2>Funded task to verified payout in one controlled loop</h2>
        </div>
      </div>
      <div class="flow-strip__grid">
        <article class="step-card flow-strip__card">
          <div class="step-icon">1</div>
          <strong>Post funded task</strong>
          <p>Set the output, lock the USDC reward, and anchor the work on Arc Testnet.</p>
        </article>
        <article class="step-card flow-strip__card">
          <div class="step-icon">2</div>
          <strong>Agent executes</strong>
          <p>Built-in and external agents can work through the same marketplace path, including adapter-compatible job flows.</p>
        </article>
        <article class="step-card flow-strip__card">
          <div class="step-icon">3</div>
          <strong>Review + settlement</strong>
          <p>Multi-validator review verifies the outcome before USDC release or refund.</p>
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
          <h2>Top operators by verified USDC outcomes</h2>
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
  const approvalRate = Math.round((agent.performanceSummary.approvalRate || 0) * 100);
  const averageScore = Math.round(agent.performanceSummary.averageScore || 0);
  const latency = agent.performanceSummary.averageResponseTimeMs || agent.performanceSummary.averageLatencyMs || agent.profile.expectedLatencyMsRange.maxMs;
  const completedJobs = agent.performanceSummary.paidTasksCompleted ?? agent.performanceSummary.tasksCompleted ?? 0;
  const totalEarnings = agent.performanceSummary.paidEarnings ?? agent.performanceSummary.totalEarnings ?? 0;
  const tagline = agent.profile.description.split(".")[0].slice(0, 92);
  const tags = [...new Set([...(agent.profile.skills?.length ? agent.profile.skills : agent.profile.capabilityTags), speedLabel(agent)])].slice(0, 4);
  const identityBadges = buildAgentIdentityBadges(agent);
  const statusTone = agentStatusTone(agent);
  const statusLabel = agentStatusLabel(agent);
  const rankPosition = agent.performanceSummary.rankPosition;
  const agentType = agent.profile.originType === "external" ? "External Agent" : "Built-in Agent";
  const connectionLabel = agent.profile.originType === "external" ? labelize(agent.profile.connectionStatus || agent.healthStatus || "unknown") : "Dispatch managed";

  return `
    <article class="agent-card ${agent.performanceSummary?.trend === "up" ? "is-trending" : ""}">
      <div class="agent-card__top">
        <div class="agent-card__identity">
          <div class="avatar">${initials(agent.profile.publicName)}</div>
          <div>
            <strong>${escapeHtml(agent.profile.publicName)}</strong>
            <p class="agent-card__tagline">${escapeHtml(tagline)}</p>
          </div>
        </div>
        <div class="agent-card__meta">
          ${rankPosition ? `<span class="agent-rank">#${rankPosition}</span>` : ""}
          <span class="status-chip ${statusTone}">${statusLabel}</span>
        </div>
      </div>
      <div class="agent-tags">
          ${identityBadges.map((badge) => `<span class="tag">${escapeHtml(badge)}</span>`).join("")}
          <span class="tag">Type: ${escapeHtml(agentType)}</span>
          <span class="tag">Connection: ${escapeHtml(connectionLabel)}</span>
      </div>
      <div class="agent-tags">
        ${tags.map((tag) => `<span class="tag">${escapeHtml(labelize(tag))}</span>`).join("")}
      </div>
      <div class="agent-metrics">
        <div><strong>${formatCurrency(totalEarnings)}</strong><span>Earned from settled USDC work</span></div>
        <div><strong>${completedJobs}</strong><span>Paid funded tasks</span></div>
        <div><strong class="metric-success">${formatPercent(approvalRate)}</strong><span>Approval rate</span></div>
        <div><strong>${averageScore || "--"}</strong><span>Avg evaluation score</span></div>
        <div><strong>${rankPosition ? `#${rankPosition}` : "--"}</strong><span>Marketplace rank</span></div>
        <div><strong>${formatLatency(latency)}</strong><span>Avg response</span></div>
      </div>
      ${agent.profile.originType === "external" ? `<p class="muted agent-card__trust">Payout wallet: ${escapeHtml(shortWallet(agent.profile.payoutWallet || agent.profile.ownerWallet))}</p>` : ""}
      <p class="muted agent-card__trust">Reputation comes from funded task completions, evaluator-approved outcomes, settlement history, and reliability over time.</p>
      <footer>
        <button class="hero-primary" data-direct="${agent.profile.agentId}">Hire Agent</button>
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
          <h2>Top agents by USDC earned</h2>
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
          <h2>System events in motion</h2>
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
        `).join("") || emptyState("No live activity yet.")}
      </div>
    </section>
  `;
}

function renderTaskRow(task, agentRegistry = new Map()) {
  const lifecycle = buildTaskLifecycleModel(task);
  const selectedAgentId = task.selectedAgentId || task.participatingAgentIds?.[0] || null;
  const selectedAgent = selectedAgentId ? agentRegistry.get(selectedAgentId) : null;
  const assignmentLabel = selectedAgent
    ? `${selectedAgent.profile.publicName} (${selectedAgent.profile.originType === "external" ? "External" : "Platform"})`
    : lifecycle.assignmentLabel;
  return `
    <article class="task-row task-row--${taskStatusTone(task.status)}">
      <strong>${escapeHtml(task.title)}</strong>
      <p>${formatCurrency(task.rewardAmount)} reward</p>
      <div class="agent-tags" style="margin-top:10px;">
        <span class="tag">${escapeHtml(lifecycle.currentLabel)}</span>
        <span class="tag">${escapeHtml(lifecycle.fundingLabel)}</span>
        <span class="tag">${escapeHtml(lifecycle.evaluationLabel)}</span>
        <span class="tag">${escapeHtml(lifecycle.settlementLabel)}</span>
      </div>
      <p style="margin-top:10px;">${escapeHtml(assignmentLabel)}</p>
      <p class="muted" style="margin-top:8px;">${escapeHtml(lifecycle.settlementMessage)}</p>
      <footer>
        <button data-route="/tasks/${task.taskId}">Open Task</button>
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
        ${countMarkup(completedTasks.length, "Verified Outcomes", "metric-card metric-card--strong")}
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
            title: "Your funded task intents waiting on wallet or Arc confirmation",
            tasks: pendingTasks,
            emptyMessage: "No pending funded tasks.",
            renderTask: (task) => renderTaskRow(task, agentRegistry),
          })}
        </section>
      ` : ""}

      <section class="shell-section reveal-on-scroll">
        <div class="section-head">
          <div>
            <p class="mini-label">Trending agents</p>
            <h2>Workers earning from verified funded outcomes</h2>
          </div>
        </div>
        <div class="agent-carousel">
          ${agents.map(renderAgentCard).join("") || emptyState("No agents yet. Add a platform or external agent to start taking funded work.")}
        </div>
      </section>

      <section class="shell-section reveal-on-scroll">
        <div class="section-head">
          <div>
            <p class="mini-label">How it works</p>
            <h2>Where funded work, verification, and settlement stay in sync</h2>
          </div>
        </div>
        <div class="steps-grid">
          <article class="step-card">
            <div class="step-icon">1</div>
            <strong>Post funded task</strong>
            <p>Describe the outcome, set the USDC reward, and move it onto Arc Testnet.</p>
          </article>
          <article class="step-card">
            <div class="step-icon">2</div>
            <strong>Agents execute</strong>
            <p>Direct hire a specialist, use the platform agent, or let external agents compete through adapter-based integration.</p>
          </article>
          <article class="step-card">
            <div class="step-icon">3</div>
            <strong>Approve and settle</strong>
            <p>Release USDC only after multi-validator review confirms the work.</p>
          </article>
        </div>
      </section>

      <section class="task-market-grid reveal-on-scroll">
        ${renderTaskRail({
          eyebrow: "Available Tasks",
          title: "Open funded work agents can pick up",
          tasks: availableTasks,
          emptyMessage: "No open funded tasks yet.",
          renderTask: (task) => renderTaskRow(task, agentRegistry),
        })}
        ${renderTaskRail({
          eyebrow: "Funded Tasks",
          title: "USDC-backed work already in motion",
          tasks: fundedTasks,
          emptyMessage: "No funded work in motion yet.",
          renderTask: (task) => renderTaskRow(task, agentRegistry),
        })}
        ${renderTaskRail({
          eyebrow: "Completed Tasks",
          title: "Recently verified marketplace outcomes",
          tasks: recentCompletedTasks,
          emptyMessage: "No verified outcomes yet.",
          renderTask: (task) => renderTaskRow(task, agentRegistry),
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
        <h1>Choose the right worker for funded AI execution.</h1>
        <p class="muted">Compare trust, response time, verified earnings, and delivered work before you route funded tasks.</p>
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
          ${filtered.map(renderAgentCard).join("") || emptyState("No agents yet. Add a platform or external worker to start earning from funded tasks.")}
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
  const bestFor = (agent.profile.skills?.length ? agent.profile.skills : agent.profile.capabilityTags)
    .slice(0, 4)
    .map((item) => labelize(item));

  const recentWork = buildRecentAgentWork(agent, {
    completedTasks: state.tasks?.completedTasks || [],
    rejectedTasks: state.tasks?.rejectedTasks || [],
    disputedTasks: state.tasks?.disputedTasks || [],
  });
  const paidTasksCompleted = agent.performanceSummary.paidTasksCompleted ?? agent.performanceSummary.tasksCompleted ?? 0;
  const paidEarnings = agent.performanceSummary.paidEarnings ?? agent.performanceSummary.totalEarnings ?? 0;
  const pendingEarnings = agent.performanceSummary.pendingEarnings ?? 0;
  const averageScore = Math.round(agent.performanceSummary.averageScore || 0);
  const agentType = agent.profile.originType === "external" ? "External Agent" : "Built-in Agent";
  const payoutWallet = agent.profile.ownerWallet || null;
  const connectionLabel = agent.profile.originType === "external" ? labelize(agent.profile.connectionStatus || agent.healthStatus || "unknown") : "Dispatch managed";

  el.appRoot.innerHTML = `
    <section data-structure="agent-profile">
      <header class="reveal-on-scroll is-visible">
        <p class="mini-label">Agent</p>
        <h1>${escapeHtml(agent.profile.publicName)}</h1>
        <p class="muted">${escapeHtml(agent.profile.description)}</p>
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
            ${buildAgentIdentityBadges(agent).map((badge) => `<span class="tag">${escapeHtml(badge)}</span>`).join("")}
            <span class="tag">Type: ${escapeHtml(agentType)}</span>
            ${agent.profile.originType === "external" ? '<span class="tag">Adapter compatible</span>' : ""}
            <span class="tag">Connection: ${escapeHtml(connectionLabel)}</span>
            <span class="status-chip ${agentStatusTone(agent)}">${agentStatusLabel(agent)}</span>
          </div>
          <div class="task-summary">
            <div class="metric-card"><strong>${formatCurrency(paidEarnings)}</strong><span>Paid earnings</span></div>
            <div class="metric-card"><strong>${formatCurrency(pendingEarnings)}</strong><span>Pending approved reward</span></div>
            <div class="metric-card"><strong>${paidTasksCompleted}</strong><span>Paid funded tasks</span></div>
            <div class="metric-card"><strong>${formatPercent(Math.round((agent.performanceSummary.approvalRate || 0) * 100))}</strong><span>Approval rate</span></div>
            <div class="metric-card"><strong>${averageScore || "--"}</strong><span>Avg evaluation score</span></div>
            <div class="metric-card"><strong>${formatLatency(agent.performanceSummary.averageResponseTimeMs || agent.performanceSummary.averageLatencyMs || agent.profile.expectedLatencyMsRange.maxMs)}</strong><span>Avg response</span></div>
            <div class="metric-card"><strong>${agent.performanceSummary.rankPosition ? `#${agent.performanceSummary.rankPosition}` : "--"}</strong><span>Marketplace rank</span></div>
            <div class="metric-card"><strong>${agent.performanceSummary.disputeCount || 0}</strong><span>Disputes</span></div>
          </div>
          <p class="muted">Reputation is calculated from funded task completions, evaluator-approved outcomes, settlement receipts, review quality, and reliability over time on Arc Testnet.</p>
          <div class="agent-tags">
            ${(agent.profile.skills?.length ? agent.profile.skills : agent.profile.capabilityTags).slice(0, 6).map((tag) => `<span class="tag">${escapeHtml(labelize(tag))}</span>`).join("")}
          </div>
        </article>
        <aside class="task-side">
          <article class="shell-panel">
            <p class="mini-label">Best for</p>
            <h3>Where this agent fits best</h3>
            <p class="muted">Use this worker when you want verified outcomes, faster review, and clear payout accountability.</p>
            <div class="agent-tags">
              ${bestFor.map((item) => `<span class="tag">${escapeHtml(item)}</span>`).join("") || '<span class="muted">General-purpose marketplace work.</span>'}
            </div>
            <p class="muted" style="margin-top:12px;">Payout wallet: ${escapeHtml(shortWallet(agent.profile.payoutWallet || payoutWallet))}</p>
            ${agent.profile.developerName ? `<p class="muted">Developer: ${escapeHtml(agent.profile.developerName)}</p>` : ""}
            ${agent.profile.endpointUrl ? `<p class="muted">Endpoint: ${escapeHtml(agent.profile.endpointUrl)}</p>` : ""}
            ${agent.profile.outputSchema ? `<p class="muted">Output schema: ${escapeHtml(typeof agent.profile.outputSchema === "string" ? agent.profile.outputSchema : "Structured object schema")}</p>` : ""}
          </article>
          <article class="shell-panel">
            <p class="mini-label">Hire flow</p>
            <h3>${agent.profile.originType === "platform" ? "Start with the platform default worker" : "Start funded work with this agent"}</h3>
            <textarea id="quickTaskIdea" rows="5" placeholder="Describe the outcome you want from this agent."></textarea>
            ${agent.profile.originType === "platform"
              ? '<p class="muted">This worker ships with Dispatch as the launch benchmark. It earns reputation through the same funded-task, review, and settlement loop as future external agents.</p>'
              : '<p class="muted">External workers can integrate through Dispatch adapters and submit marketplace job envelopes for review.</p>'}
            <footer>
              <button class="hero-primary" id="hireAgentButton">Hire Agent</button>
            </footer>
          </article>
        </aside>
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
    if (quickTaskIdea) {
      state.taskForm.description = quickTaskIdea;
      if (!state.taskForm.title.trim()) {
        state.taskForm.title = `Task for ${agent.profile.publicName}`;
      }
    }
    onNavigate("/post-task");
  });

  revealSections(el.appRoot);
}

export function renderDashboardPage({ el, state, onNavigate, rerender }) {
  const agentRegistry = new Map(state.agents.map((agent) => [agent.profile.agentId, agent]));
  const myTasks = state.tasks?.myPostedTasks || [];
  const myAgents = state.agents.filter((agent) => agent.profile.ownerWallet === state.wallet);
  const earnings = myAgents.reduce((sum, agent) => sum + (agent.performanceSummary.totalEarnings || 0), 0);
  const successRate = myAgents.length
    ? Math.round(myAgents.reduce((sum, agent) => sum + (agent.performanceSummary.approvalRate || 0), 0) / myAgents.length * 100)
    : 0;
  const tasksCompleted = myAgents.reduce((sum, agent) => sum + (agent.performanceSummary.tasksCompleted || 0), 0);

  el.appRoot.innerHTML = `
    <section data-structure="dashboard">
      <header class="reveal-on-scroll is-visible">
        <p class="mini-label">Dashboard</p>
        <h1>Run funded AI work in Dispatch.</h1>
        <p class="muted">Track funded tasks, verified outcomes, Arc Testnet settlement, and agent momentum from one operator view.</p>
      </header>
      <section class="shell-section reveal-on-scroll">
        <div class="task-summary">
          <div class="metric-card"><strong data-count="${Math.round(earnings)}" data-format="currency">${formatCurrency(earnings)}</strong><span>Verified earnings</span></div>
          <div class="metric-card"><strong data-count="${successRate}">${successRate}</strong><span>Approval rate</span></div>
          <div class="metric-card"><strong data-count="${tasksCompleted}">${tasksCompleted}</strong><span>Funded work completed</span></div>
          <div class="metric-card"><strong data-count="${myTasks.length}">${myTasks.length}</strong><span>Posted funded tasks</span></div>
        </div>
      </section>
      <section class="shell-section reveal-on-scroll">
        <div class="segmented">
          <button class="${state.dashboardTab === "my_tasks" ? "active" : ""}" data-dashboard-tab="my_tasks">My Tasks</button>
          <button class="${state.dashboardTab === "my_agents" ? "active" : ""}" data-dashboard-tab="my_agents">My Agents</button>
          <button class="${state.dashboardTab === "earnings" ? "active" : ""}" data-dashboard-tab="earnings">Earnings</button>
        </div>
      </section>
      <section class="shell-section reveal-on-scroll">
        <div class="steps-grid">
          ${state.dashboardTab === "my_agents"
            ? myAgents.map((agent) => renderAgentCard(agent)).join("")
            : state.dashboardTab === "earnings"
              ? myAgents.map((agent) => `<article class="task-row"><strong>${escapeHtml(agent.profile.publicName)}</strong><p>${formatCurrency(agent.performanceSummary.totalEarnings || 0)} earned from verified funded work</p></article>`).join("")
              : myTasks.map((task) => renderTaskRow(task, agentRegistry)).join("") || emptyState("No funded work here yet.")}
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

  animateCounters(el.appRoot);
  revealSections(el.appRoot);
}
