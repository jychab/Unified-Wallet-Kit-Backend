import { Keypair } from "@solana/web3.js";
import { InitDataParsed, parse, validate } from "@telegram-apps/init-data-node";
import { db, telegramApiKey } from "./const";

export async function verify(verification: string): Promise<InitDataParsed> {
  const [authType, authData = ""] = verification.split(" ");

  switch (authType.trim()) {
    case "tma":
      try {
        validate(authData, telegramApiKey.value(), {
          expiresIn: 3600, // Init data sign is valid for 1 hour
        });
      } catch (e) {
        throw {
          status: 403,
          message: "Permission denied: Invalid verification.",
        };
      }
      return parse(authData);
    default:
      throw { status: 403, message: "Permission denied: Invalid user." };
  }
}

export async function getPublicKeyFromDB(userId: number): Promise<string> {
  const user = await db
    .collection("Admin")
    .where("telegramId", "==", userId)
    .limit(1)
    .get();
  if (!user.empty) {
    return user.docs[0].data().publicKey;
  } else {
    return createAndStorePublicKey(userId);
  }
}

export async function createAndStorePublicKey(userId: number): Promise<string> {
  const user = await db
    .collection("Admin")
    .where("telegramId", "==", userId)
    .limit(1)
    .get();
  if (user.empty) {
    const newWallet = Keypair.generate();
    await db.collection("Admin").doc(newWallet.publicKey.toBase58()).set({
      publicKey: newWallet.publicKey.toBase58(),
      secretKey: newWallet.secretKey,
      telegramId: userId,
    });
    return newWallet.publicKey.toBase58();
  }
  throw { status: 409, message: "User's wallet already exists." };
}
