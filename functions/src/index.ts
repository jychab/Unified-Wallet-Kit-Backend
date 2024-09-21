import { Keypair, VersionedTransaction } from "@solana/web3.js";
import * as bodyParser from "body-parser";
import { Buffer } from "buffer";
import express, { Request, Response } from "express";
import * as functions from "firebase-functions";
import { log } from "firebase-functions/logger";
import { db } from "./utils/const";
import {
  createAndStorePublicKey,
  getPublicKeyFromDB,
  verify,
} from "./utils/helper";
import nacl = require("tweetnacl");

// Initialize Express app
const app = express();
const cors = require("cors")({ origin: true });
app.use(bodyParser.json());
app.use(cors);

app.options("*", cors);

app.post("/getPublicKey", async (req: Request, res: Response) => {
  const { verification } = req.body;
  if (!verification) {
    return res.status(400).json({ message: "Verification not provided." });
  }
  try {
    const data = await verify(verification);
    if (!data.user?.id) {
      return res
        .status(400)
        .json({ message: "Unauthenticated: Invalid user." });
    }
    const publicKey = await getPublicKeyFromDB(data.user.id);
    if (!publicKey) {
      return res.status(404).json({ message: "Public key not found." });
    }
    return res.json({ publicKey });
  } catch (error: any) {
    log(error.message);
    return res
      .status(error.status || 500)
      .json({ message: error.message || "Internal server error." });
  }
});

app.post("/createPublicKey", async (req: Request, res: Response) => {
  const { verification } = req.body;
  if (!verification) {
    return res.status(400).json({ message: "Verification not provided." });
  }
  try {
    const data = await verify(verification);
    if (!data.user?.id) {
      return res
        .status(400)
        .json({ message: "Unauthenticated: Invalid user." });
    }
    const publicKey = await createAndStorePublicKey(data.user.id);
    return res.json({ publicKey });
  } catch (error: any) {
    log(error.message);
    return res
      .status(error.status || 500)
      .json({ message: error.message || "Internal server error." });
  }
});

app.post("/signTransaction", async (req: Request, res: Response) => {
  const { txs, verification } = req.body;
  if (!verification) {
    return res.status(400).json({ message: "Verification not provided." });
  }
  try {
    const data = await verify(verification);
    if (!data.user?.id) {
      return res
        .status(400)
        .json({ message: "Unauthenticated: Invalid user." });
    }
    const user = await db
      .collection("Admin")
      .where("telegramId", "==", data.user.id)
      .limit(1)
      .get();
    const secretKey = user.docs[0].data().secretKey;
    const publicKey = Keypair.fromSecretKey(secretKey);
    const signedTxs = txs
      .map((tx: any) =>
        VersionedTransaction.deserialize(Buffer.from(tx, "base64"))
      )
      .map((x: any) => {
        x.sign([publicKey]);
        return Buffer.from(x.serialize()).toString("base64");
      });
    return res.json(signedTxs);
  } catch (error: any) {
    log(error.message);
    return res
      .status(error.status || 500)
      .json({ message: error.message || "Internal server error." });
  }
});

app.post("/signMessage", async (req: Request, res: Response) => {
  const { msg, verification } = req.body;
  if (!verification) {
    return res.status(400).json({ message: "Verification not provided." });
  }
  try {
    const data = await verify(verification);
    if (!data.user?.id) {
      return res
        .status(400)
        .json({ message: "Unauthenticated: Invalid user." });
    }
    const user = await db
      .collection("Admin")
      .where("telegramId", "==", data.user.id)
      .limit(1)
      .get();
    const secretKey = user.docs[0].data().secretKey;
    const publicKey = Keypair.fromSecretKey(secretKey);
    const signedMessage = nacl.sign.detached(
      new TextEncoder().encode(msg),
      publicKey.secretKey
    );
    return res.json(Buffer.from(signedMessage).toString("base64"));
  } catch (error: any) {
    log(error.message);
    return res
      .status(500)
      .json({ message: error.message || "Internal server error." });
  }
});

exports.api = functions.https.onRequest(app);
