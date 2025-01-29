import dotenv from 'dotenv';
dotenv.config();
import express, { json } from "express";
import {userModel} from "./models.js";
import jwt from "jsonwebtoken";
import { Keypair, Transaction, Connection } from "@solana/web3.js"; // Corrected import
const app = express();
const JWT_SECRET = "1234567890";
import mongoose from "mongoose";
import cors from 'cors'
import bs58 from "bs58";

const connection = new Connection("https://solana-devnet.g.alchemy.com/v2/_rGzl0R4dqcMxphJrSa37JJ2DnXrYAia")

app.use(cors())
app.use(json());
const MONGO_URI = "mongodb://localhost:27017/"; 
// Signup Route
app.post("/api/v1/signup", async (req, res) => { 
  try {
    const { username, password } = req.body;

    const keyPair = Keypair.generate();

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    const existingUser = await userModel.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" });
    }

    await userModel.create({
      username: username,
      password: password,
      privateKey: Buffer.from(keyPair.secretKey).toString("base64"), // Secure encoding
      publicKey: keyPair.publicKey.toBase58(), // Standard encoding for public keys
    });

    res.json({
      message: "User created successfully",
      publicKey: keyPair.publicKey.toBase58(),
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Signin Route
app.post("/api/v1/signin", async (req, res) => { // Added leading slash
  try {
    const { username, password } = req.body;

    const user = await userModel.findOne({ username, password });

    if (user) {
      const token = jwt.sign(
        {
          id: user._id, // Include only the user ID
        },
        JWT_SECRET,
        { expiresIn: "1h" } // Optional: Add token expiration
      );
      res.json({ token });
    } else {
      res.status(403).json({ message: "Invalid credentials" });
    }
  } catch (error) {
    console.error("Signin error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Transaction Signing Route
app.post("/api/v1/txn/sign", async (req, res) => {
  try {
    const serializedTransaction = req.body.message;

    console.log("Before serialize");
    console.log(serializedTransaction);

    const tx = Transaction.from(Buffer.from(serializedTransaction, 'base64'));
    console.log("After serialize");
    console.log("private key :",  process.env.PRIVATE_KEY);
    const keyPair = Keypair.fromSecretKey(bs58.decode(process.env.PRIVATE_KEY));

    // Update transaction with blockhash and fee payer
    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = keyPair.publicKey;

    // Sign the transaction
    tx.sign(keyPair);

    // Send the transaction and get the signature
    const signature = await connection.sendTransaction(tx, [keyPair]);
    console.log("Transaction Signature:", signature);

    // Respond with the tracking ID (transaction signature)
    res.json({
      id: signature, // Use the Solana transaction signature as the tracking ID
    });
  } catch (error) {
    console.error("Error in /api/v1/txn/sign:", error.message);
    res.status(500).json({ error: "Failed to process transaction", details: error.message });
  }
});


// // Transaction Verification Route
app.get("/api/v1/txn", async (req, res) => {
  try {
    const { id } = req.query; // Extract the transaction ID (signature) from the query string

    if (!id) {
      return res.status(400).json({ error: "Transaction ID is required" });
    }

    // Fetch the transaction status using Solana's API
    const statusInfo = await connection.getSignatureStatus(id, { searchTransactionHistory: true });

    if (!statusInfo || !statusInfo.value) {
      return res.json({
        signatures: [id],
        status: "processing", // If no status is found, assume it's still processing
      });
    }

    // Determine the status
    const confirmationStatus = statusInfo.value.confirmationStatus;
    let status = "processing";

    if (confirmationStatus === "finalized") {
      status = "success"; // Transaction is finalized and confirmed
    } else if (confirmationStatus === null) {
      status = "failed"; // Transaction failed or not found
    }

    // Respond with the transaction status
    res.json({
      signatures: [id],
      status,
    });
  } catch (error) {
    console.error("Error in /api/v1/txn:", error.message);
    res.status(500).json({ error: "Failed to fetch transaction status", details: error.message });
  }
});


mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log("Connected to MongoDB");
}).catch((err) => {
  console.error("Error connecting to MongoDB:", err.message);
});

// Start Server
app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
