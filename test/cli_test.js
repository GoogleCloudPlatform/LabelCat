const cli = require("../src/cli.js");
const fs = require("fs");
const proxyquire = require("proxyquire");
const assert = require("assert");
const sinon = require("sinon");
//
// describe("makeCSV()", function() {
//   it("should create a csv of issues", function() {
//     // 1. ARRANGE
//     "repoName", "issueNumber", "title", "body", "labels";
//     const issues = [
//       {
//         repoName: "a-repo",
//         issueNumber: 1,
//         title: "very bad problem",
//         body: "this is a problem",
//         labels: ["type: bug"]
//       },
//       {
//         repoName: "repo-too",
//         issueNumber: 2,
//         title: "more stuff",
//         body: "this is stuff",
//         labels: ["type: stuff"]
//       }
//     ];
//
//     // 2. ACT
//     const file = "testCSV.csv";
//     const path = __dirname + "/" + file;
//     cli.makeCSV(issues, path);
//
//     let exists = true;
//     try {
//       fs.lstatSync(path).isFile();
//     } catch (e) {
//       if (e.code === "ENOENT") {
//         exists = false;
//       }
//     }
//
//     // 3. ASSERT
//     assert.ok(exists);
//
//     fs.unlink(path, err => {
//       if (err) throw err;
//     });
//   });
// });

// const proxyquire = require("proxyquire").noCallThru;
// const axiosStub = {};
// let foo = proxyquire("../src/cli", { "axios": axiosStub });
//
// const apiObj = {
//   data: {
//     title: "fun",
//     body: "good",
//     labels: [{ name: "bug" }, { name: "fine" }]
//   }
// };
//
// const issue = {
//   repo: "repo",
//   issueID: 1
// };
//
// axiosStub.get = function() {
//   return apiObj;
// };

describe("getIssueInfo stub", function() {
  let sandbox;
  beforeEach('create sinon sandbox', () => {
    sandbox = sinon.sandbox.create();
  });

  afterEach('restore the sandbox', () => {
    sandbox.restore();
  });

  it("should return the data title", function() {
    const issue = {
      repoName: "a-repo",
      issueNumber: 1,
      title: "very bad problem",
      body: "this is a problem",
      labels: ["type: bug"]
    };

    const expectedResponse = '{ "data": {"title": "elmo"}}';
    sandbox.stub(cli.axios, "get").resolves(expectedResponse);

    let result = cli.getIssueInfo(issue)

    assert.strictEqual(result.data.title, "elmo");

  });
});
