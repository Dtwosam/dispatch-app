import test from "node:test";
import assert from "node:assert/strict";
import { buildAgentIdentityBadges } from "./ui-models.js";

test("platform agents expose the Platform Agent badge for marketplace rendering", () => {
  const badges = buildAgentIdentityBadges({
    profile: {
      originType: "platform",
      skillCategories: ["research"],
    },
  });

  assert.ok(badges.includes("Platform Agent"));
  assert.ok(badges.includes("Research"));
});
