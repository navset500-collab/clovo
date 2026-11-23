import test from "node:test";
import assert from "node:assert/strict";
import { reportMarkdown } from "../lib/export.ts";
import type { Review } from "../lib/types.ts";
const review = {
  input: { name: "Test project", language: "en", description: "A written brief", attachments: [{name:"Private.pdf",data:"secret-file-bytes"}], accessCode:"secret-access", recoveryToken:"secret-checkpoint" },
  report: {
    mode:"live", summary:"A concise review", brief:{ product:"A product" },
    readiness: { version:2, total:6, dimensions:[{id:"problem", points:6.25, rating:1, reason:"One specific detail",nextStep:"Describe the workaround.", citations:[{sourceId:"B1",quote:"A concrete problem"}], checks:[{id:"pain",met:true},{id:"workaround",met:false}]}]},
    market:{summary:"Demand remains unverified",searchNotice:"No live evidence", signals:[], alternatives:[], sources:[]},
    personas:[],critique:[],improvements:[],directions:[],experiment:{task:"Ask someone",questions:["What do you do today?"],successSignal:"Observed behavior"}, evidenceSources:[{id:"B1",label:"Your brief",text:"A concrete problem"}]
  }
} as unknown as Review;
test("export includes the strict scoring checklist and source trail but no credentials or attachment data",()=>{
 const out=reportMarkdown(review);
 assert.match(out,/16 quote-supported criteria/);
 assert.match(out,/\[x\] A concrete problem/);
 assert.match(out,/\[ \] What people do today/);
 assert.match(out,/\[B1\] A concrete problem/);
 for(const secret of ["secret-file-bytes","secret-access","secret-checkpoint"]) assert.equal(out.includes(secret),false);
});
test("older reports remain exportable without claiming the new scoring rubric",()=>{
 const older=structuredClone(review);delete older.report.readiness!.version;
 older.report.readiness!.dimensions.forEach(d=>delete d.checks);
 const out=reportMarkdown(older);assert.match(out,/earlier rubric/);assert.doesNotMatch(out,/16 quote-supported criteria/);
});
