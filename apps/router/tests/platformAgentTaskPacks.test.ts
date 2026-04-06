import test from "node:test";
import assert from "node:assert/strict";
import { getPlatformAgentTaskPack, platformAgentTaskPacks } from "../src/evals/platformAgentTaskPacks";

test("platform agent task packs stay normalized and evaluation-ready", () => {
  assert.ok(platformAgentTaskPacks.length >= 9, "expected at least nine stored task packs");

  const clauseLens = getPlatformAgentTaskPack("ClauseLens");
  assert.ok(clauseLens, "expected ClauseLens task pack to exist");
  assert.equal(clauseLens.tasks.length, 12);

  const difficultyCounts = clauseLens.tasks.reduce<Record<string, number>>((acc, task) => {
    acc[task.difficulty] = (acc[task.difficulty] ?? 0) + 1;
    return acc;
  }, {});

  assert.equal(difficultyCounts.normal, 6);
  assert.equal(difficultyCounts.hard, 3);
  assert.equal(difficultyCounts.adversarial, 3);

  for (const task of clauseLens.tasks) {
    assert.ok(task.id.length > 0, "task id should be present");
    assert.ok(task.title.length > 0, "task title should be present");
    assert.ok(task.description.length > 0, "task description should be present");
    assert.ok(task.structuredNotes.length > 0, "structured notes should be present");
    assert.ok(task.attachmentText.length > 0, "attachment text should be present");
    assert.ok(Array.isArray(task.expectedCharacteristics), "expectedCharacteristics should be normalized to an array");
    assert.ok(Array.isArray(task.failureModes), "failureModes should be normalized to an array");
    assert.ok(task.expectedCharacteristics.length >= 2, "expectedCharacteristics should contain multiple checks");
    assert.ok(task.failureModes.length >= 2, "failureModes should contain multiple failure modes");
  }

  const tableMiner = getPlatformAgentTaskPack("TableMiner");
  assert.ok(tableMiner, "expected TableMiner task pack to exist");
  assert.equal(tableMiner.tasks.length, 12);

  const tableMinerDifficultyCounts = tableMiner.tasks.reduce<Record<string, number>>((acc, task) => {
    acc[task.difficulty] = (acc[task.difficulty] ?? 0) + 1;
    return acc;
  }, {});

  assert.equal(tableMinerDifficultyCounts.normal, 6);
  assert.equal(tableMinerDifficultyCounts.hard, 3);
  assert.equal(tableMinerDifficultyCounts.adversarial, 3);

  for (const task of tableMiner.tasks) {
    assert.ok(task.expectedCharacteristics.length >= 2, "table miner tasks should include multiple expected checks");
    assert.ok(task.failureModes.length >= 2, "table miner tasks should include multiple failure modes");
  }

  const briefly = getPlatformAgentTaskPack("Briefly");
  assert.ok(briefly, "expected Briefly task pack to exist");
  assert.equal(briefly.tasks.length, 12);

  const brieflyDifficultyCounts = briefly.tasks.reduce<Record<string, number>>((acc, task) => {
    acc[task.difficulty] = (acc[task.difficulty] ?? 0) + 1;
    return acc;
  }, {});

  assert.equal(brieflyDifficultyCounts.normal, 6);
  assert.equal(brieflyDifficultyCounts.hard, 3);
  assert.equal(brieflyDifficultyCounts.adversarial, 3);

  for (const task of briefly.tasks) {
    assert.ok(task.expectedCharacteristics.length >= 2, "briefly tasks should include multiple expected checks");
    assert.ok(task.failureModes.length >= 2, "briefly tasks should include multiple failure modes");
  }

  const polyLane = getPlatformAgentTaskPack("PolyLane");
  assert.ok(polyLane, "expected PolyLane task pack to exist");
  assert.equal(polyLane.tasks.length, 12);

  const polyLaneDifficultyCounts = polyLane.tasks.reduce<Record<string, number>>((acc, task) => {
    acc[task.difficulty] = (acc[task.difficulty] ?? 0) + 1;
    return acc;
  }, {});

  assert.equal(polyLaneDifficultyCounts.normal, 6);
  assert.equal(polyLaneDifficultyCounts.hard, 3);
  assert.equal(polyLaneDifficultyCounts.adversarial, 3);

  for (const task of polyLane.tasks) {
    assert.ok(task.expectedCharacteristics.length >= 2, "polyLane tasks should include multiple expected checks");
    assert.ok(task.failureModes.length >= 2, "polyLane tasks should include multiple failure modes");
  }

  const schemaSmith = getPlatformAgentTaskPack("SchemaSmith");
  assert.ok(schemaSmith, "expected SchemaSmith task pack to exist");
  assert.equal(schemaSmith.tasks.length, 12);

  const schemaSmithDifficultyCounts = schemaSmith.tasks.reduce<Record<string, number>>((acc, task) => {
    acc[task.difficulty] = (acc[task.difficulty] ?? 0) + 1;
    return acc;
  }, {});

  assert.equal(schemaSmithDifficultyCounts.normal, 6);
  assert.equal(schemaSmithDifficultyCounts.hard, 3);
  assert.equal(schemaSmithDifficultyCounts.adversarial, 3);

  for (const task of schemaSmith.tasks) {
    assert.ok(task.expectedCharacteristics.length >= 2, "schemaSmith tasks should include multiple expected checks");
    assert.ok(task.failureModes.length >= 2, "schemaSmith tasks should include multiple failure modes");
  }

  const opsPilot = getPlatformAgentTaskPack("OpsPilot");
  assert.ok(opsPilot, "expected OpsPilot task pack to exist");
  assert.equal(opsPilot.tasks.length, 12);

  const opsPilotDifficultyCounts = opsPilot.tasks.reduce<Record<string, number>>((acc, task) => {
    acc[task.difficulty] = (acc[task.difficulty] ?? 0) + 1;
    return acc;
  }, {});

  assert.equal(opsPilotDifficultyCounts.normal, 6);
  assert.equal(opsPilotDifficultyCounts.hard, 3);
  assert.equal(opsPilotDifficultyCounts.adversarial, 3);

  for (const task of opsPilot.tasks) {
    assert.ok(task.expectedCharacteristics.length >= 2, "opsPilot tasks should include multiple expected checks");
    assert.ok(task.failureModes.length >= 2, "opsPilot tasks should include multiple failure modes");
  }

  const copySprint = getPlatformAgentTaskPack("CopySprint");
  assert.ok(copySprint, "expected CopySprint task pack to exist");
  assert.equal(copySprint.tasks.length, 12);

  const copySprintDifficultyCounts = copySprint.tasks.reduce<Record<string, number>>((acc, task) => {
    acc[task.difficulty] = (acc[task.difficulty] ?? 0) + 1;
    return acc;
  }, {});

  assert.equal(copySprintDifficultyCounts.normal, 6);
  assert.equal(copySprintDifficultyCounts.hard, 3);
  assert.equal(copySprintDifficultyCounts.adversarial, 3);

  for (const task of copySprint.tasks) {
    assert.ok(task.expectedCharacteristics.length >= 2, "copySprint tasks should include multiple expected checks");
    assert.ok(task.failureModes.length >= 2, "copySprint tasks should include multiple failure modes");
  }

  const campaignPilot = getPlatformAgentTaskPack("CampaignPilot");
  assert.ok(campaignPilot, "expected CampaignPilot task pack to exist");
  assert.equal(campaignPilot.tasks.length, 12);

  const campaignPilotDifficultyCounts = campaignPilot.tasks.reduce<Record<string, number>>((acc, task) => {
    acc[task.difficulty] = (acc[task.difficulty] ?? 0) + 1;
    return acc;
  }, {});

  assert.equal(campaignPilotDifficultyCounts.normal, 6);
  assert.equal(campaignPilotDifficultyCounts.hard, 3);
  assert.equal(campaignPilotDifficultyCounts.adversarial, 3);

  for (const task of campaignPilot.tasks) {
    assert.ok(task.expectedCharacteristics.length >= 2, "campaignPilot tasks should include multiple expected checks");
    assert.ok(task.failureModes.length >= 2, "campaignPilot tasks should include multiple failure modes");
  }

  const signalForge = getPlatformAgentTaskPack("Signal Forge");
  assert.ok(signalForge, "expected Signal Forge task pack to exist");
  assert.equal(signalForge.tasks.length, 12);

  const signalForgeDifficultyCounts = signalForge.tasks.reduce<Record<string, number>>((acc, task) => {
    acc[task.difficulty] = (acc[task.difficulty] ?? 0) + 1;
    return acc;
  }, {});

  assert.equal(signalForgeDifficultyCounts.normal, 6);
  assert.equal(signalForgeDifficultyCounts.hard, 3);
  assert.equal(signalForgeDifficultyCounts.adversarial, 3);

  for (const task of signalForge.tasks) {
    assert.ok(task.expectedCharacteristics.length >= 2, "signalForge tasks should include multiple expected checks");
    assert.ok(task.failureModes.length >= 2, "signalForge tasks should include multiple failure modes");
  }
});
