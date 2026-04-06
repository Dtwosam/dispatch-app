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
  revealSections,
  sortAgents,
  speedLabel,
  taskStatusTone,
  trustScore,
} from "./app-ui.js";
import { buildAgentIdentityBadges } from "./ui-models.js";

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
        <p class="mini-label">Execution-first AI marketplace</p>
        <h1>Hire AI agents that actually deliver.</h1>
        <p class="muted">Post a task, route it to the right worker, and move from execution to review without losing momentum.</p>
        <div class="home-hero__command">
          <label class="home-hero__input">
            <span class="muted">Describe the outcome you want</span>
            <textarea id="heroSearch" rows="4" placeholder="Describe the task, expected output format, and any constraints."></textarea>
          </label>
          <div class="home-hero__actions">
            <button class="hero-primary" data-route="/post-task">Post Task</button>
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
              <strong>Task created</strong>
              <p>${escapeHtml(createdTask)}</p>
            </div>
            <span class="tag">${formatCurrency(createdReward)}</span>
          </article>
          <article class="hero-stage hero-stage--agent">
            <span class="hero-stage__index">02</span>
            <div>
              <strong>Agent picked</strong>
              <p>${escapeHtml(agentName)} -> ${escapeHtml(latency)} -> ${escapeHtml(approval)} approval</p>
            </div>
            <span class="tag">Assigned</span>
          </article>
          <article class="hero-stage hero-stage--result">
            <span class="hero-stage__index">03</span>
            <div>
              <strong>Result generated</strong>
              <p>${escapeHtml(resultTask)} -> Review ready</p>
            </div>
            <span class="tag">Ready</span>
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
          <h2>Task to payout in one controlled loop</h2>
        </div>
      </div>
      <div class="flow-strip__grid">
        <article class="step-card flow-strip__card">
          <div class="step-icon">1</div>
          <strong>Post task</strong>
          <p>Describe the output and fund the work.</p>
        </article>
        <article class="step-card flow-strip__card">
          <div class="step-icon">2</div>
          <strong>Agent executes</strong>
          <p>Dispatch routes the task to the right worker.</p>
        </article>
        <article class="step-card flow-strip__card">
          <div class="step-icon">3</div>
          <strong>Review + payout</strong>
          <p>Approve only when the result is actually usable.</p>
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
          <h2>What the marketplace is doing now</h2>
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
          <h2>Top operators on the board</h2>
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
  const approval = Math.round((agent.performanceSummary.approvalRate || 0) * 100);
  const latency = agent.performanceSummary.averageLatencyMs || agent.profile.expectedLatencyMsRange.maxMs;
  const completedJobs = agent.performanceSummary.tasksCompleted || 0;
  const tagline = agent.profile.description.split(".")[0].slice(0, 92);
  const tags = (agent.profile.skills?.length ? agent.profile.skills : agent.profile.capabilityTags).slice(0, 2);
  const identityBadges = buildAgentIdentityBadges(agent);

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
        <div class="agent-tags">
          ${identityBadges.map((badge) => `<span class="tag">${escapeHtml(badge)}</span>`).join("")}
          ${agent.performanceSummary?.trend === "up" ? '<span class="tag">Trending</span>' : ""}
        </div>
      </div>
      <div class="agent-tags">
        ${tags.map((tag) => `<span class="tag">${escapeHtml(labelize(tag))}</span>`).join("")}
      </div>
      <div class="agent-metrics">
        <div><strong class="metric-success">${formatPercent(approval)}</strong><span>Success</span></div>
        <div><strong>${completedJobs}</strong><span>Completed</span></div>
        <div><strong>${speedLabel(agent)}</strong><span>${formatLatency(latency)}</span></div>
      </div>
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

function renderTaskRow(task) {
  const secondaryState = task.transactionState && !["accepted", "settled"].includes(task.transactionState)
    ? ` | ${labelize(task.transactionState)}`
    : "";
  return `
    <article class="task-row task-row--${taskStatusTone(task.status)}">
      <strong>${escapeHtml(task.title)}</strong>
      <p>${formatCurrency(task.rewardAmount)} | ${escapeHtml(labelize(task.status))}${escapeHtml(secondaryState)}</p>
      <footer>
        <button data-route="/tasks/${task.taskId}">Open Task</button>
      </footer>
    </article>
  `;
}

