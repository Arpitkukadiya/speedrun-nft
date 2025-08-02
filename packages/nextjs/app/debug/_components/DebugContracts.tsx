"use client";

import { useEffect, useState } from "react";
import { IStylusNFT } from "./IStylusNFT";
import { ethers } from "ethers";

const contractAddress = "0x464dc8de37b0e6ca2861215adacabae22ed63d0d"; // Get this from run-dev-node.sh output
const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || "");
const privateKey = process.env.NEXT_PUBLIC_PRIVATE_KEY || "";
const signer = new ethers.Wallet(privateKey, provider);
const contract = new ethers.Contract(contractAddress, IStylusNFT, signer);

export function DebugContracts() {
  const [balance, setBalance] = useState<number | null>(null);
  const [tokenId, setTokenId] = useState<string>("");
  const [owner, setOwner] = useState<string | null>(null);
  const [recipientAddress, setRecipientAddress] = useState<string>("");
  const [nftName, setNftName] = useState<string>("");
  const [nftSymbol, setNftSymbol] = useState<string>("");
  const [txStatus, setTxStatus] = useState<{
    status: "none" | "pending" | "success" | "error";
    message: string;
    operation?: string;
  }>({ status: "none", message: "" });

  const fetchContractInfo = async () => {
    try {
      const name = await contract.name();
      const symbol = await contract.symbol();
      setNftName(name);
      setNftSymbol(symbol);
    } catch (error) {
      console.error("Error fetching contract info:", error);
    }
  };

  const fetchBalance = async () => {
    try {
      const balance = await contract.balanceOf(signer.address);
      setBalance(Number(balance));
    } catch (error) {
      console.error("Error fetching balance:", error);
    }
  };

  useEffect(() => {
    fetchContractInfo();
    fetchBalance();
  }, []);

  const handleTransaction = async (
    operation: () => Promise<any>,
    pendingMessage: string,
    successMessage: string,
    operationType: string,
  ) => {
    // Don't proceed if another operation is pending
    if (txStatus.status === "pending") return;

    try {
      setTxStatus({ status: "pending", message: pendingMessage, operation: operationType });
      const tx = await operation();
      if (tx) {
        await tx.wait();
      }
      setTxStatus({ status: "success", message: successMessage });
      await fetchBalance();
    } catch (error: any) {
      console.error("Transaction error:", error);
      setTxStatus({
        status: "error",
        message: error.reason || error.message || "Transaction failed",
      });
    }
    // Clear status after 5 seconds
    setTimeout(() => {
      setTxStatus({ status: "none", message: "" });
    }, 5000);
  };

  const mintNFT = () => {
    handleTransaction(() => contract.mint(), "Minting your NFT...", "NFT minted successfully!", "mint");
  };

  const mintToAddress = () => {
    if (!ethers.isAddress(recipientAddress)) {
      setTxStatus({
        status: "error",
        message: "Please enter a valid Ethereum address",
      });
      return;
    }
    handleTransaction(
      () => contract.mintTo(recipientAddress),
      "Minting NFT to address...",
      `NFT minted to ${recipientAddress} successfully!`,
      "mintTo",
    );
  };

  const checkOwner = async () => {
    if (txStatus.status === "pending") return;

    if (!tokenId || isNaN(Number(tokenId))) {
      setTxStatus({
        status: "error",
        message: "Please enter a valid token ID",
      });
      return;
    }
    try {
      setTxStatus({ status: "pending", message: "Checking owner...", operation: "checkOwner" });
      const ownerAddress = await contract.ownerOf(Number(tokenId));
      setOwner(ownerAddress);
      setTxStatus({
        status: "success",
        message: `Owner found: ${ownerAddress}`,
      });
    } catch (error: any) {
      console.error("Error checking owner:", error);
      setOwner(null);
      setTxStatus({
        status: "error",
        message: "Token ID not found or invalid",
      });
    }
    // Clear status after 5 seconds
    setTimeout(() => {
      setTxStatus({ status: "none", message: "" });
    }, 5000);
  };

  const burnToken = () => {
    if (!tokenId || isNaN(Number(tokenId))) {
      setTxStatus({
        status: "error",
        message: "Please enter a valid token ID",
      });
      return;
    }
    handleTransaction(
      async () => {
        try {
          await contract.burn(Number(tokenId));
        } catch (error: any) {
          // Check for specific error conditions
          if (error.reason && error.reason.includes("InvalidTokenId")) {
            throw new Error("Invalid token ID. Please check and try again.");
          }
          // If no specific reason is provided, show a generic error message
          throw new Error("An error occurred while trying to burn the token. Please try again.");
        }
      },
      "Burning token...",
      `Token ${tokenId} burned successfully!`,
      "burn",
    );
  };

  // Helper function to determine if a button should be disabled
  const isOperationDisabled = (operation: string) => {
    return txStatus.status === "pending" && (!txStatus.operation || txStatus.operation === operation);
  };

  return (
    <div className="flex flex-col items-center w-full max-w-5xl mx-auto py-8 px-4">
      <div className="bg-white dark:bg-gray-900/95 shadow-2xl rounded-3xl w-full max-w-5xl p-8 border border-slate-200 dark:border-blue-500/30">
        <div className="flex items-center justify-center mb-8">
          <div className="px-6 py-3 rounded-full">
            <h1 className="text-4xl font-extrabold tracking-tight text-blue-600 dark:text-cyan-400">
              {nftName}
              <span className="text-2xl ml-2 font-semibold">({nftSymbol})</span>
            </h1>
          </div>
        </div>

        <div className="flex justify-center mb-10">
          <div className="bg-slate-100/80 dark:bg-blue-900/40 rounded-2xl px-8 py-6 shadow-xl border border-slate-200 dark:border-blue-500/20 backdrop-blur-md text-center">
            <div className="text-lg font-medium text-slate-600 dark:text-blue-200 mb-1">Your NFT Balance</div>
            <div className="text-5xl font-bold text-pink-500 dark:text-pink-400">
              {balance !== null ? (
                balance
              ) : (
                <div className="flex items-center justify-center">
                  <div className="h-8 w-8 border-t-2 border-b-2 border-pink-500 dark:border-pink-400 rounded-full animate-spin"></div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Transaction Status Alert */}
        {txStatus.status !== "none" && (
          <div
            className={`transition-all duration-300 alert ${
              txStatus.status === "pending"
                ? "bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200"
                : txStatus.status === "success"
                  ? "bg-green-50 text-green-700 dark:bg-green-900/50 dark:text-green-200"
                  : "bg-red-50 text-red-700 dark:bg-red-900/50 dark:text-red-200"
            } mb-8 border ${
              txStatus.status === "pending"
                ? "border-blue-200 dark:border-blue-500/40"
                : txStatus.status === "success"
                  ? "border-green-200 dark:border-green-500/40"
                  : "border-red-200 dark:border-red-500/40"
            } shadow-lg backdrop-blur-md rounded-2xl`}
          >
            <div className="flex items-center">
              {txStatus.status === "pending" && (
                <div className="loading loading-spinner loading-md mr-3 text-blue-500 dark:text-blue-400" />
              )}
              {txStatus.status === "success" && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 mr-3 text-green-500 dark:text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {txStatus.status === "error" && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 mr-3 text-red-500 dark:text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <span className="font-medium">{txStatus.message}</span>
            </div>
          </div>
        )}

        <div className="space-y-8">
          <div className="flex justify-center">
            <button
              className={`relative overflow-hidden btn border-0 shadow-xl px-8 py-3 rounded-xl font-semibold text-lg 
                ${
                  isOperationDisabled("mint")
                    ? "bg-slate-200 text-slate-400 dark:bg-blue-900/50 dark:text-blue-300/70 cursor-not-allowed"
                    : "bg-cyan-500 hover:bg-cyan-600 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white transform hover:scale-105 transition-all duration-300"
                }`}
              onClick={mintNFT}
              disabled={isOperationDisabled("mint")}
            >
              {txStatus.status === "pending" && txStatus.operation === "mint" ? (
                <div className="flex items-center">
                  <div className="h-5 w-5 border-t-2 border-b-2 border-white rounded-full animate-spin mr-2"></div>
                  Minting...
                </div>
              ) : (
                <div className="flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Mint NFT
                </div>
              )}
            </button>
          </div>

          <div className="bg-slate-50 dark:bg-gray-800/80 rounded-2xl p-6 border border-slate-200 dark:border-blue-500/20">
            <h2 className="text-xl font-semibold text-slate-700 dark:text-blue-200 mb-4">Mint to Specific Address</h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
              <input
                type="text"
                value={recipientAddress}
                onChange={e => setRecipientAddress(e.target.value)}
                className="input bg-white/70 dark:bg-blue-900/30 border border-slate-300 dark:border-blue-500/30 focus:border-blue-400 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-blue-900/40 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-blue-300/50 w-full sm:w-96 rounded-xl"
                placeholder="Enter recipient address"
                disabled={txStatus.status === "pending"}
              />
              <button
                className={`btn border-0 shadow-lg px-6 rounded-xl font-semibold 
                  ${
                    isOperationDisabled("mintTo")
                      ? "bg-slate-200 text-slate-400 dark:bg-green-900/50 dark:text-green-300/70 cursor-not-allowed"
                      : "bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-500 text-white transform hover:scale-105 transition-all duration-300"
                  }`}
                onClick={mintToAddress}
                disabled={isOperationDisabled("mintTo")}
              >
                {txStatus.status === "pending" && txStatus.operation === "mintTo" ? (
                  <div className="flex items-center">
                    <div className="h-5 w-5 border-t-2 border-b-2 border-white rounded-full animate-spin mr-2"></div>
                    Minting...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    Mint To Address
                  </div>
                )}
              </button>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-gray-800/80 rounded-2xl p-6 border border-slate-200 dark:border-blue-500/20">
            <h2 className="text-xl font-semibold text-slate-700 dark:text-blue-200 mb-4">Token Operations</h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
              <input
                type="number"
                value={tokenId}
                onChange={e => setTokenId(e.target.value)}
                className="input bg-white/70 dark:bg-blue-900/30 border border-slate-300 dark:border-blue-500/30 focus:border-blue-400 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-blue-900/40 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-blue-300/50 w-full sm:w-48 rounded-xl"
                placeholder="Token ID"
                disabled={txStatus.status === "pending"}
              />
              <div className="flex gap-3">
                <button
                  className={`btn border-0 shadow-lg px-4 rounded-xl font-semibold 
                    ${
                      isOperationDisabled("checkOwner")
                        ? "bg-slate-200 text-slate-400 dark:bg-purple-900/50 dark:text-purple-300/70 cursor-not-allowed"
                        : "bg-purple-500 hover:bg-purple-600 dark:bg-purple-600 dark:hover:bg-purple-500 text-white transform hover:scale-105 transition-all duration-300"
                    }`}
                  onClick={checkOwner}
                  disabled={isOperationDisabled("checkOwner")}
                >
                  {txStatus.status === "pending" && txStatus.operation === "checkOwner" ? (
                    <div className="flex items-center">
                      <div className="h-5 w-5 border-t-2 border-b-2 border-white rounded-full animate-spin mr-2"></div>
                      Checking...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                      Check Owner
                    </div>
                  )}
                </button>
                <button
                  className={`btn border-0 shadow-lg px-4 rounded-xl font-semibold 
                    ${
                      isOperationDisabled("burn")
                        ? "bg-slate-200 text-slate-400 dark:bg-red-900/50 dark:text-red-300/70 cursor-not-allowed"
                        : "bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-500 text-white transform hover:scale-105 transition-all duration-300"
                    }`}
                  onClick={burnToken}
                  disabled={isOperationDisabled("burn")}
                >
                  {txStatus.status === "pending" && txStatus.operation === "burn" ? (
                    <div className="flex items-center">
                      <div className="h-5 w-5 border-t-2 border-b-2 border-white rounded-full animate-spin mr-2"></div>
                      Burning...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      Burn Token
                    </div>
                  )}
                </button>
              </div>
            </div>

            {owner && (
              <div className="mt-4 bg-white/70 dark:bg-blue-900/30 rounded-xl px-6 py-4 border border-slate-200 dark:border-blue-500/20">
                <div className="flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2 text-indigo-500 dark:text-blue-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  <span className="text-sm text-slate-600 dark:text-blue-200 break-all">
                    Token <span className="font-semibold text-slate-800 dark:text-white">{tokenId}</span> owner:{" "}
                    <span className="font-mono text-indigo-600 dark:text-blue-300">{owner}</span>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
