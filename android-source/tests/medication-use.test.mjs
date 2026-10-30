import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function medicationModule() {
  const { transpileModule } = await import("typescript");
  const source = await readFile(new URL("../app/medication-use.ts", import.meta.url), "utf8");
  const { outputText } = transpileModule(source, { compilerOptions: { module: 99, target: 9 } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
}

test("medication details preserve legacy backups, missing answers and explicit zero", async () => {
  const { normalizeMedicationUse } = await medicationModule();
  const legacy = { medicationId: "test-acute", effectiveness: "mittel" };
  assert.deepEqual(JSON.parse(JSON.stringify(normalizeMedicationUse(legacy))), legacy);
  const current = { ...legacy, painBefore: 8, painAfter: 0, reliefDurationHours: 2.5 };
  const backup = { format: "kopfklar-backup", version: 1, data: { entries: [{ medications: [current] }] } };
  const restored = JSON.parse(JSON.stringify(backup)).data.entries[0].medications.map(normalizeMedicationUse);
  assert.deepEqual(restored, [current]);
  assert.equal(normalizeMedicationUse({ ...legacy, reliefDurationHours: 0 }).reliefDurationHours, 0);
});

test("medication answers validate ranges without inventing missing values", async () => {
  const { medicationDetailValue, normalizeMedicationUse } = await medicationModule();
  for (const field of ["painBefore", "painAfter", "reliefDurationHours"]) {
    for (const value of ["", " ", null, undefined, -1, Infinity, "invalid", false, []]) {
      assert.equal(medicationDetailValue(field, value), undefined);
    }
    assert.equal(medicationDetailValue(field, "0"), 0);
  }
  assert.equal(medicationDetailValue("painBefore", 10), 10);
  assert.equal(medicationDetailValue("painAfter", 11), undefined);
  assert.equal(medicationDetailValue("painBefore", 1.5), undefined);
  assert.equal(medicationDetailValue("reliefDurationHours", "36.5"), 36.5);
  const legacy = { medicationId: "test", effectiveness: "gut" };
  assert.deepEqual(JSON.parse(JSON.stringify(normalizeMedicationUse({ ...legacy, painBefore: 99, painAfter: -1, reliefDurationHours: -2 }))), legacy);
});