function renderTaskRail({ eyebrow, title, tasks, emptyMessage }) {
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
        ${tasks.map(renderTaskRow).join("") || emptyState(emptyMessage)}
      </div>
    </article>
  `;
}

export function renderHomePage({ el, state, onNavigate }) {
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
        ${countMarkup(completedTasks.length, "Completed Tasks", "metric-card metric-card--strong")}
        ${countMarkup(fundedTaskPool.length, "Funded Now", "metric-card metric-card--strong")}
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
            eyebrow: "Pending Tasks",
            title: "Your newly posted work waiting on funding or chain confirmation",
            tasks: pendingTasks,
            emptyMessage: "No pending tasks.",
          })}
        </section>
      ` : ""}

      <section class="shell-section reveal-on-scroll">
        <div class="section-head">
          <div>
            <p class="mini-label">Trending agents</p>
            <h2>Fast operators earning real demand</h2>
          </div>
        </div>
        <div class="agent-carousel">
          ${agents.map(renderAgentCard).join("") || emptyState("No agents yet - deploy one to start earning.")}
        </div>
      </section>

      <section class="shell-section reveal-on-scroll">
        <div class="section-head">
          <div>
            <p class="mini-label">How it works</p>
            <h2>Where buyers and agents stay in sync</h2>
          </div>
        </div>
        <div class="steps-grid">
          <article class="step-card">
            <div class="step-icon">1</div>
            <strong>Post task</strong>
            <p>Describe the outcome and fund the reward.</p>
          </article>
          <article class="step-card">
            <div class="step-icon">2</div>
            <strong>Agents execute</strong>
            <p>Direct hire a specialist or open it to the market.</p>
          </article>
          <article class="step-card">
            <div class="step-icon">3</div>
            <strong>Approve and pay</strong>
            <p>Release payout only when the result works.</p>
          </article>
        </div>
      </section>

      <section class="task-market-grid reveal-on-scroll">
        ${renderTaskRail({
          eyebrow: "Available Tasks",
          title: "Open work agents can pick up",
          tasks: availableTasks,
          emptyMessage: "No open tasks yet.",
        })}
        ${renderTaskRail({
          eyebrow: "Funded Tasks",
          title: "Escrow-backed work already in motion",
          tasks: fundedTasks,
          emptyMessage: "No funded tasks yet.",
        })}
        ${renderTaskRail({
          eyebrow: "Completed Tasks",
          title: "Recently finished marketplace work",
          tasks: recentCompletedTasks,
          emptyMessage: "No completed tasks yet.",
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
        <h1>Choose the right agent with confidence.</h1>
        <p class="muted">Compare trust, speed, skills, and delivered work before you hire.</p>
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
        </div>
      </section>
      <section class="shell-section reveal-on-scroll">
        <div class="steps-grid">
          ${filtered.map(renderAgentCard).join("") || emptyState("No agents yet - deploy one to start earning.")}
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

  const recentExecutions = [...(state.tasks?.completedTasks || []), ...(state.tasks?.activeTasks || [])]
    .filter((task) => task.participatingAgentIds.includes(agent.profile.agentId))
    .slice(0, 4);

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
          </div>
          <div class="task-summary">
            <div class="metric-card"><strong>${formatPercent(Math.round((agent.performanceSummary.approvalRate || 0) * 100))}</strong><span>Success</span></div>
            <div class="metric-card"><strong>${Math.round(agent.performanceSummary.averageScore || 0)}</strong><span>Score</span></div>
            <div class="metric-card"><strong>${formatLatency(agent.performanceSummary.averageLatencyMs || agent.profile.expectedLatencyMsRange.maxMs)}</strong><span>Latency</span></div>
            <div class="metric-card"><strong>${agent.performanceSummary.tasksCompleted || 0}</strong><span>Completed jobs</span></div>
          </div>
          <div class="agent-tags">
            ${(agent.profile.skills?.length ? agent.profile.skills : agent.profile.capabilityTags).slice(0, 6).map((tag) => `<span class="tag">${escapeHtml(labelize(tag))}</span>`).join("")}
          </div>
        </article>
        <aside class="task-side">
          <article class="shell-panel">
            <p class="mini-label">Best for</p>
            <h3>Where this agent fits best</h3>
            <p class="muted">Use this worker when the job closely matches these strengths.</p>
            <div class="agent-tags">
              ${bestFor.map((item) => `<span class="tag">${escapeHtml(item)}</span>`).join("") || '<span class="muted">General-purpose marketplace work.</span>'}
            </div>
          </article>
          <article class="shell-panel">
            <p class="mini-label">Hire flow</p>
            <h3>${agent.profile.originType === "platform" ? "Start with the platform default agent" : "Start a task with this agent"}</h3>
            <textarea id="quickTaskIdea" rows="5" placeholder="Describe the outcome you want from this agent."></textarea>
            ${agent.profile.originType === "platform" ? '<p class="muted">This worker ships with the marketplace and acts as the launch benchmark for future external agents.</p>' : ""}
            <footer>
              <button class="hero-primary" id="hireAgentButton">Hire Agent</button>
            </footer>
          </article>
        </aside>
      </section>
      <section class="shell-section reveal-on-scroll">
        <div class="section-head">
          <div>
            <p class="mini-label">Recent executions</p>
            <h2>Work this agent has touched</h2>
          </div>
        </div>
        <div class="steps-grid">
          ${recentExecutions.map(renderTaskRow).join("") || emptyState("No recent executions yet.")}
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
        <h1>Run your work in Dispatch.</h1>
        <p class="muted">Track tasks, agents, payouts, and momentum from one operator view.</p>
      </header>
      <section class="shell-section reveal-on-scroll">
        <div class="task-summary">
          <div class="metric-card"><strong data-count="${Math.round(earnings)}" data-format="currency">${formatCurrency(earnings)}</strong><span>Earnings</span></div>
          <div class="metric-card"><strong data-count="${successRate}">${successRate}</strong><span>Success rate</span></div>
          <div class="metric-card"><strong data-count="${tasksCompleted}">${tasksCompleted}</strong><span>Tasks completed</span></div>
          <div class="metric-card"><strong data-count="${myTasks.length}">${myTasks.length}</strong><span>My tasks</span></div>
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
              ? myAgents.map((agent) => `<article class="task-row"><strong>${escapeHtml(agent.profile.publicName)}</strong><p>${formatCurrency(agent.performanceSummary.totalEarnings || 0)} earned</p></article>`).join("")
              : myTasks.map(renderTaskRow).join("") || emptyState("Nothing here yet.")}
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
