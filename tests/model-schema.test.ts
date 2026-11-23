import test from "node:test";
import assert from "node:assert/strict";
import { compactModelSchema } from "../lib/model-schema.ts";
import { critiqueSchema } from "../lib/validation.ts";
import { z } from "zod";
test("compact provider schema retains required fields and enums without nested decoder bounds", () => {
  const schema = compactModelSchema(critiqueSchema) as any;
  assert.deepEqual(schema.required, ["summary", "readiness", "concerns"]);
  const dim = schema.properties.readiness;
  assert.match(dim.description, /exactly 4/);
  assert.match(dim.items.properties.checks.description, /exactly 4/);
  assert.equal(dim.items.properties.checks.items.properties.id.enum.length,16);
  assert.equal(dim.items.properties.checks.items.properties.met.type,"boolean");
  assert.doesNotMatch(JSON.stringify(schema), /"(?:minItems|maxItems|minLength|maxLength|minimum|maximum)":/);
});
test("compacting the provider schema never relaxes server-side validation", () => {
  const checks = z.object({name:z.string().max(10),items:z.array(z.number().int().min(0).max(4)).length(4)});
  compactModelSchema(checks);
  for(const invalid of [
    {name:"A",items:[1,2,3]}, {name:"A",items:[1,2,3,4,4]},
    {name:"A",items:[1,2,3,5]}, {name:"A".repeat(11),items:[1,2,3,4]}
  ]) assert.equal(checks.safeParse(invalid).success,false);
  assert.equal(checks.safeParse({name:"Valid",items:[1,2,3,4]}).success,true);
});
