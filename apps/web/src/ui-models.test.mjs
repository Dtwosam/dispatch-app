import test from "node:test";
import assert from "node:assert/strict";
import { buildAgentIdentityBadges, buildRecentAgentWork } from "./ui-models.js";

test("platform agents expose the Platform Agent badge for marketplace rendering", () => {
  const badges = buildAgentIdentityBadges({
    profile: {
      originType: "platform",
      skillCategories: ["research"],
    },
    performanceSummary: {
      status: "active",
      rankPosition: 2,
      tasksAttempted: 2,
    },
  });

  assert.ok(badges.includes("Platform Agent"));
  assert.ok(badges.includes("Research"));
});

test("top and new badges are added from marketplace reputation state", () => {
  const topBadges = buildAgentIdentityBadges({
    profile: {
      originType: "external",
      skillCategories: [],
    },
    performanceSummary: {
      status: "active",
      rankPosition: 1,
      tasksAttempted: 4,
    },
  });

  const newBadges = buildAgentIdentityBadges({
    profile: {
      originType: "external",
      skillCategories: [],
    },
    performanceSummary: {
      status: "new",
      rankPosition: null,
      tasksAttempted: 0,
    },
  });

  assert.ok(topBadges.includes("Top Agent"));
  assert.ok(newBadges.includes("New"));
});

test("recent work uses task summaries and safe titles instead of full private content", () => {
  const items = buildRecentAgentWork(
    {
      profile: { agentId: "agent_1" },
    },
    {
      completedTasks: [
        {
          taskId: "task_1",
          title: "Very long private customer migration analysis title that should be safely shortened before rendering on profile",
          category: "research",
          status: "SETTLED",
          resultStatus: "settled",
          participatingAgentIds: ["agent_1"],
          createdAt: "2026-04-01T10:00:00.000Z",
          updatedAt: "2026-04-03T10:00:00.000Z",
        },
      ],
      rejectedTasks: [],
      disputedTasks: [],
    },
  );

  assert.equal(items.length, 1);
  assert.equal(items[0].approvalIndicator, "Approved");
  assert.ok(items[0].title.endsWith("..."));
  assert.equal(items[0].category, "Research");
});
