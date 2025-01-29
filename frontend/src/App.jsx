import React, { useState } from 'react';
import './App.css';
import axios from 'axios';
import { PublicKey, Transaction, Connection, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";

const connection = new Connection("https://solana-devnet.g.alchemy.com/v2/_rGzl0R4dqcMxphJrSa37JJ2DnXrYAia");

function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState('');
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [currentPage, setCurrentPage] = useState('selection'); // Added state for page selection

  const handleSignUp = async () => {
    try {
      const response = await axios.post("http://localhost:3000/api/v1/signup", { username, password });
      alert(`Sign up successful! Your public key: ${response.data.publicKey}`);
      setCurrentPage('sendSol'); // Redirect to sendSol page after signup
    } catch (error) {
      console.error("Sign up error:", error);
      alert(error.response?.data?.message || "Failed to sign up.");
    }
  };

  const handleSignIn = async () => {
    try {
      const response = await axios.post("http://localhost:3000/api/v1/signin", { username, password });
      setToken(response.data.token);
      setIsLoggedIn(true);
      alert("Sign in successful!");
      setCurrentPage('sendSol'); // Redirect to sendSol page after signin
    } catch (error) {
      console.error("Sign in error:", error);
      alert(error.response?.data?.message || "Failed to sign in.");
    }
  };

  const sendSol = async () => {
    if (!isLoggedIn) {
      alert("Please sign in first.");
      return;
    }

    try {
      const fromPubkey = new PublicKey("BadjYQF8DF9EwmPC7nrtVBDkzirx9erScW4Tk414Cgh3");
      const toPubkey = new PublicKey(toAddress);

      const ix = SystemProgram.transfer({
        fromPubkey: fromPubkey,
        toPubkey: toPubkey,
        lamports: parseFloat(amount) * LAMPORTS_PER_SOL,
      });

      const tx = new Transaction().add(ix);

      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = fromPubkey;

      const serializedTx = tx.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      }).toString("base64");

      const response = await axios.post(
        "http://localhost:3000/api/v1/txn/sign",
        { message: serializedTx },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert(`Transaction sent! Tracking ID: ${response.data.id}`);
    } catch (error) {
      console.error("Send Sol error:", error);
      alert(error.response?.data?.error || "Failed to send SOL.");
    }
  };

  if (currentPage === 'selection') {
    return (
      <div className="App">
        <h2>Welcome</h2>
        <button onClick={() => setCurrentPage('signup')}>Sign Up</button>
        <button onClick={() => setCurrentPage('signin')}>Sign In</button>
      </div>
    );
  }

  if (currentPage === 'signup') {
    return (
      <div className="App">
        <h2>Sign Up</h2>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button onClick={handleSignUp}>Sign Up</button>
      </div>
    );
  }

  if (currentPage === 'signin') {
    return (
      <div className="App">
        <h2>Sign In</h2>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button onClick={handleSignIn}>Sign In</button>
      </div>
    );
  }

  return (
    <div className="App">
      <h2>Send SOL</h2>
      <input
        type="text"
        placeholder="Recipient Address"
        value={toAddress}
        onChange={(e) => setToAddress(e.target.value)}
      />
      <input
        type="text"
        placeholder="Amount (in SOL)"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <button onClick={sendSol}>Send</button>
    </div>
  );
}

export default App;
