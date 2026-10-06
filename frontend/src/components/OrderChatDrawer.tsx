import { useState, useEffect, useRef } from "react";
import { useSocket } from "../context/SocketContext";
import { BiSend, BiX, BiMessageSquareDots } from "react-icons/bi";
import { BsCheckAll } from "react-icons/bs";

interface ChatMessage {
  orderId: string;
  senderId?: string;
  senderName: string;
  senderRole: string;
  message: string;
  timestamp: string;
}

interface OrderChatDrawerProps {
  orderId: string;
  currentUserRole: "customer" | "rider";
  currentUserName: string;
  otherPartyName: string;
  isOpen: boolean;
  onClose: () => void;
}

const OrderChatDrawer = ({
  orderId,
  currentUserRole,
  currentUserName,
  otherPartyName,
  isOpen,
  onClose,
}: OrderChatDrawerProps) => {
  const { socket } = useSocket();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Quick reply suggestions depending on role
  const quickReplies =
    currentUserRole === "customer"
      ? ["I'm downstairs waiting!", "Please leave at the door", "Call when you reach gate", "Take your time, thank you!"]
      : ["On my way to your location 🛵", "Reached your building gate", "Stuck in traffic for 5 mins", "I have arrived at door!"];

  useEffect(() => {
    if (!socket || !orderId) return;

    // Join order room
    socket.emit("join", `order:${orderId}`);

    const handleReceiveMessage = (msg: ChatMessage) => {
      if (msg.orderId === orderId) {
        setMessages((prev) => [...prev, msg]);
      }
    };

    socket.on("order:chat:receive", handleReceiveMessage);

    return () => {
      socket.off("order:chat:receive", handleReceiveMessage);
    };
  }, [socket, orderId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || !socket) return;

    const payload = {
      orderId,
      message: text,
      senderName: currentUserName,
      senderRole: currentUserRole,
    };

    socket.emit("order:chat:send", payload);
    setInputMessage("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end sm:justify-center bg-black/40 backdrop-blur-xs p-0 sm:p-4 animate-fade-in">
      <div className="w-full max-w-lg sm:rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[85vh] sm:h-[600px] animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-[#E23744] text-white">
              <BiMessageSquareDots size={22} />
              <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-slate-900" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">
                Chat with {otherPartyName || (currentUserRole === "customer" ? "Rider" : "Customer")}
              </h3>
              <p className="text-[11px] text-slate-300 font-medium">
                Live delivery messaging
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <BiX size={20} />
          </button>
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/70">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-2 text-slate-400">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <BiMessageSquareDots size={26} />
              </div>
              <p className="text-xs font-semibold text-slate-500">No messages yet</p>
              <p className="text-[11px] text-slate-400 max-w-xs">
                Send a quick update about gate entry, landmarks, or food drop-off!
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMine = msg.senderRole === currentUserRole;

              return (
                <div
                  key={idx}
                  className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span className="text-[10px] font-bold text-slate-400">
                      {isMine ? "You" : msg.senderName}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs font-medium shadow-2xs leading-relaxed ${
                      isMine
                        ? "bg-gradient-to-r from-[#E23744] to-[#f04452] text-white rounded-br-xs"
                        : "bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs"
                    }`}
                  >
                    <p>{msg.message}</p>
                    {isMine && (
                      <div className="flex justify-end mt-0.5">
                        <BsCheckAll size={14} className="text-white/80" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick replies */}
        <div className="p-2.5 bg-white border-t border-slate-100 overflow-x-auto flex gap-1.5 no-scrollbar">
          {quickReplies.map((reply, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSendMessage(reply)}
              className="shrink-0 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-[#E23744] px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition cursor-pointer"
            >
              {reply}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-3 bg-white border-t border-slate-100 flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Type your message..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-medium outline-none focus:bg-white focus:border-[#E23744] transition"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#E23744] text-white hover:bg-[#d02835] transition disabled:opacity-40 cursor-pointer shadow-md shadow-red-500/20 shrink-0"
          >
            <BiSend size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default OrderChatDrawer;
