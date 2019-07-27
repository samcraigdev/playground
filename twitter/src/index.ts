import * as FS from "fs";
import * as Path from "path";
import * as Dgraph from "dgraph-js";
import * as GRPC from "grpc";

// Create a client stub.
function newClientStub() {
  return new Dgraph.DgraphClientStub("104.196.206.48:9080", GRPC.credentials.createInsecure());
}

// Create a client.
function newClient(clientStub: Dgraph.DgraphClientStub) {
  return new Dgraph.DgraphClient(clientStub);
}


// Create data using JSON.
async function createData(dgraphClient: Dgraph.DgraphClient) {
  const txn = dgraphClient.newTxn();
  const tweets = getTweets();      
    try {
      for (const tweet of tweets) {
        console.log(tweet.id)
        const mu = new Dgraph.Mutation();
        mu.setSetJson(tweet);
        await txn.mutate(mu);
      }
      await txn.commit();
    } finally {
      // Clean up. Calling this after txn.commit() is a no-op
      // and hence safe.
      await txn.discard();
    }
}

// Drop All - discard all data and start from a clean slate.
async function dropAll(dgraphClient: Dgraph.DgraphClient) {
  const op = new Dgraph.Operation();
  op.setDropAll(true);
  await dgraphClient.alter(op);
}

// Set schema.
async function setSchema(dgraphClient: Dgraph.DgraphClient) {
  const schema = `
      name: string @index(exact) .
      age: int .
      married: bool .
      loc: geo .
      dob: datetime .
  `;
  const op = new Dgraph.Operation();
  op.setSchema(schema);
  await dgraphClient.alter(op);
}

function getTweets() {
  const tweetsFile = Path.join(__dirname, "..", "data", "tweet.json");
  const tweetsJSON = FS.readFileSync(tweetsFile, "utf8");
  const tweets = JSON.parse(tweetsJSON);
  return tweets.set;
}

async function main() {
  const dgraphClientStub = newClientStub();
  const dgraphClient = newClient(dgraphClientStub);
  await dropAll(dgraphClient);
  // await setSchema(dgraphClient);
  await createData(dgraphClient);

  // Close the client stub.
  dgraphClientStub.close();
}

main().then(() => {
  console.log("\nDONE!");
}).catch((e) => {
  console.log("ERROR: ", e);
});