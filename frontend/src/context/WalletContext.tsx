import React, { createContext, useContext, useState, useEffect } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import { utilsService } from "../main";
import { getAuthToken } from "../auth/tokenStore";

interface WalletContextType {
  walletBalance: number;
  tomatoCoins: number;
  addFunds: (amount: number) => void;
  payWithWallet: (amount: number, orderId: string) => Promise<string | null>;
  redeemCoins: (coinsToUse: number) => number;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [walletBalance, setWalletBalance] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("tomato_wallet_balance");
      return saved ? parseFloat(saved) : 1000; // ₹1,000 complimentary welcome wallet balance
    } catch {
      return 1000;
    }
  });

  const [tomatoCoins, setTomatoCoins] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("tomato_coins");
      return saved ? parseInt(saved, 10) : 250; // 250 complimentary reward coins
    } catch {
      return 250;
    }
  });

  useEffect(() => {
    localStorage.setItem("tomato_wallet_balance", walletBalance.toString());
  }, [walletBalance]);

  useEffect(() => {
    localStorage.setItem("tomato_coins", tomatoCoins.toString());
  }, [tomatoCoins]);

  const addFunds = (amount: number) => {
    if (amount <= 0) return;
    setWalletBalance((prev) => {
      const next = prev + amount;
      toast.success(`Added ₹${amount} to Tomato Wallet! 👛`);
      return next;
    });
  };

  const redeemCoins = (coinsToUse: number): number => {
    const usable = Math.min(coinsToUse, tomatoCoins);
    if (usable <= 0) return 0;
    setTomatoCoins((prev) => Math.max(0, prev - usable));
    return usable; // 1 coin = ₹1 discount
  };

  const payWithWallet = async (amount: number, orderId: string): Promise<string | null> => {
    if (walletBalance < amount) {
      toast.error(`Insufficient wallet balance. You have ₹${walletBalance}`);
      return null;
    }

    try {
      // Deduct wallet funds
      setWalletBalance((prev) => Math.max(0, prev - amount));

      // Wallet is a demo-only payment rail. The server creates and confirms the demo session.
      const headers = { Authorization: `Bearer ${getAuthToken()}` };
      const { data: session } = await axios.post(
        `${utilsService}/api/payment/stripe/create`,
        { orderId },
        { headers },
      );
      await axios.post(
        `${utilsService}/api/payment/stripe/verify`,
        { sessionId: session.sessionId },
        { headers },
      );

      const coinsEarned = Math.floor(amount * 0.05);
      setTomatoCoins((prev) => prev + coinsEarned);
      toast.success(
        `Paid ₹${amount} via Tomato Wallet! Earned +${coinsEarned} Tomato Coins 🎉`
      );
      return session.sessionId || null;
    } catch (err: any) {
      console.error("Wallet payment verification error:", err);
      // Never confirm an order when the server rejected payment confirmation.
      setWalletBalance((prev) => prev + amount);
      toast.error("Wallet payment could not be confirmed by the server.");
      return null;
    }
  };

  return (
    <WalletContext.Provider
      value={{
        walletBalance,
        tomatoCoins,
        addFunds,
        payWithWallet,
        redeemCoins,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};
