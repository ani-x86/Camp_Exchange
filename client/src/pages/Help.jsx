import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatBubble from '../components/help/ChatBubble';
import TypingIndicator from '../components/help/TypingIndicator';
import TicketSummaryCard from '../components/help/TicketSummaryCard';
import ChatInput from '../components/help/ChatInput';

// Mock active student identity (from auth state)
const CURRENT_STUDENT = {
  name: 'Aarav Sharma',
  email: 'aarav.sharma@college.edu',
  prn: '12210456',
};

const INITIAL_MESSAGES = [
  {
    id: 'msg-1',
    sender: 'bot',
    text: "Hi Aarav! I'm the CampX Support Assistant. What's going on with your account, order, or verification today?",
    time: 'Just now',
  },
];

/**
 * Help — conversational AI support triage interface.
 *
 * Rules:
 *  - Single calm, focused chat panel — no busy dashboard.
 *  - Bot left-aligned Bone bubble, User right-aligned Moss-tinted bubble.
 *  - 150ms slide-up entrance for all bubbles.
 *  - 3-dot typing indicator loops only while waiting for bot reply; stops the moment real reply arrives.
 *  - Smooth auto-scroll only if user is already near the bottom.
 *  - Inline decision card for ticket summary once detail is gathered.
 *  - User identity (name, email, PRN) attached automatically.
 */
export default function Help() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [activeSummary, setActiveSummary] = useState(null);
  const [isTicketSubmitted, setIsTicketSubmitted] = useState(false);

  const scrollContainerRef = useRef(null);

  // ── Auto-scroll to bottom only if user is already near bottom ──
  const scrollToBottomIfNeeded = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;

    // Only scroll if within 140px of bottom
    if (distanceFromBottom < 140) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    scrollToBottomIfNeeded();
  }, [messages, isBotTyping, activeSummary]);

  // ── Handle sending student message ──
  const handleSendMessage = async (text) => {
    const userMsg = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text,
      time: 'Just now',
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsBotTyping(true);

    // Simulate backend LLM triage response (POST /api/support/chat)
    setTimeout(() => {
      generateBotResponse(text);
    }, 750);
  };

  // ── Contextual conversational triage mock ──
  const generateBotResponse = (userText) => {
    setIsBotTyping(false);
    const lower = userText.toLowerCase();

    // Case 1: Verification / ID Card problem
    if (lower.includes('verify') || lower.includes('id') || lower.includes('prn') || lower.includes('card')) {
      const botReply = {
        id: `msg-${Date.now()}`,
        sender: 'bot',
        text: "I see — verification failures usually happen if the ID card photo has glare or the typed PRN doesn't match the OCR scan. I've compiled this issue for the admin team so they can manually verify your student ID:",
        time: 'Just now',
      };
      setMessages((prev) => [...prev, botReply]);

      // Trigger Inline Summary Confirmation Card
      setActiveSummary({
        title: 'Student ID Verification Review Request',
        category: 'Verification Triage',
        description: `Student encountered verification friction with college ID card/PRN. System flagged for manual admin document review. Initial report: "${userText}"`,
        referenceId: 'PRN-12210456',
        student: CURRENT_STUDENT,
      });
      return;
    }

    // Case 2: Payment / Razorpay issue
    if (lower.includes('pay') || lower.includes('razorpay') || lower.includes('money') || lower.includes('refund')) {
      const botReply = {
        id: `msg-${Date.now()}`,
        sender: 'bot',
        text: "Understood. Payment disputes require verification against our Razorpay webhook logs. Here is the ticket summary ready for priority review:",
        time: 'Just now',
      };
      setMessages((prev) => [...prev, botReply]);

      setActiveSummary({
        title: 'Payment Status Reconciliation',
        category: 'Payments & Escrow',
        description: `Student reported payment/transaction inquiry: "${userText}". Flagged for Razorpay signature & order log reconciliation.`,
        referenceId: 'TXN-PENDING',
        student: CURRENT_STUDENT,
      });
      return;
    }

    // Case 3: General / follow-up clarifying question
    if (!activeSummary) {
      const botReply = {
        id: `msg-${Date.now()}`,
        sender: 'bot',
        text: `Got it. Could you tell me a bit more about what went wrong, and whether this relates to an item you are buying, selling, or your profile?`,
        time: 'Just now',
      };
      setMessages((prev) => [...prev, botReply]);
    } else {
      // User adding more details to an existing ticket
      const botReply = {
        id: `msg-${Date.now()}`,
        sender: 'bot',
        text: "Thanks for the extra context! I've updated the ticket draft with your additional notes. Please confirm below:",
        time: 'Just now',
      };
      setMessages((prev) => [...prev, botReply]);
      setActiveSummary((prev) => ({
        ...prev,
        description: `${prev.description} | Additional note: "${userText}"`,
      }));
    }
  };

  // ── Ticket submission handling ──
  const handleTicketSubmit = () => {
    setIsTicketSubmitted(true);

    const refNum = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;

    setTimeout(() => {
      const confirmationMsg = {
        id: `msg-${Date.now()}`,
        sender: 'bot',
        text: `Got it — your support request has been filed directly to the campus admin team. Reference #${refNum}. A moderator will review your case and reply to ${CURRENT_STUDENT.email}.`,
        time: 'Just now',
      };
      setMessages((prev) => [...prev, confirmationMsg]);
    }, 400);
  };

  const handleAddMore = () => {
    const botReply = {
      id: `msg-${Date.now()}`,
      sender: 'bot',
      text: "Sure thing! Tell me what else happened, error messages, or upload links.",
      time: 'Just now',
    };
    setMessages((prev) => [...prev, botReply]);
  };

  return (
    <div className="flex min-h-screen flex-col bg-bone font-sans text-ink">
      {/* ── Top Header ── */}
      <header className="border-b border-clay bg-bone px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-moss" aria-hidden="true" />
            <h1 className="font-heading text-base font-bold text-ink">
              CampX Help
            </h1>
            <span className="text-xs text-ink/50 font-sans hidden sm:inline">
              • AI Support Triage
            </span>
          </div>

          {/* Close [x] button returning to previous page */}
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            aria-label="Close help chat and return"
            className="
              flex h-7 w-7 items-center justify-center rounded-sm
              text-ink/60 hover:bg-clay/20 hover:text-ink
              transition-colors duration-120 cursor-pointer
            "
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </header>

      {/* ── Chat Messages Container ── */}
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col overflow-hidden px-4 py-4 sm:px-6">
        <div
          ref={scrollContainerRef}
          className="flex-1 space-y-3.5 overflow-y-auto pr-1 pb-4"
        >
          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}

          {/* Inline Ticket Summary Card when triage has gathered sufficient detail */}
          {activeSummary && (
            <TicketSummaryCard
              summary={activeSummary}
              onSubmit={handleTicketSubmit}
              onAddMore={handleAddMore}
              isSubmitted={isTicketSubmitted}
            />
          )}

          {/* Typing indicator (only shown while bot is preparing response) */}
          {isBotTyping && <TypingIndicator />}
        </div>

        {/* ── Input Box at Bottom ── */}
        <div className="mt-2">
          <ChatInput
            onSend={handleSendMessage}
            disabled={isBotTyping}
            placeholder={
              isTicketSubmitted
                ? 'Ticket submitted. Type anything else…'
                : "Type your issue or question…"
            }
          />
        </div>
      </main>
    </div>
  );
}
