import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  Wand2,
  Plus,
  Trash2,
  History,
  TrendingUp,
  BookOpen,
  Award,
  PenSquare,
  ThumbsUp,
  MessageSquare,
  Share2,
  Send,
  Sliders,
  Eye,
  Settings,
  Flame,
  FileText,
  Heart,
  Bookmark,
  ChevronRight,
  ChevronDown,
  HelpCircle,
  Briefcase,
  ExternalLink,
  RefreshCw,
  Clock,
  Smartphone,
  LogIn,
  LogOut,
  Mail,
  Image,
  Lock,
  Calendar,
  CreditCard,
  Search,
  Repeat2,
  Home,
  Users,
  PlusSquare,
  Bell,
  Download,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Camera
} from "lucide-react";
import { LinkedInLoginPage } from "./components/LinkedInLoginPage";
import { HowToUseModal } from "./components/HowToUseModal";
import { ScheduleModal } from "./components/ScheduleModal";
import { AdminPortalModal } from "./components/AdminPortalModal";
import { BetaWaitlistScreen } from "./components/BetaWaitlistScreen";
import { EditProfileModal } from "./components/EditProfileModal";
import { fetchLinkedInProfile } from "./services/linkedinProfileService";
import {
  isSuperAdmin,
  checkBetaAccess,
  registerBetaUser,
  saveUserProfileToFirestore,
  SUPER_ADMIN_EMAIL
} from "./services/firestoreService";
import { DraftrLogo } from "./components/DraftrLogo";
import {
  generatePostsClient,
  refinePostClient,
  analyzePostClient,
  generateMatchingImageClient,
  parseNotebookClient,
  parseUploadedFileClient,
  isStaticHosting
} from "./services/geminiService";
import {
  Learning,
  GeneratedPost,
  PostAnalysis,
  ToneOption,
  IndustryOption,
  AudienceOption,
  SavedDraft
} from "./types";

// Tones configuration
const TONE_OPTIONS: ToneOption[] = [
  { id: "educational", name: "Educational", description: "Step-by-step guides, lessons, and clear breakdowns.", emoji: "💡" },
  { id: "inspiring", name: "Story & Growth", description: "Professional growth, lessons learned, and journeys.", emoji: "🚀" },
  { id: "bold", name: "Bold & Direct", description: "Confident viewpoints and strong, scroll-stopping hooks.", emoji: "🔥" },
  { id: "technical", name: "Deep-Dive", description: "In-depth insights, data points, and technical concepts.", emoji: "📊" },
  { id: "conversational", name: "Conversational", description: "Friendly, casual thoughts as if speaking with peers.", emoji: "💬" },
  { id: "humorous", name: "Witty & Relatable", description: "Lighthearted workplace reflections and fun stories.", emoji: "😄" }
];

const INDUSTRIES: IndustryOption[] = [
  { id: "tech", label: "Software Engineering & Tech" },
  { id: "ai", label: "Artificial Intelligence & ML" },
  { id: "marketing", label: "Marketing & Growth" },
  { id: "finance", label: "Finance & Fintech" },
  { id: "product", label: "Product Management" },
  { id: "consulting", label: "Management Consulting" },
  { id: "startups", label: "Entrepreneurship & Startups" },
  { id: "hr", label: "HR & Talent Recruitment" },
  { id: "education", label: "Education & Edtech" },
  { id: "design", label: "UI/UX & Creative Design" },
  { id: "healthcare", label: "Healthcare & Biotech" },
  { id: "sales", label: "Sales & Business Development" },
  { id: "cybersecurity", label: "Cybersecurity & IT Operations" },
  { id: "realestate", label: "Real Estate & Proptech" },
  { id: "climatetech", label: "Climate Tech & Sustainability" },
  { id: "vc", label: "Venture Capital & Private Equity" },
  { id: "legal", label: "Legal & Compliance" }
];

const AUDIENCES: AudienceOption[] = [
  { id: "engineers", label: "Domain Experts & Technical Peers" },
  { id: "executives", label: "Executives & VPs (C-Suite)" },
  { id: "recruiters", label: "Recruiters & Hiring Managers" },
  { id: "founders", label: "Founders & VC Investors" },
  { id: "general", label: "General Professional Network" },
  { id: "students", label: "Students & Aspiring Professionals" }
];

// Presets for quick-refining the selected post
const REFINEMENT_PRESETS = [
  { label: "Make the hook punchier", prompt: "Rewrite the opening 2 lines (the hook) to be extremely catchy and stop the scrolling. Keep the rest." },
  { label: "Shorten by 25%", prompt: "Condense this draft. Make it more concise, removing any fluff while keeping the core takeaways." },
  { label: "Add bullet takeaways", prompt: "Re-structure the main section of this post using clean bullet points with relevant emojis for higher scannability." },
  { label: "Add a bold statement", prompt: "Integrate a contrarian or bold industry statement near the start of the post to spark conversation." },
  { label: "Make it conversational", prompt: "Adjust the style to sound like a natural, casual voice. Avoid sounding like a marketing copywriter." }
];

// Built-in raw idea templates for fast loading
const LEARNING_TEMPLATES = [
  {
    title: "Why depth beats breadth when scaling a new venture",
    category: "Business Strategy",
    text: "Learned that dominating a tiny niche (e.g., modern email client for high-growth sales teams) is infinitely better than building a generic horizontal solution with more features. In the early stages, focusing on 100 passionate fans who love your product delivers high organic word-of-mouth (velocity) and prevents resource dilution. Key takeaway: niche focus is excellent for initial validation, and broad expansion is for later stages."
  },
  {
    title: "The activation metric most startups completely ignore",
    category: "Product Analytics",
    text: "Just analyzed product activation data. It's not enough that a user eventually reaches their 'Aha!' moment (e.g. creating their first document). What matters is Activation Velocity—the time elapsed from sign-up to activation. Users who activated within 4 minutes had a 3.4x higher 30-day retention compared to those who took 24 hours. Startups over-optimize onboarding screens, but they should really just eliminate friction to get the user to the core value-add ASAP."
  },
  {
    title: "Writing simple documentation is an act of genuine empathy",
    category: "Team Collaboration",
    text: "Spent 3 hours deciphering a hyper-complex strategy document written by a colleague who left last year. It had solid core concepts, but was drowned in dense corporate jargon. It made me realize that communication isn't about proving how smart you are; it's about making your thinking crystal clear to the next human. Your ideas are only as useful as their readability. Simple, expressive writing beats clever, cryptic jargon every single time."
  }
];

async function parseApiResponse<T = any>(res: Response): Promise<T> {
  const text = await res.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      // Non-JSON response (e.g. HTML 500/404 error page)
    }
  }

  if (!res.ok) {
    const errorMsg = data?.error || data?.message || (text.startsWith("<") ? `Server error (${res.status} ${res.statusText}). Please check server logs or API key.` : text) || `Request failed (${res.status})`;
    throw new Error(errorMsg);
  }

  if (data === null) {
    throw new Error(text.startsWith("<") ? "HTML response received from server (static hosting rewrite)." : "Received an invalid response from server.");
  }

  return data as T;
}

export default function App() {
  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Input Workspace State
  const [learningTitle, setLearningTitle] = useState("");
  const [learningCategory, setLearningCategory] = useState("Technology");
  const [learningsText, setLearningsText] = useState("");
  
  // Notebook Linker & Importer States
  const [notebookTab, setNotebookTab] = useState<"paste" | "link" | "upload">("paste");
  const [notebookUrl, setNotebookUrl] = useState("");
  const [isParsingNotebook, setIsParsingNotebook] = useState(false);
  const [parsedCells, setParsedCells] = useState<Array<{ id: string; type: string; content: string; selected: boolean }>>([]);
  const [parsedTitle, setParsedTitle] = useState("");
  const [notebookLoadError, setNotebookLoadError] = useState("");
  
  // Custom brand state (synced with actual logged-in user profile)
  const [userName, setUserName] = useState(() => {
    try {
      const storedName = localStorage.getItem("lnk_user_name");
      if (storedName) {
        const lower = storedName.toLowerCase();
        if (!lower.includes("alex rivers") && !lower.includes("devin") && !lower.includes("naidoo")) {
          return storedName;
        }
      }
      const stored = localStorage.getItem("lnk_connected_account");
      if (stored) {
        const lower = stored.toLowerCase();
        if (lower.includes("alex rivers") || lower.includes("devin") || lower.includes("naidoo")) {
          localStorage.removeItem("lnk_connected_account");
          localStorage.removeItem("lnk_user_name");
          localStorage.removeItem("lnk_user_headline");
          localStorage.removeItem("lnk_user_avatar");
          return "Naadirah Devnath";
        }
        return JSON.parse(stored).profile?.name || "Naadirah Devnath";
      }
    } catch {}
    return "Naadirah Devnath";
  });
  const [userHeadline, setUserHeadline] = useState(() => {
    try {
      const storedHeadline = localStorage.getItem("lnk_user_headline");
      if (storedHeadline) {
        const lower = storedHeadline.toLowerCase();
        if (!lower.includes("alex rivers") && !lower.includes("ai architect")) {
          return storedHeadline;
        }
      }
      const stored = localStorage.getItem("lnk_connected_account");
      if (stored) {
        const lower = stored.toLowerCase();
        if (lower.includes("alex rivers") || lower.includes("devin") || lower.includes("naidoo")) {
          return "Marketing Strategist & Digital Creator | Founder";
        }
        return JSON.parse(stored).profile?.headline || "Marketing Strategist & Digital Creator | Founder";
      }
    } catch {}
    return "Marketing Strategist & Digital Creator | Founder";
  });
  const [userAvatar, setUserAvatar] = useState(() => {
    try {
      const storedAvatar = localStorage.getItem("lnk_user_avatar");
      if (storedAvatar) {
        const lower = storedAvatar.toLowerCase();
        if (!lower.includes("alex") && !lower.includes("devin") && !lower.includes("naidoo")) {
          return storedAvatar;
        }
      }
      const stored = localStorage.getItem("lnk_connected_account");
      if (stored) {
        const lower = stored.toLowerCase();
        if (lower.includes("alex rivers") || lower.includes("devin") || lower.includes("naidoo")) {
          return "https://ui-avatars.com/api/?name=Naadirah+Devnath&background=0A66C2&color=fff&size=256";
        }
        return JSON.parse(stored).profile?.picture || JSON.parse(stored).profile?.avatar || "https://ui-avatars.com/api/?name=Naadirah+Devnath&background=0A66C2&color=fff&size=256";
      }
    } catch {}
    return "https://ui-avatars.com/api/?name=Naadirah+Devnath&background=0A66C2&color=fff&size=256";
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const logoDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const insideProfile = dropdownRef.current && dropdownRef.current.contains(target);
      const insideLogo = logoDropdownRef.current && logoDropdownRef.current.contains(target);
      if (!insideProfile && !insideLogo) {
        setShowProfileDropdown(false);
      }
    }
    if (showProfileDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showProfileDropdown]);
  const [showSavedHistoryModal, setShowSavedHistoryModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showHowToUseModal, setShowHowToUseModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showEmailAuthModal, setShowEmailAuthModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminPortal, setShowAdminPortal] = useState(false);
  const [isBetaBlocked, setIsBetaBlocked] = useState(false);
  const [betaStatus, setBetaStatus] = useState<{ count: number; cap: number }>({ count: 1, cap: 20 });

  // Apply fetched LinkedIn profile data to application state
  const handleApplyLinkedInProfile = (data: { name: string; headline: string; avatar: string }) => {
    setUserName(data.name);
    setUserHeadline(data.headline);
    setUserAvatar(data.avatar);
    localStorage.setItem("lnk_user_name", data.name);
    localStorage.setItem("lnk_user_headline", data.headline);
    localStorage.setItem("lnk_user_avatar", data.avatar);

    if (linkedinAccount) {
      const updated = {
        ...linkedinAccount,
        profile: {
          ...linkedinAccount.profile,
          name: data.name,
          headline: data.headline,
          avatar: data.avatar,
          picture: data.avatar
        }
      };
      setLinkedinAccount(updated);
      localStorage.setItem("lnk_connected_account", JSON.stringify(updated));
    }
  };

  // Authentication & Navigation States
  const [activeTab, setActiveTab] = useState<"home" | "studio" | "history">("home");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sessionToken, setSessionToken] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authHeadline, setAuthHeadline] = useState("");
  const [authError, setAuthError] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [includeVisual, setIncludeVisual] = useState(true);

  // Configuration settings
  const [selectedTone, setSelectedTone] = useState("educational");
  const [selectedLength, setSelectedLength] = useState("medium"); // short, medium, long
  const [includeEmojis, setIncludeEmojis] = useState(true);
  const [includeHashtags, setIncludeHashtags] = useState(true);
  const [includeCTA, setIncludeCTA] = useState(true);
  const [selectedIndustry, setSelectedIndustry] = useState("tech");
  const [selectedAudience, setSelectedAudience] = useState("engineers");

  // Output Playground state
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<"create" | "scheduled" | "saved" | "history">("create");
  
  // Post Scheduling States
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [scheduledPosts, setScheduledPosts] = useState<Array<{
    id: string;
    title: string;
    text: string;
    imageUrl?: string | null;
    scheduledFor: string;
    scheduledTimestamp?: number;
    status?: "scheduled" | "due" | "published";
    createdAt: string;
  }>>(() => {
    try {
      const saved = localStorage.getItem("draftr_scheduled_posts");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleSchedulePostSubmit = (viewQueue: boolean = false) => {
    const textToSchedule = activeDraftText || (generatedDrafts.length > 0 ? generatedDrafts[selectedDraftIndex]?.text : "");
    if (!textToSchedule) {
      triggerToast("⚠️ No post content to schedule. Generate or select a draft first.");
      return;
    }
    const currentStyle = generatedDrafts[selectedDraftIndex]?.styleLabel;
    const postTitle = learningTitle || (currentStyle ? `${currentStyle} Post` : "LinkedIn Post");
    
    // Compute timestamp for automated due tracking
    let scheduledTimestamp = Date.now() + 86400000;
    try {
      const parsed = new Date(`${scheduledDate}T${scheduledTime}`).getTime();
      if (!isNaN(parsed)) scheduledTimestamp = parsed;
    } catch {}

    const newScheduledItem = {
      id: "sched_" + Date.now(),
      title: postTitle,
      text: textToSchedule,
      imageUrl: attachedImage,
      scheduledFor: `${scheduledDate} at ${scheduledTime}`,
      scheduledTimestamp,
      status: "scheduled" as const,
      createdAt: new Date().toLocaleDateString()
    };
    const updated = [newScheduledItem, ...scheduledPosts];
    setScheduledPosts(updated);
    localStorage.setItem("draftr_scheduled_posts", JSON.stringify(updated));
    setShowScheduleModal(false);
    triggerToast(`📅 Post scheduled for ${scheduledDate} at ${scheduledTime}!`);
    if (viewQueue) {
      setActiveWorkspaceTab("scheduled");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleCancelScheduledPost = (id: string) => {
    const updated = scheduledPosts.filter(p => p.id !== id);
    setScheduledPosts(updated);
    localStorage.setItem("draftr_scheduled_posts", JSON.stringify(updated));
    triggerToast("Scheduled post removed.");
  };

  // Publish a scheduled post directly to LinkedIn
  const handlePublishScheduledPost = async (post: typeof scheduledPosts[0]) => {
    try {
      await navigator.clipboard.writeText(post.text);
    } catch {}

    const updated = scheduledPosts.map(p => p.id === post.id ? { ...p, status: "published" as const } : p);
    setScheduledPosts(updated);
    localStorage.setItem("draftr_scheduled_posts", JSON.stringify(updated));

    const shareUrl = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(post.text)}`;
    window.open(shareUrl, "_blank");
    triggerToast("🚀 Post copied to clipboard and LinkedIn opened!");
  };

  // Active scheduler monitor: periodically checks for scheduled posts that are due
  useEffect(() => {
    const checkSchedule = () => {
      const now = Date.now();
      let hasChanges = false;
      const updated = scheduledPosts.map(post => {
        if ((!post.status || post.status === "scheduled") && post.scheduledTimestamp && now >= post.scheduledTimestamp) {
          hasChanges = true;
          triggerToast(`⏰ Scheduled post "${post.title}" is ready to publish!`);
          return { ...post, status: "due" as const };
        }
        return post;
      });
      if (hasChanges) {
        setScheduledPosts(updated);
        localStorage.setItem("draftr_scheduled_posts", JSON.stringify(updated));
      }
    };

    checkSchedule();
    const interval = setInterval(checkSchedule, 30000);
    return () => clearInterval(interval);
  }, [scheduledPosts]);
  const [generatedDrafts, setGeneratedDrafts] = useState<GeneratedPost[]>([]);
  const [selectedDraftIndex, setSelectedDraftIndex] = useState(0);
  const [activeDraftText, setActiveDraftText] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // History & Storage
  const [savedLearnings, setSavedLearnings] = useState<Learning[]>([]);
  const [savedDrafts, setSavedDrafts] = useState<SavedDraft[]>([]);

  // Loaders
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // LinkedIn OAuth & Direct Posting States
  const [linkedinAccount, setLinkedinAccount] = useState<{
    token: string;
    profile: { id: string; name: string; avatar: string; headline: string; };
  } | null>(null);
  const [linkedinConfig, setLinkedinConfig] = useState<{
    configured: boolean;
    redirectUri: string;
  } | null>(null);
  const [isPublishingLinkedIn, setIsPublishingLinkedIn] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);
  const [publishError, setPublishError] = useState("");

  // Image Generation States
  const [attachedImage, setAttachedImage] = useState<string | null>(null); // base64 data URL
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageStyle, setImageStyle] = useState<string>("3d-render");
  const [imageAspectRatio, setImageAspectRatio] = useState<string>("1:1");
  const [imageTab, setImageTab] = useState<"generate" | "upload">("generate");
  const [showImagePanel, setShowImagePanel] = useState(false);

  // Matching Image Auto-Generation States
  const [isGeneratingMatchingImage, setIsGeneratingMatchingImage] = useState(false);
  const [suggestedVisualConcept, setSuggestedVisualConcept] = useState("");
  const [suggestedVisualPrompt, setSuggestedVisualPrompt] = useState("");

  // Manual editing and AI refinement prompt
  const [isEditingManually, setIsEditingManually] = useState(false);
  const [refinementPrompt, setRefinementPrompt] = useState("");
  const [refinementFeedback, setRefinementFeedback] = useState("");

  // Algorithmic Analytics
  const [analysis, setAnalysis] = useState<PostAnalysis | null>(null);
  
  // Mock see-more state for LinkedIn Card
  const [isMockExpanded, setIsMockExpanded] = useState(false);

  // PWA install state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes("android-app://");
    return isStandalone;
  });

  useEffect(() => {
    // Check if running as standalone PWA
    const checkStandalone = () => {
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes("android-app://");
      if (isStandalone) {
        setIsPwaInstalled(true);
        localStorage.setItem("draftr_pwa_installed", "true");
      }
    };
    checkStandalone();

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      (window as any).deferredPrompt = e;
    };

    const handlePromptAvailable = () => {
      if ((window as any).deferredPrompt) {
        setDeferredPrompt((window as any).deferredPrompt);
      }
    };

    if ((window as any).deferredPrompt) {
      setDeferredPrompt((window as any).deferredPrompt);
    }

    const handleAppInstalled = () => {
      setIsPwaInstalled(true);
      setDeferredPrompt(null);
      (window as any).deferredPrompt = null;
      localStorage.setItem("draftr_pwa_installed", "true");
      triggerToast("🎉 draftr installed as an app!");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("pwa-prompt-available", handlePromptAvailable);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("pwa-prompt-available", handlePromptAvailable);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleDownloadAppClick = async () => {
    // 1. If already installed and running as standalone PWA
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes("android-app://");

    if (isStandalone) {
      triggerToast("🎉 draftr is already installed and running as an app!");
      return;
    }

    // 2. Trigger native browser PWA installation prompt
    const promptEvent = (window as any).deferredPrompt || deferredPrompt;

    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        if (outcome === "accepted") {
          setIsPwaInstalled(true);
          localStorage.setItem("draftr_pwa_installed", "true");
          triggerToast("🎉 draftr successfully installed as an app!");
          (window as any).deferredPrompt = null;
          setDeferredPrompt(null);
        } else {
          triggerToast("PWA install dismissed.");
        }
        return;
      } catch (err) {
        console.warn("Native prompt invocation error:", err);
      }
    }

    // 3. If native prompt is not currently available, provide targeted browser guidance (NO file download)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isMac = /Macintosh|MacIntel|MacPPC|Mac68K/.test(navigator.userAgent);

    if (isIOS) {
      triggerToast("📱 To install PWA: Tap the Share button (⎋) in Safari, then tap 'Add to Home Screen'.");
    } else if (isMac) {
      triggerToast("💻 To install PWA: In Safari, select File > 'Add to Dock', or click the Install icon (⊕) in Chrome/Edge.");
    } else {
      triggerToast("📲 To install PWA: Click the Install icon (⊕) in your browser address bar.");
    }
  };

  // Sync profile details with server and update local cache
  const syncProfileToServer = async (updatedName: string, updatedHeadline: string, updatedAvatar: string) => {
    const token = localStorage.getItem("lnk_session_token") || sessionToken;
    if (!token) return;
    try {
      await fetch("/api/auth/profile/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name: updatedName,
          headline: updatedHeadline,
          avatar: updatedAvatar
        })
      });
    } catch (e) {
      console.error("Failed to sync profile changes to server:", e);
    }
  };

  // Sync draft creations to database helper
  const syncDraftToServer = async (draft: SavedDraft) => {
    const token = localStorage.getItem("lnk_session_token") || sessionToken;
    if (!token) return;
    try {
      await fetch("/api/user/drafts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ draft })
      });
    } catch (e) {
      console.error("Failed to sync draft to database:", e);
    }
  };

  const deleteDraftFromServer = async (draftId: string) => {
    const token = localStorage.getItem("lnk_session_token") || sessionToken;
    if (!token) return;
    try {
      await fetch(`/api/user/drafts/${draftId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
    } catch (e) {
      console.error("Failed to delete draft from database:", e);
    }
  };

  // Initialize and load from Server with LocalStorage backup
  useEffect(() => {
    try {
      const storedLearnings = localStorage.getItem("lnk_learnings");
      if (storedLearnings) setSavedLearnings(JSON.parse(storedLearnings));

      const storedDrafts = localStorage.getItem("lnk_drafts");
      if (storedDrafts) setSavedDrafts(JSON.parse(storedDrafts));

      const storedName = localStorage.getItem("lnk_user_name");
      if (storedName) setUserName(storedName);

      const storedHeadline = localStorage.getItem("lnk_user_headline");
      if (storedHeadline && storedHeadline !== "LinkedIn Professional") {
        setUserHeadline(storedHeadline);
      }

      const storedAvatar = localStorage.getItem("lnk_user_avatar");
      if (storedAvatar) setUserAvatar(storedAvatar);
    } catch (e) {
      console.error("Failed to load historical data from localStorage:", e);
    }

    // Load actual authenticated profile from server
    const token = localStorage.getItem("lnk_session_token");
    if (token) {
      setSessionToken(token);
      fetch("/api/auth/profile", {
        headers: { "Authorization": `Bearer ${token}` }
      })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error();
      })
      .then(data => {
        if (data.success) {
          setIsLoggedIn(true);
          setUserName(data.user.name);
          if (data.user.headline && data.user.headline !== "LinkedIn Professional") {
            setUserHeadline(data.user.headline);
          }
          setUserAvatar(data.user.avatar);

          // Get persistent drafts from server
          fetch("/api/user/drafts", {
            headers: { "Authorization": `Bearer ${token}` }
          })
          .then(r => r.json())
          .then(draftsData => {
            if (draftsData.success) {
              setSavedDrafts(draftsData.drafts);
              localStorage.setItem("lnk_drafts", JSON.stringify(draftsData.drafts));
            }
          });
        }
      })
      .catch(() => {
        console.log("Session expired or invalid.");
        localStorage.removeItem("lnk_session_token");
        setIsLoggedIn(false);
      });
    }
  }, []);

  // Sync profile details cache and trigger server sync
  useEffect(() => {
    localStorage.setItem("lnk_user_name", userName);
    localStorage.setItem("lnk_user_headline", userHeadline);
    localStorage.setItem("lnk_user_avatar", userAvatar);
    if (isLoggedIn) {
      syncProfileToServer(userName, userHeadline, userAvatar);
    }
  }, [userName, userHeadline, userAvatar, isLoggedIn]);

  // Synchronize high-level navigation clicks with workspace panel sub-tabs
  useEffect(() => {
    if (activeTab === "studio") {
      setActiveWorkspaceTab("create");
    } else if (activeTab === "history") {
      setActiveWorkspaceTab("history");
    }
  }, [activeTab]);

  // Load connected account and check LinkedIn API config status
  useEffect(() => {
    // 1. Purge any stale mock, "Alex Rivers", or "Devin Naidoo" profiles from previous versions
    const storedAccount = localStorage.getItem("lnk_connected_account");
    const storedName = localStorage.getItem("lnk_user_name");
    if (
      (storedAccount && (storedAccount.toLowerCase().includes("alex rivers") || storedAccount.toLowerCase().includes("devin") || storedAccount.toLowerCase().includes("naidoo"))) ||
      (storedName && (storedName.toLowerCase().includes("alex rivers") || storedName.toLowerCase().includes("devin") || storedName.toLowerCase().includes("naidoo")))
    ) {
      localStorage.removeItem("lnk_connected_account");
      localStorage.removeItem("lnk_user_name");
      localStorage.removeItem("lnk_user_headline");
      localStorage.removeItem("lnk_user_avatar");
      localStorage.removeItem("lnk_session_token");
      setLinkedinAccount(null);
      setUserName("Naadirah Devnath");
      setUserHeadline("Marketing Strategist & Digital Creator | Founder");
      setUserAvatar("https://ui-avatars.com/api/?name=Naadirah+Devnath&background=0A66C2&color=fff&size=256");
      setIsLoggedIn(true);
    }

    // Proactively fetch admin profile from Firestore so user always sees their real photo & headline
    fetch("https://firestore.googleapis.com/v1/projects/draftrcreate/databases/(default)/documents/users/admin_user?key=AIzaSyAewmD4NV9DQTl05cu2Rcfd_hEFoyHCNGE")
      .then(res => res.ok ? res.json() : null)
      .then(doc => {
        if (doc && doc.fields) {
          const fName = doc.fields.name?.stringValue;
          const fHeadline = doc.fields.headline?.stringValue;
          const fAvatar = doc.fields.avatar?.stringValue;
          if (fName && !fName.toLowerCase().includes("devin")) {
            setUserName(fName);
            localStorage.setItem("lnk_user_name", fName);
          }
          if (fHeadline && !fHeadline.toLowerCase().includes("ai architect")) {
            setUserHeadline(fHeadline);
            localStorage.setItem("lnk_user_headline", fHeadline);
          }
          if (fAvatar && !fAvatar.toLowerCase().includes("devin")) {
            setUserAvatar(fAvatar);
            localStorage.setItem("lnk_user_avatar", fAvatar);
          }
        }
      })
      .catch(() => {});

    // 2. Handle OAuth callback if redirected directly in this window or popup
    const searchParams = new URLSearchParams(window.location.search);
    const oauthCode = searchParams.get("code");
    const isCallbackPath = window.location.pathname.includes("/api/auth/linkedin/callback");

    if (oauthCode || isCallbackPath) {
      const code = oauthCode || "auth_code_" + Date.now();
      const existingName = localStorage.getItem("lnk_user_name");
      const existingHeadline = localStorage.getItem("lnk_user_headline");
      const existingAvatar = localStorage.getItem("lnk_user_avatar");
      const savedHandle = localStorage.getItem("draftr_linkedin_handle");

      const defaultName = (existingName && !existingName.toLowerCase().includes("devin")) ? existingName : "Naadirah Devnath";
      const defaultHeadline = (existingHeadline && existingHeadline !== "Content Creator" && !existingHeadline.includes("AI Architect")) ? existingHeadline : "Marketing Strategist & Digital Creator | Founder";
      const defaultAvatar = (existingAvatar && !existingAvatar.toLowerCase().includes("devin")) ? existingAvatar : `https://ui-avatars.com/api/?name=${encodeURIComponent(defaultName)}&background=0A66C2&color=fff&size=256`;

      const newAccount = {
        token: code,
        profile: {
          id: "li_user_" + Date.now(),
          name: defaultName,
          headline: defaultHeadline,
          picture: defaultAvatar,
          avatar: defaultAvatar
        }
      };

      if (window.opener && !window.opener.closed) {
        try {
          window.opener.postMessage({
            type: "OAUTH_LINKEDIN_SUCCESS",
            payload: newAccount
          }, "*");
          window.close();
          return;
        } catch (e) {
          console.warn("Could not post message to opener:", e);
        }
      }

      // If not in a popup or opener is unavailable, authenticate directly in this tab
      setLinkedinAccount(newAccount);
      setIsLoggedIn(true);
      setUserName(newAccount.profile.name);
      setUserHeadline(newAccount.profile.headline);
      setUserAvatar(newAccount.profile.picture);
      localStorage.setItem("lnk_connected_account", JSON.stringify(newAccount));
      localStorage.setItem("lnk_user_name", newAccount.profile.name);
      localStorage.setItem("lnk_user_headline", newAccount.profile.headline);
      localStorage.setItem("lnk_user_avatar", newAccount.profile.picture);

      const userEmail = (newAccount.profile as any).email || (isSuperAdmin(undefined, newAccount.profile.name) ? SUPER_ADMIN_EMAIL : "");
      const admin = isSuperAdmin(userEmail, newAccount.profile.name);
      setIsAdmin(admin);

      // Sync profile directly to Cloud Firestore
      saveUserProfileToFirestore({
        id: newAccount.profile.id,
        email: userEmail,
        name: newAccount.profile.name,
        headline: newAccount.profile.headline,
        avatar: newAccount.profile.picture
      });

      // Verify 20-User Beta Cap
      if (admin) {
        setIsBetaBlocked(false);
      } else {
        checkBetaAccess(userEmail, newAccount.profile.id, newAccount.profile.name).then((res) => {
          setBetaStatus({ count: res.currentCount, cap: res.cap });
          if (!res.allowed) {
            setIsBetaBlocked(true);
          } else {
            setIsBetaBlocked(false);
            if (!res.isRegistered) {
              registerBetaUser({
                id: newAccount.profile.id,
                email: userEmail,
                name: newAccount.profile.name,
                headline: newAccount.profile.headline,
                avatar: newAccount.profile.picture
              });
            }
          }
        });
      }

      // Clean query parameters from URL
      window.history.replaceState({}, document.title, window.location.pathname.replace("/api/auth/linkedin/callback", "/"));
      triggerToast(admin ? "👑 Welcome back, Super Admin!" : "🎉 Connected to LinkedIn! Welcome to your draftr studio.");

      if (savedHandle) {
        fetchLinkedInProfile(savedHandle)
          .then((p) => {
            handleApplyLinkedInProfile({ name: p.name, headline: p.headline, avatar: p.picture });
          })
          .catch(() => {});
      }
      return;
    }

    // Auto-refresh profile in background if handle is stored
    const storedHandle = localStorage.getItem("draftr_linkedin_handle");
    if (storedHandle) {
      fetchLinkedInProfile(storedHandle)
        .then((p) => {
          handleApplyLinkedInProfile({ name: p.name, headline: p.headline, avatar: p.picture });
        })
        .catch(() => {});
    }

    try {
      if (storedAccount) {
        const parsed = JSON.parse(storedAccount);
        setLinkedinAccount(parsed);
        // Sync mockup profile view with connected LinkedIn credentials
        if (parsed.profile?.name) setUserName(parsed.profile.name);
        const pic = parsed.profile?.picture || parsed.profile?.avatar;
        if (pic) {
          setUserAvatar(pic);
          localStorage.setItem("lnk_user_avatar", pic);
        }
        if (parsed.profile?.headline) setUserHeadline(parsed.profile.headline);

        // Fetch fresh LinkedIn userinfo if token exists
        if (parsed.token) {
          fetch("/api/auth/linkedin/userinfo", {
            headers: { Authorization: `Bearer ${parsed.token}` }
          })
          .then(r => r.ok ? r.json() : null)
          .then(data => {
            if (data?.success && data?.profile) {
              const freshPic = data.profile.picture || data.profile.avatar;
              if (freshPic) {
                setUserAvatar(freshPic);
                localStorage.setItem("lnk_user_avatar", freshPic);
              }
              if (data.profile.name) {
                setUserName(data.profile.name);
                localStorage.setItem("lnk_user_name", data.profile.name);
              }
            }
          })
          .catch(() => {});
        }
      }
    } catch (e) {
      console.error("Failed to load connected LinkedIn account:", e);
    }

    // Check Admin status and 20-User Beta Cap from Firestore
    const checkAdminAndBeta = async () => {
      let email = localStorage.getItem("lnk_user_email") || "";
      const currentName = localStorage.getItem("lnk_user_name") || userName;
      const stored = localStorage.getItem("lnk_connected_account");
      let uid = "";
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.profile?.email) email = parsed.profile.email;
          if (parsed.profile?.id) uid = parsed.profile.id;
        } catch {}
      }

      const admin = isSuperAdmin(email, currentName);
      setIsAdmin(admin);

      if (admin) {
        setIsBetaBlocked(false);
      } else {
        const betaRes = await checkBetaAccess(email, uid, currentName);
        setBetaStatus({ count: betaRes.currentCount, cap: betaRes.cap });
        if (!betaRes.allowed) {
          setIsBetaBlocked(true);
        } else {
          setIsBetaBlocked(false);
        }
      }
    };
    checkAdminAndBeta();

    const fetchLinkedinConfig = async () => {
      try {
        const res = await fetch("/api/linkedin/config");
        if (res.ok) {
          const data = await res.json();
          setLinkedinConfig(data);
        }
      } catch (e) {
        console.error("Failed to load LinkedIn API config status:", e);
      }
    };
    fetchLinkedinConfig();
  }, []);

  // Refresh user profile picture & headline from LinkedIn directly
  const refreshLinkedInProfile = async () => {
    if (!linkedinAccount?.token) {
      connectLinkedIn();
      return;
    }
    try {
      const res = await fetch("/api/auth/linkedin/userinfo", {
        headers: { Authorization: `Bearer ${linkedinAccount.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          const pic = data.profile.picture || data.profile.avatar;
          if (pic) {
            setUserAvatar(pic);
            localStorage.setItem("lnk_user_avatar", pic);
          }
          if (data.profile.name) {
            setUserName(data.profile.name);
            localStorage.setItem("lnk_user_name", data.profile.name);
          }
          triggerToast("✓ LinkedIn profile picture and info synced!");
        }
      } else {
        triggerToast("LinkedIn session needs reconnection.");
        connectLinkedIn();
      }
    } catch (e) {
      console.warn("Failed to refresh LinkedIn profile:", e);
      triggerToast("Could not sync profile. Reconnecting LinkedIn...");
      connectLinkedIn();
    }
  };

  // Listen for successful OAuth callbacks from the popup window
  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      // Allow messages from standard development/production origins
      const origin = event.origin;
      if (!origin.endsWith(".run.app") && !origin.includes("localhost") && !origin.includes("127.0.0.1") && !origin.endsWith(".web.app") && !origin.endsWith(".firebaseapp.com") && !origin.endsWith(".onrender.com")) {
        return;
      }

      if (event.data?.type === "OAUTH_LINKEDIN_SUCCESS") {
        const { token, profile } = event.data.payload;
        const avatarUrl = profile.picture || profile.avatar;
        const newAccount = { 
          token, 
          profile: {
            ...profile,
            avatar: avatarUrl || profile.avatar,
            picture: avatarUrl || profile.picture
          }
        };
        setLinkedinAccount(newAccount);
        setIsLoggedIn(true);
        localStorage.setItem("lnk_connected_account", JSON.stringify(newAccount));
        
        // Dynamically customize presentation details
        if (profile.name) {
          setUserName(profile.name);
          localStorage.setItem("lnk_user_name", profile.name);
        }
        if (avatarUrl) {
          setUserAvatar(avatarUrl);
          localStorage.setItem("lnk_user_avatar", avatarUrl);
        }
        if (profile.headline) {
          setUserHeadline(profile.headline);
          localStorage.setItem("lnk_user_headline", profile.headline);
        }

        const userEmail = profile.email || (isSuperAdmin(undefined, profile.name) ? SUPER_ADMIN_EMAIL : "");
        const admin = isSuperAdmin(userEmail, profile.name);
        setIsAdmin(admin);

        // Sync profile directly to Cloud Firestore
        saveUserProfileToFirestore({
          id: profile.id || "li_user_" + Date.now(),
          email: userEmail,
          name: profile.name || userName,
          headline: profile.headline || userHeadline,
          avatar: avatarUrl || userAvatar
        });

        // Check 20-User Beta Cap
        if (admin) {
          setIsBetaBlocked(false);
        } else {
          checkBetaAccess(userEmail, profile.id, profile.name).then((res) => {
            setBetaStatus({ count: res.currentCount, cap: res.cap });
            if (!res.allowed) {
              setIsBetaBlocked(true);
            } else {
              setIsBetaBlocked(false);
              if (!res.isRegistered) {
                registerBetaUser({
                  id: profile.id || "li_user_" + Date.now(),
                  email: userEmail,
                  name: profile.name || userName,
                  headline: profile.headline || userHeadline,
                  avatar: avatarUrl || userAvatar
                });
              }
            }
          });
        }

        // Persist to user profile on backend if session token exists
        syncProfileToServer(profile.name || userName, profile.headline || userHeadline, avatarUrl || userAvatar);
        
        const savedHandle = localStorage.getItem("draftr_linkedin_handle");
        if (savedHandle) {
          fetchLinkedInProfile(savedHandle)
            .then((res) => {
              handleApplyLinkedInProfile({ name: res.name, headline: res.headline, avatar: res.picture });
            })
            .catch(() => {});
        }
        
        setPublishError("");
        setPublishSuccess(null);
        triggerToast(admin ? "👑 Welcome back, Super Admin!" : "🎉 Connected to LinkedIn! Welcome to your draftr studio.");
      }
    };

    window.addEventListener("message", handleOAuthMessage);
    return () => window.removeEventListener("message", handleOAuthMessage);
  }, [userName, userHeadline, userAvatar]);

  // Open the LinkedIn popup flow (powered by live Render backend token exchange)
  const connectLinkedIn = async () => {
    try {
      const serverBase = "https://draftr.onrender.com";
      let authUrl = "";
      
      try {
        const res = await fetch(`${serverBase}/api/auth/linkedin/url`);
        if (res.ok) {
          const data = await res.json();
          authUrl = data.url;
        }
      } catch (e) {
        console.warn("Could not fetch auth URL from Render, using direct URL:", e);
      }

      if (!authUrl) {
        const clientId = "77egx6ugs734rl";
        const redirectUri = "https://draftr.onrender.com/api/auth/linkedin/callback";
        const params = new URLSearchParams({
          response_type: "code",
          client_id: clientId,
          redirect_uri: redirectUri,
          state: "linkedin-post-creator-auth-state",
          scope: "openid profile email w_member_social"
        });
        authUrl = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
      }

      const width = 600;
      const height = 650;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const popup = window.open(
        authUrl,
        "linkedin_oauth_popup",
        `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes,status=yes`
      );

      // If popup was blocked by browser, redirect directly so user isn't stuck
      if (!popup || popup.closed || typeof popup.closed === "undefined") {
        window.location.href = authUrl;
      }
    } catch (err: any) {
      console.error("Failed to connect LinkedIn:", err);
      window.location.href = "https://draftr.onrender.com/api/auth/linkedin/url";
    }
  };

  // Disconnect LinkedIn account details
  const disconnectLinkedIn = () => {
    setLinkedinAccount(null);
    setIsLoggedIn(false);
    localStorage.removeItem("lnk_connected_account");
    localStorage.removeItem("lnk_session_token");
    localStorage.removeItem("lnk_user_name");
    localStorage.removeItem("lnk_user_headline");
    localStorage.removeItem("lnk_user_avatar");
    setUserName("");
    setUserHeadline("");
    setUserAvatar("");
    setSavedDrafts([]);
    setPublishSuccess(null);
    setPublishError("");
    triggerToast("Logged out of LinkedIn successfully.");
  };

  // Publish active post directly to real LinkedIn feed
  const handlePublishToLinkedIn = async () => {
    if (!linkedinAccount) {
      triggerToast("Please connect your LinkedIn account first.");
      return;
    }
    if (!activeDraftText.trim()) {
      triggerToast("Post content cannot be empty.");
      return;
    }

    setIsPublishingLinkedIn(true);
    setPublishSuccess(null);
    setPublishError("");

    try {
      const response = await fetch("/api/linkedin/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: activeDraftText,
          token: linkedinAccount.token,
          authorId: linkedinAccount.profile.id,
          image: attachedImage
        }),
      });

      const data = await parseApiResponse<{ postId?: string }>(response);
      const postUrn = data.postId || "organic-post-urn";
      setPublishSuccess(postUrn);
      triggerToast("🚀 Post successfully published directly to your LinkedIn feed!");
    } catch (err: any) {
      console.warn("Direct API posting failed or static hosting, opening LinkedIn composer:", err);
      try {
        await navigator.clipboard.writeText(activeDraftText);
      } catch {}
      const shareUrl = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(activeDraftText)}`;
      window.open(shareUrl, "_blank");
      triggerToast("📋 Copied post text to clipboard & opened LinkedIn composer ready to publish!");
    } finally {
      setIsPublishingLinkedIn(false);
    }
  };

  // Generate image using Gemini models (supports styles, aspect ratios, scratch or reference base64 upload)
  const handleGenerateImagen = async (useReferenceImage?: boolean) => {
    if (!imagePrompt.trim()) {
      triggerToast("Please provide a prompt to guide the AI Illustrator.");
      return;
    }

    setIsGeneratingImage(true);
    try {
      let data: { imageUrl: string } | null = null;
      if (isStaticHosting()) {
        data = await generateMatchingImageClient(imagePrompt, "", "", imageStyle);
      } else {
        try {
          const response = await fetch("/api/generate-image", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ 
              prompt: imagePrompt,
              aspectRatio: imageAspectRatio,
              style: imageStyle,
              image: useReferenceImage ? attachedImage : null
            }),
          });
          data = await parseApiResponse<{ imageUrl: string }>(response);
        } catch (backendErr) {
          console.warn("Backend unavailable, falling back to direct image client:", backendErr);
          data = await generateMatchingImageClient(imagePrompt, "", "", imageStyle);
        }
      }

      if (data?.imageUrl) {
        setAttachedImage(data.imageUrl);
        triggerToast(useReferenceImage 
          ? "AI-refined image generated successfully based on your uploaded asset!" 
          : "AI illustration rendered and attached to your LinkedIn post!"
        );
      } else {
        throw new Error("No image was returned.");
      }
    } catch (err: any) {
      console.error("Imagen generation failed:", err);
      triggerToast(err.message || "Failed to generate image. Please try again.");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Upload and attach custom local post image assets (satisfies visual steps instantly)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
    let file: File | undefined;
    
    if ("dataTransfer" in e) {
      e.preventDefault();
      file = e.dataTransfer.files?.[0];
    } else if ("target" in e) {
      file = e.target.files?.[0];
    }

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      triggerToast("⚠️ Please select a valid image file (PNG, JPG, or WEBP).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setAttachedImage(base64);
      triggerToast(`Successfully uploaded "${file.name}"! Attached as post asset.`);
    };
    reader.readAsDataURL(file);
  };

  // Pre-fills prompt inputs dynamically
  const handleAutoGeneratePrompt = () => {
    const topic = learningTitle.trim() || "modern technology and systems strategy";
    const categoryLabel = learningCategory || "Tech Strategy";
    const promptText = `A minimalist abstract 3D render illustrating ${topic} and ${categoryLabel}, glowing light neon pathways, dark obsidian background, depth of field, high-end presentation graphic, no text, no words`;
    setImagePrompt(promptText);
    triggerToast("Auto-generated premium abstract illustration prompt!");
  };

  // Generate matching post image automatically
  const handleGenerateMatchingImage = async () => {
    if (!activeDraftText.trim()) {
      triggerToast("Please generate or select some post text first.");
      return;
    }

    setIsGeneratingMatchingImage(true);
    setSuggestedVisualConcept("");
    setSuggestedVisualPrompt("");
    
    try {
      let data: { imageUrl: string; visualConcept?: string; suggestedPrompt?: string } | null = null;
      if (isStaticHosting()) {
        data = await generateMatchingImageClient(activeDraftText, learningTitle, learningCategory, imageStyle);
      } else {
        try {
          const response = await fetch("/api/generate-matching-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              postText: activeDraftText,
              title: learningTitle,
              category: learningCategory,
              aspectRatio: imageAspectRatio,
              style: imageStyle
            }),
          });
          data = await parseApiResponse<{ imageUrl: string; visualConcept?: string; suggestedPrompt?: string }>(response);
        } catch (backendErr) {
          console.warn("Backend image matching failed, falling back to client:", backendErr);
          data = await generateMatchingImageClient(activeDraftText, learningTitle, learningCategory, imageStyle);
        }
      }

      if (data) {
        setAttachedImage(data.imageUrl);
        setSuggestedVisualConcept(data.visualConcept || "");
        setSuggestedVisualPrompt(data.suggestedPrompt || "");
        triggerToast("AI-matching brand illustration generated and attached!");
      }
    } catch (err: any) {
      console.error("Matching image generation failed:", err);
      triggerToast(err.message || "Failed to generate matching image.");
    } finally {
      setIsGeneratingMatchingImage(false);
    }
  };

  // Load a learning template
  const handleLoadTemplate = (index: number) => {
    const template = LEARNING_TEMPLATES[index];
    setLearningTitle(template.title);
    setLearningCategory(template.category);
    setLearningsText(template.text);
    setErrorMsg("");
  };

  // Trigger real-time post quality analysis
  const analyzePostQuality = async (textToAnalyze: string) => {
    if (!textToAnalyze || textToAnalyze.trim().length === 0) return;
    setIsAnalyzing(true);
    try {
      let data: PostAnalysis | null = null;
      if (isStaticHosting()) {
        data = await analyzePostClient(textToAnalyze);
      } else {
        try {
          const response = await fetch("/api/analyze-post", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ postText: textToAnalyze }),
          });
          data = await parseApiResponse<PostAnalysis>(response);
        } catch {
          data = await analyzePostClient(textToAnalyze);
        }
      }
      if (data) {
        setAnalysis(data);
      }
    } catch (error) {
      console.error("Analysis failed:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Sync active draft whenever selected tab of drafts changes
  useEffect(() => {
    if (generatedDrafts.length > 0 && generatedDrafts[selectedDraftIndex]) {
      const currentPostText = generatedDrafts[selectedDraftIndex].text;
      setActiveDraftText(currentPostText);
      setIsEditingManually(false);
      setIsMockExpanded(false);
      analyzePostQuality(currentPostText);
      
      // Auto-prefill a gorgeous abstract illustration prompt based on current category
      setImagePrompt(`A minimalist abstract 3D render illustrating modern ${learningCategory.toLowerCase()} concept, glowing light neon pathways, dark obsidian background, depth of field, high-end tech presentation graphic`);
    }
  }, [selectedDraftIndex, generatedDrafts, learningCategory]);

  // Handle manual editing changes
  const handleManualTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setActiveDraftText(e.target.value);
  };

  // Save manual edit
  const saveManualEdits = () => {
    if (generatedDrafts.length > 0) {
      const updated = [...generatedDrafts];
      updated[selectedDraftIndex].text = activeDraftText;
      setGeneratedDrafts(updated);
      setIsEditingManually(false);
      analyzePostQuality(activeDraftText);
    }
  };

  // Toggle individual cell selection
  const toggleCellSelection = (id: string) => {
    setParsedCells(prev => prev.map(cell => cell.id === id ? { ...cell, selected: !cell.selected } : cell));
  };

  // Select or deselect all parsed cells
  const toggleSelectAllCells = (checked: boolean) => {
    setParsedCells(prev => prev.map(cell => ({ ...cell, selected: checked })));
  };

  // Upload and parse client-side notebooks / ANY files (PDF, Word, Excel, Images, Code, Notebooks, Text)
  const handleLocalNotebookUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingNotebook(true);
    setNotebookLoadError("");
    setParsedCells([]);

    try {
      const data = await parseUploadedFileClient(file);
      if (data?.cells && data.cells.length > 0) {
        const cells = data.cells.map((cell: any, idx: number) => ({
          id: `local-cell-${idx}`,
          type: cell.type,
          content: cell.content,
          selected: true
        }));
        setParsedCells(cells);
        setParsedTitle(data.title || file.name);
        setNotebookLoadError("");
        if (data.imagePreview) {
          setAttachedImage(data.imagePreview);
          triggerToast(`Extracted insights & attached image from "${file.name}"!`);
        } else {
          triggerToast(`Parsed ${cells.length} blocks from "${file.name}"! Choose blocks to import.`);
        }
      } else {
        throw new Error("No readable text or notes could be extracted from this file.");
      }
    } catch (err: any) {
      console.error("Local file upload parse failed:", err);
      setNotebookLoadError(err.message || "Failed to parse this file. Please verify it contains readable content.");
    } finally {
      setIsParsingNotebook(false);
      e.target.value = "";
    }
  };

  // Fetch and parse notebooks from external URLs (GitHub, Colab, public web) via our secure backend
  const handleFetchExternalNotebook = async () => {
    if (!notebookUrl.trim()) {
      setNotebookLoadError("Please paste a valid URL first.");
      return;
    }

    setIsParsingNotebook(true);
    setNotebookLoadError("");
    setParsedCells([]);

    try {
      let data: { cells: any[]; title?: string; isColabWeb?: boolean } | null = null;
      if (isStaticHosting()) {
        data = await parseNotebookClient(notebookUrl);
      } else {
        try {
          const res = await fetch("/api/parse-notebook", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: notebookUrl })
          });
          data = await parseApiResponse<{ cells: any[]; title?: string; isColabWeb?: boolean }>(res);
        } catch (backendErr) {
          console.warn("Backend unavailable, falling back to client parser:", backendErr);
          data = await parseNotebookClient(notebookUrl);
        }
      }

      if (data?.cells && data.cells.length > 0) {
        const cells = data.cells.map((cell: any, idx: number) => ({
          id: `url-cell-${idx}`,
          type: cell.type,
          content: cell.content,
          selected: true
        }));
        setParsedCells(cells);
        setParsedTitle(data.title || "Linked Notebook");
        if (data.isColabWeb) {
          triggerToast("Google Colab link detected! Rendered standard layout with help advice.");
        } else {
          triggerToast(`Parsed ${cells.length} notebook cells successfully!`);
        }
      } else {
        throw new Error("No readable code/text cells were extracted from this link.");
      }
    } catch (err: any) {
      console.error(err);
      setNotebookLoadError(err.message || "Unable to connect or extract cells from this URL. Make sure it is public and CORS-friendly.");
    } finally {
      setIsParsingNotebook(false);
    }
  };

  // Import selected cells back into primary creator notes
  const handleImportSelectedCells = () => {
    const selected = parsedCells.filter(cell => cell.selected);
    if (selected.length === 0) {
      setNotebookLoadError("Please select at least one block/cell to import.");
      return;
    }

    const compiledContent = selected
      .map(cell => {
        const prefix = cell.type === "code" ? "💻 [Code Notebook Cell]" : "💡 [Explanatory Note]";
        return `${prefix}\n${cell.content}`;
      })
      .join("\n\n");

    setLearningsText(compiledContent);
    setLearningTitle(parsedTitle);
    
    // Auto-detect a smart category
    const lowercaseTitle = parsedTitle.toLowerCase();
    if (lowercaseTitle.includes("torch") || lowercaseTitle.includes("tensor") || lowercaseTitle.includes("learn") || lowercaseTitle.includes("data") || lowercaseTitle.includes("ai")) {
      setLearningCategory("Machine Learning");
    } else if (lowercaseTitle.includes("system") || lowercaseTitle.includes("scale") || lowercaseTitle.includes("database") || lowercaseTitle.includes("redis") || lowercaseTitle.includes("architecture")) {
      setLearningCategory("System Architecture");
    } else if (lowercaseTitle.includes("react") || lowercaseTitle.includes("ui") || lowercaseTitle.includes("web") || lowercaseTitle.includes("front")) {
      setLearningCategory("Web Development");
    } else {
      setLearningCategory("Strategy & Learnings");
    }

    // Reset notebook picker state
    setNotebookTab("paste");
    setParsedCells([]);
    setNotebookUrl("");
    triggerToast(`Imported ${selected.length} cells into your Draftr creator notes!`);
  };

  // Clear inputs
  const handleResetInputs = () => {
    setLearningTitle("");
    setLearningsText("");
    setErrorMsg("");
    setParsedCells([]);
    setNotebookUrl("");
    setNotebookLoadError("");
  };

  // Post Generator call
  const handleGeneratePosts = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!learningsText.trim()) {
      setErrorMsg("Please paste or write your raw notes or ideas first.");
      return;
    }

    setIsGenerating(true);
    setErrorMsg("");
    setAnalysis(null);
    setRefinementFeedback("");

    // Generate a default title if empty
    const finalTitle = learningTitle.trim() || `Learning from ${new Date().toLocaleDateString()}`;

    try {
      const payload = {
        learnings: learningsText,
        tone: selectedTone,
        length: selectedLength,
        emojis: includeEmojis,
        hashtags: includeHashtags,
        cta: includeCTA,
        industry: INDUSTRIES.find(i => i.id === selectedIndustry)?.label || selectedIndustry,
        audience: AUDIENCES.find(a => a.id === selectedAudience)?.label || selectedAudience
      };

      let data: { options: GeneratedPost[] } | null = null;
      if (isStaticHosting()) {
        // On Firebase Hosting (no Express backend), call Gemini directly from browser
        data = await generatePostsClient(payload);
      } else {
        try {
          const response = await fetch("/api/generate-post", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          data = await parseApiResponse<{ options: GeneratedPost[] }>(response);
        } catch (backendErr) {
          console.warn("Backend unavailable, falling back to direct Gemini:", backendErr);
          data = await generatePostsClient(payload);
        }
      }
      if (data.options && data.options.length > 0) {
        setGeneratedDrafts(data.options);
        setSelectedDraftIndex(0);
        
        // Save the learning input and its 3 drafts to local list
        const newLearning: Learning = {
          id: Date.now().toString(),
          title: finalTitle,
          category: learningCategory,
          text: learningsText,
          createdAt: new Date().toLocaleString(),
          drafts: data.options
        };

        const updatedLearnings = [newLearning, ...savedLearnings].slice(0, 50); // cap history at 50
        setSavedLearnings(updatedLearnings);
        localStorage.setItem("lnk_learnings", JSON.stringify(updatedLearnings));
      } else {
        throw new Error("No drafts were returned by the assistant. Please try again.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Something went wrong while creating the posts.");
    } finally {
      setIsGenerating(false);
    }
  };

  // AI Refinement Call
  const handleRefinePost = async (instructions: string) => {
    if (!instructions.trim() || !activeDraftText) return;

    setIsRefining(true);
    setErrorMsg("");
    setRefinementFeedback("");

    try {
      let data: { refinedText: string; changeSummary?: string } | null = null;
      if (isStaticHosting()) {
        data = await refinePostClient(activeDraftText, instructions);
      } else {
        try {
          const response = await fetch("/api/refine-post", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              originalPost: activeDraftText,
              refinementInstructions: instructions
            })
          });
          data = await parseApiResponse<{ refinedText: string; changeSummary?: string }>(response);
        } catch (backendErr) {
          console.warn("Backend refinement failed, falling back to direct Gemini:", backendErr);
          data = await refinePostClient(activeDraftText, instructions);
        }
      }
      if (data.refinedText) {
        // Update the draft array in state
        const updated = [...generatedDrafts];
        if (updated[selectedDraftIndex]) {
          updated[selectedDraftIndex].text = data.refinedText;
          setGeneratedDrafts(updated);
        } else {
          // Fallback if no options active
          setGeneratedDrafts([{
            styleLabel: "Refined Draft",
            title: "Custom Revision",
            text: data.refinedText,
            explanation: data.changeSummary
          }]);
          setSelectedDraftIndex(0);
        }
        setActiveDraftText(data.refinedText);
        setRefinementFeedback(data.changeSummary || "Applied revisions successfully.");
        setRefinementPrompt("");
        
        // Re-analyze
        analyzePostQuality(data.refinedText);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to edit this draft.");
    } finally {
      setIsRefining(false);
    }
  };

  // Copy to clipboard helper
  const handleCopyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => {
      setCopiedIndex(null);
    }, 2000);
  };

  // Save current draft to historical Saved drafts
  const handleSaveDraft = () => {
    if (!activeDraftText) return;

    const matchedLearning = savedLearnings[0];
    const newSavedDraft: SavedDraft = {
      id: Date.now().toString(),
      learningId: matchedLearning ? matchedLearning.id : "standalone",
      learningTitle: matchedLearning ? matchedLearning.title : "Direct Workspace Generation",
      text: activeDraftText,
      styleLabel: generatedDrafts[selectedDraftIndex]?.styleLabel || "Custom Draft",
      tone: selectedTone,
      length: selectedLength,
      createdAt: new Date().toLocaleString(),
      isFavorite: false
    };

    const updatedDrafts = [newSavedDraft, ...savedDrafts];
    setSavedDrafts(updatedDrafts);
    localStorage.setItem("lnk_drafts", JSON.stringify(updatedDrafts));
    
    // Sync to database if logged in
    if (isLoggedIn) {
      syncDraftToServer(newSavedDraft);
    }
    
    // Simple visual bookmark confirmation
    triggerToast("Draft saved to your Saved History!");
  };

  // Delete saved draft
  const handleDeleteDraft = (id: string) => {
    const updated = savedDrafts.filter(d => d.id !== id);
    setSavedDrafts(updated);
    localStorage.setItem("lnk_drafts", JSON.stringify(updated));

    if (isLoggedIn) {
      deleteDraftFromServer(id);
    }
    triggerToast("Draft removed from database.");
  };

  // Load a historical learning back into input fields AND bring up its 3 drafts
  const handleReloadLearning = async (item: Learning) => {
    setLearningTitle(item.title);
    setLearningCategory(item.category);
    setLearningsText(item.text);
    setActiveWorkspaceTab("create");
    window.scrollTo({ top: 0, behavior: "smooth" });

    // 1. If this learning already has 3 drafts saved, bring them up immediately!
    if (item.drafts && item.drafts.length > 0) {
      setGeneratedDrafts(item.drafts);
      setSelectedDraftIndex(0);
      setActiveDraftText(item.drafts[0].text);
      analyzePostQuality(item.drafts[0].text);
      triggerToast(`✓ Loaded 3 drafts for "${item.title}"!`);
      return;
    }

    // 2. If this learning did not have saved drafts, auto-generate the 3 drafts now!
    setIsGenerating(true);
    triggerToast(`⚡ Bringing up 3 drafts for "${item.title}"...`);
    try {
      const payload = {
        learnings: item.text,
        title: item.title,
        category: item.category,
        tone: selectedTone,
        length: selectedLength,
        emojis: includeEmojis,
        hashtags: includeHashtags,
        cta: includeCTA,
        industry: selectedIndustry,
        audience: selectedAudience
      };
      const data = await generatePostsClient(payload);
      if (data.options && data.options.length > 0) {
        setGeneratedDrafts(data.options);
        setSelectedDraftIndex(0);
        setActiveDraftText(data.options[0].text);
        analyzePostQuality(data.options[0].text);

        // Save drafts back to this learning item in history
        const updated = savedLearnings.map(l => l.id === item.id ? { ...l, drafts: data.options } : l);
        setSavedLearnings(updated);
        localStorage.setItem("lnk_learnings", JSON.stringify(updated));
        triggerToast(`🎉 3 drafts ready for "${item.title}"!`);
      }
    } catch (err: any) {
      console.error("Auto-draft generation on note reload failed:", err);
      triggerToast(`Loaded notes for "${item.title}". Click "Generate 3 LinkedIn Drafts" to create drafts.`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Load saved draft to workspace
  const handleReloadSavedDraft = (item: SavedDraft) => {
    setGeneratedDrafts([{
      styleLabel: item.styleLabel,
      title: "Saved Copy",
      text: item.text,
      explanation: "Loaded from saved templates history."
    }]);
    setSelectedDraftIndex(0);
    setActiveDraftText(item.text);
    setActiveWorkspaceTab("create");
    triggerToast("Loaded draft into live editor playground!");
  };

  // Real Registration Submit
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword || !authName) {
      setAuthError("Please fill out all required fields.");
      return;
    }
    setIsAuthenticating(true);
    setAuthError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: authEmail,
          password: authPassword,
          name: authName,
          headline: authHeadline || "LinkedIn Content Creator"
        })
      });
      const data = await parseApiResponse<{ token: string; user: any }>(res);
      localStorage.setItem("lnk_session_token", data.token);
      setSessionToken(data.token);
      setIsLoggedIn(true);
      setUserName(data.user.name);
      setUserHeadline(data.user.headline);
      setUserAvatar(data.user.avatar);
      setSavedDrafts([]);
      triggerToast(`Welcome to draftr, ${data.user.name}! Your actual account is registered.`);
    } catch (err: any) {
      setAuthError(err.message || "Failed to register account.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Real Login Submit
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) {
      setAuthError("Email and password are required.");
      return;
    }
    setIsAuthenticating(true);
    setAuthError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: authEmail,
          password: authPassword
        })
      });
      const data = await parseApiResponse<{ token: string; user: any }>(res);
      localStorage.setItem("lnk_session_token", data.token);
      setSessionToken(data.token);
      setIsLoggedIn(true);
      setUserName(data.user.name);
      setUserHeadline(data.user.headline);
      setUserAvatar(data.user.avatar);

      // Load user saved drafts
      const draftsRes = await fetch("/api/user/drafts", {
        headers: { "Authorization": `Bearer ${data.token}` }
      });
      const draftsData = await draftsRes.json();
      if (draftsData.success) {
        setSavedDrafts(draftsData.drafts);
      }
      triggerToast(`Welcome back, ${data.user.name}!`);
    } catch (err: any) {
      setAuthError(err.message || "Invalid email or password.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = () => {
    disconnectLinkedIn();
  };

  // Helper score color mapper
  const getScoreColor = (score: number) => {
    if (score >= 8) return "bg-emerald-50 text-emerald-700 border border-emerald-200/60";
    if (score >= 5) return "bg-[#ede6db] text-[#212020] border border-stone-300";
    return "bg-rose-50 text-rose-700 border border-rose-200/60";
  };

  const getScoreTextColor = (score: number) => {
    if (score >= 8) return "text-emerald-600";
    if (score >= 5) return "text-stone-700";
    return "text-rose-600";
  };

  const getScoreBg = (score: number) => {
    if (score >= 8) return "bg-emerald-50 text-emerald-800 border border-emerald-100";
    if (score >= 5) return "bg-[#ede6db] text-[#212020] border border-stone-300";
    return "bg-rose-50 text-rose-800 border border-rose-100";
  };

  // If this window is currently handling the OAuth redirect, render a spinner rather than the login screen
  const isHandlingOAuth = typeof window !== "undefined" && (
    window.location.pathname.includes("/api/auth/linkedin/callback") ||
    new URLSearchParams(window.location.search).has("code")
  );

  if (isHandlingOAuth && !linkedinAccount) {
    return (
      <div className="min-h-screen bg-[#ede6db] text-[#212020] flex flex-col items-center justify-center p-6 text-center antialiased font-sans">
        <div className="w-24 h-24 mb-6 flex items-center justify-center">
          <img src="/draftr-logo.jpg" alt="draftr logo" className="w-full h-full object-contain mix-blend-multiply" />
        </div>
        <div className="w-8 h-8 border-3 border-[#0a66c2] border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-bold font-serif text-[#0f172a]">Connecting your LinkedIn account...</h2>
        <p className="text-sm text-stone-600 mt-2">Completing authentication...</p>
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-[#ede6db] text-[#212020] flex flex-col antialiased font-sans selection:bg-[#212020] selection:text-white">
      {/* Header Banner */}
      <header id="app-header" className="sticky top-0 z-40 bg-[#0f172a] text-white border-b-2 border-slate-800 px-4 py-3 sm:px-6 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Top Left Studio Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl shadow-xs overflow-hidden flex items-center justify-center shrink-0 border-2 border-slate-600">
              <img
                src="/draftr-logo.jpg"
                alt="draftr logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="font-serif text-2xl italic font-bold text-white tracking-tight lowercase">
                draftr
              </h1>
              <p className="text-[11px] text-slate-300 hidden sm:block font-medium">LinkedIn Post Studio</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 justify-end">
            {/* Download App (PWA) Button - Placed prominently in header next to profile picture */}
            <button
              id="btn-download-app-header"
              type="button"
              onClick={handleDownloadAppClick}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-extrabold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border-2 border-blue-400 shadow-md transition-all cursor-pointer shrink-0 hover:scale-105 active:scale-95"
              title="Download draftr PWA App"
            >
              <Download className="w-3.5 h-3.5 text-white shrink-0" />
              <span>Download App</span>
            </button>

            {/* Super Admin Quick Badge / Trigger */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowAdminPortal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 shadow-xs transition cursor-pointer shrink-0"
                title="Open Super Admin Portal"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Admin (20-Cap)</span>
              </button>
            )}

            {/* User Profile Avatar with absolute dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                id="btn-profile-settings"
                type="button"
                onClick={() => setShowProfileDropdown(prev => !prev)}
                className={`relative p-0.5 rounded-full border-2 transition-all cursor-pointer hover:scale-105 shrink-0 ${
                  showProfileDropdown 
                    ? "border-blue-400 bg-slate-800" 
                    : "border-slate-700 hover:border-slate-400"
                }`}
                title="Account Menu"
              >
                <img
                  src={userAvatar}
                  alt="Profile Avatar"
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full object-cover bg-stone-100"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=0A66C2&color=fff`;
                  }}
                />
                <span className={`absolute -bottom-1 -right-1 text-white text-[7px] font-bold px-0.5 rounded-xs border border-white leading-none scale-90 flex items-center justify-center w-3.5 h-3.5 ${isLoggedIn || linkedinAccount ? "bg-emerald-600" : "bg-blue-600"}`}>
                  {isLoggedIn || linkedinAccount ? "✓" : "in"}
                </span>
              </button>

              {showProfileDropdown && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl border-2 border-[#0f172a] shadow-2xl py-3 z-50 animate-fade-in text-left text-[#0f172a]">
                    {/* Account Identity Header */}
                    <div className="px-4 pb-3 mb-2 border-b-2 border-stone-150">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={userAvatar}
                          alt="Avatar"
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-full object-cover bg-stone-50 border-2 border-[#0f172a]"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=0A66C2&color=fff`;
                          }}
                        />
                        <div className="min-w-0">
                          <h4 className="font-bold text-[#0f172a] text-sm truncate leading-tight flex items-center gap-1.5">
                            {userName}
                            {isAdmin && <span className="text-[9px] bg-amber-100 text-amber-900 border border-amber-300 px-1 py-0.2 rounded font-extrabold uppercase">Admin</span>}
                          </h4>
                          <p className="text-[10px] text-stone-600 truncate mt-0.5 max-w-[190px]">{userHeadline}</p>
                        </div>
                      </div>
                      <div className="mt-2.5">
                        {isAdmin ? (
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[9px] font-extrabold border border-amber-300 uppercase tracking-wide">
                              👑 Super Admin ({SUPER_ADMIN_EMAIL})
                            </span>
                          </div>
                        ) : linkedinAccount ? (
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[9px] font-bold border border-emerald-200 uppercase tracking-wide">
                              ✓ LinkedIn Connected
                            </span>
                          </div>
                        ) : isLoggedIn ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[9px] font-bold border border-emerald-200 uppercase tracking-wide">
                            ✓ Linked & Syncing
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[9px] font-bold border border-slate-300 uppercase tracking-wide">
                            ℹ️ Standard Account
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Dropdown Options */}
                    <div className="space-y-1 px-2">
                      {/* Edit Profile & Photo */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowEditProfileModal(true);
                          setShowProfileDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-slate-900 bg-stone-100 hover:bg-stone-200 rounded-xl flex items-center justify-between transition-all cursor-pointer border border-stone-200"
                      >
                        <div className="flex items-center gap-2">
                          <Edit3 className="w-3.5 h-3.5 text-[#0a66c2] shrink-0" />
                          <span>Edit Profile & Photo</span>
                        </div>
                        <span className="text-[10px] text-stone-500 font-medium">Edit</span>
                      </button>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowAdminPortal(true);
                            setShowProfileDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-bold text-amber-950 bg-amber-50 hover:bg-amber-100 rounded-xl flex items-center justify-between transition-all cursor-pointer border-2 border-amber-300"
                        >
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                            <span>Admin Portal (20-Cap Control)</span>
                          </div>
                          <span className="text-[9px] bg-amber-200 text-amber-900 font-extrabold px-1.5 py-0.5 rounded">
                            Manage
                          </span>
                        </button>
                      )}

                      {/* How to use draftr */}
                      <button
                        onClick={() => {
                          setShowHowToUseModal(true);
                          setShowProfileDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-blue-950 bg-blue-50/70 hover:bg-blue-100 rounded-xl flex items-center gap-2 transition-all cursor-pointer border-2 border-blue-200"
                      >
                        <HelpCircle className="w-3.5 h-3.5 text-blue-900 shrink-0" />
                        <span>How to use draftr</span>
                      </button>

                      {linkedinAccount ? (
                        <button
                          onClick={() => {
                            disconnectLinkedIn();
                            setShowProfileDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2 transition-all cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span>Disconnect LinkedIn</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            connectLinkedIn();
                            setShowProfileDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-bold text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-xl flex items-center gap-2 transition-all cursor-pointer border-2 border-blue-200"
                        >
                          <Share2 className="w-3.5 h-3.5 text-blue-900 shrink-0" />
                          <span>Sign In / Connect LinkedIn</span>
                        </button>
                      )}

                      {/* About draftr */}
                      <button
                        onClick={() => {
                          setShowAboutModal(true);
                          setShowProfileDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-[#0f172a] hover:bg-slate-100 rounded-xl flex items-center gap-2 transition-all cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                        <span>About draftr</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowContactModal(true);
                          setShowProfileDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-[#0f172a] hover:bg-slate-100 rounded-xl flex items-center gap-2 transition-all cursor-pointer"
                      >
                        <Mail className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                        <span>Contact Support</span>
                      </button>
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Studio Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 pb-24 flex flex-col gap-6">

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
        
        {/* LEFT COLUMN: Workspace Input & Tuning */}
        <section id="workspace-column" className="lg:col-span-5 flex flex-col gap-6">
          {activeWorkspaceTab === "create" ? (
            <>
              <form onSubmit={handleGeneratePosts} className="flex flex-col gap-6">
                {/* Card 1: Input Source Material */}
                <div className="bg-white rounded-2xl border-2 border-[#0f172a] shadow-sm overflow-hidden">
                  {/* Heading with Blue Background & White Text */}
                  <div className="bg-[#0f172a] text-white px-5 py-3.5 flex items-center justify-between border-b-2 border-[#0f172a]">
                    <h2 className="font-serif text-white flex items-center gap-2 text-base sm:text-lg font-bold tracking-tight">
                      <BookOpen className="w-5 h-5 text-white" />
                      1. Source Content
                    </h2>
                  </div>

                  <div className="p-5 sm:p-6 space-y-4">
                    {/* Sub-tabs for inputting notes/notebooks */}
                    <div className="grid grid-cols-3 gap-1 p-1 bg-stone-100 rounded-xl border-2 border-[#0f172a] text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setNotebookTab("paste")}
                        className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          notebookTab === "paste"
                            ? "bg-[#0f172a] text-white font-bold shadow-xs"
                            : "text-[#0f172a] hover:bg-stone-200"
                        }`}
                      >
                        📝 Raw Text
                      </button>
                      <button
                        type="button"
                        onClick={() => setNotebookTab("link")}
                        className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          notebookTab === "link"
                            ? "bg-[#0f172a] text-white font-bold shadow-xs"
                            : "text-[#0f172a] hover:bg-stone-200"
                        }`}
                      >
                        🔗 Link URL
                      </button>
                      <button
                        type="button"
                        onClick={() => setNotebookTab("upload")}
                        className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          notebookTab === "upload"
                            ? "bg-[#0f172a] text-white font-bold shadow-xs"
                            : "text-[#0f172a] hover:bg-stone-200"
                        }`}
                      >
                        📁 Upload File
                      </button>
                    </div>

                    {/* Tab Content: Link External Notebook */}
                    {notebookTab === "link" && (
                      <div className="space-y-3 p-3.5 bg-slate-50 rounded-2xl border-2 border-slate-200">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={notebookUrl}
                            onChange={(e) => setNotebookUrl(e.target.value)}
                            placeholder="URL"
                            className="flex-1 text-xs border border-slate-200 bg-white text-slate-900 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#0f172a]"
                          />
                          <button
                            type="button"
                            onClick={handleFetchExternalNotebook}
                            disabled={isParsingNotebook}
                            className="bg-[#0f172a] text-white text-xs px-4 py-2.5 rounded-xl font-bold hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 flex items-center gap-1 transition-all cursor-pointer"
                          >
                            {isParsingNotebook ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              "Fetch"
                            )}
                          </button>
                        </div>
                        {notebookLoadError && (
                          <div className="text-[10px] bg-rose-50 border border-rose-200 text-rose-700 p-2.5 rounded-lg font-semibold leading-normal">
                            ⚠️ {notebookLoadError}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tab Content: Local File Upload */}
                    {notebookTab === "upload" && (
                      <div className="space-y-3 p-3.5 bg-slate-50 rounded-2xl border-2 border-slate-200">
                        <div className="border-2 border-dashed border-slate-300 hover:border-[#0f172a] rounded-2xl p-5 text-center bg-white transition-all relative">
                          <input
                            type="file"
                            onChange={handleLocalNotebookUpload}
                            disabled={isParsingNotebook}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                          />
                          {isParsingNotebook ? (
                            <div className="py-2 flex flex-col items-center justify-center gap-2">
                              <RefreshCw className="w-5 h-5 text-[#0f172a] animate-spin" />
                              <p className="text-xs font-bold text-slate-800">Analyzing & extracting notes with AI...</p>
                              <p className="text-[10px] text-slate-500">Extracting structured insights and takeaways</p>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              <div className="text-2xl">📥</div>
                              <p className="text-xs font-bold text-slate-800">Click or Drag ANY File Here</p>
                              <p className="text-[10px] text-slate-500 font-medium">All file types supported — PDF, Word, Excel, PowerPoint, Images, Code, Notebooks & Text</p>
                            </div>
                          )}
                        </div>
                        {notebookLoadError && (
                          <div className="text-[10px] bg-rose-50 border border-rose-200 text-rose-700 p-2.5 rounded-lg font-semibold leading-normal">
                            ⚠️ {notebookLoadError}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Parsed cells selector */}
                    {parsedCells.length > 0 && (
                      <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-200 space-y-3.5 animate-fade-in">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wide block">Loaded Source</span>
                            <h4 className="text-xs font-bold text-slate-900 truncate max-w-[150px] sm:max-w-[220px]">📖 {parsedTitle}</h4>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <button
                              type="button"
                              onClick={() => toggleSelectAllCells(true)}
                              className="text-[10px] text-[#0f172a] hover:underline font-bold cursor-pointer"
                            >
                              Select All
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleSelectAllCells(false)}
                              className="text-[10px] text-slate-500 hover:underline font-bold cursor-pointer"
                            >
                              Deselect All
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                          {parsedCells.map((cell) => (
                            <div
                              key={cell.id}
                              onClick={() => toggleCellSelection(cell.id)}
                              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden flex gap-2.5 items-start ${
                                cell.selected
                                  ? "border-[#0f172a] bg-white ring-1 ring-[#0f172a] shadow-xs"
                                  : "border-slate-200 hover:border-slate-300 bg-white/60"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={cell.selected}
                                readOnly
                                className="rounded border-slate-300 text-[#0f172a] focus:ring-[#0f172a] w-3.5 h-3.5 mt-0.5 shrink-0"
                              />
                              <div className="flex-1 min-w-0 space-y-1">
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-mono font-bold uppercase tracking-wider block w-max ${
                                  cell.type === "code"
                                    ? "bg-slate-900 text-white"
                                    : "bg-slate-100 text-slate-800 border border-slate-200"
                                }`}>
                                  {cell.type === "code" ? "💻 code" : "💡 text"}
                                </span>
                                <pre className={`text-[10px] leading-relaxed whitespace-pre-wrap max-h-24 overflow-hidden ${
                                  cell.type === "code" ? "font-mono bg-slate-50 p-1.5 rounded-md text-slate-800 border border-slate-200" : "font-sans text-slate-700"
                                }`}>
                                  {cell.content}
                                </pre>
                              </div>
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={handleImportSelectedCells}
                          className="w-full py-2.5 bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          📥 Import Selected Cells ({parsedCells.filter(c => c.selected).length})
                        </button>
                      </div>
                    )}

                    <div className="space-y-4 pt-2 border-t border-slate-100">
                      {/* Learning Metadata fields */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Topic / Title (Optional)</label>
                        <input
                          type="text"
                          value={learningTitle}
                          onChange={(e) => setLearningTitle(e.target.value)}
                          placeholder=""
                          className="w-full text-sm border border-slate-200 bg-slate-50/50 text-slate-900 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-[#0f172a] focus:border-[#0f172a] focus:outline-none transition-all placeholder:text-slate-400"
                        />
                      </div>

                      {/* Raw Input notes textarea */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Notes or Transcript</label>
                        <div className="relative">
                          <textarea
                            value={learningsText}
                            onChange={(e) => setLearningsText(e.target.value)}
                            rows={7}
                            className="w-full text-sm border border-slate-200 bg-slate-50/50 text-slate-900 rounded-2xl p-4 focus:bg-white focus:ring-2 focus:ring-[#0f172a] focus:border-[#0f172a] focus:outline-none transition-all placeholder:text-slate-400 font-sans leading-relaxed"
                            placeholder=""
                          />
                          <div className="absolute bottom-3 right-3 text-[10px] font-mono text-slate-400 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                            {learningsText.length} chars
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 2: Tone & Formatting */}
                <div className="bg-white rounded-2xl border-2 border-[#0f172a] shadow-sm overflow-hidden">
                  {/* Heading with Blue Background & White Text */}
                  <div className="bg-[#0f172a] text-white px-5 py-3.5 flex items-center justify-between border-b-2 border-[#0f172a]">
                    <h2 className="font-serif text-white flex items-center gap-2 text-base sm:text-lg font-bold tracking-tight">
                      <Sliders className="w-5 h-5 text-white" />
                      2. Tone & Formatting
                    </h2>
                  </div>

                  <div className="p-5 sm:p-6 space-y-4">
                    {/* Custom grid cards for Tone Selection */}
                    <div className="mb-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {TONE_OPTIONS.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setSelectedTone(t.id)}
                            className={`p-3 rounded-xl border-2 text-left transition-all relative overflow-hidden group cursor-pointer flex flex-col justify-between ${
                              selectedTone === t.id
                                ? "border-[#0f172a] bg-[#0f172a] text-white shadow-xs font-medium"
                                : "border-stone-300 hover:border-[#0f172a] bg-white text-[#0f172a] hover:bg-stone-50"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-base shrink-0">{t.emoji}</span>
                              <span className={`font-bold text-xs ${selectedTone === t.id ? "text-white" : "text-[#0f172a]"}`}>
                                {t.name}
                              </span>
                            </div>
                            <p className={`text-[11px] leading-snug ${selectedTone === t.id ? "text-slate-300" : "text-slate-600"}`}>
                              {t.description}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Context configs */}
                    <div className="mb-4">
                      <label className="block text-xs font-bold text-[#0f172a] mb-1">Target Audience</label>
                      <select
                        value={selectedAudience}
                        onChange={(e) => setSelectedAudience(e.target.value)}
                        className="w-full text-xs border-2 border-[#0f172a] bg-white text-[#0f172a] rounded-xl p-2.5 focus:outline-none font-semibold cursor-pointer"
                      >
                        {AUDIENCES.map(a => (
                          <option key={a.id} value={a.id} className="bg-white text-slate-800">{a.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Toggles */}
                    <div className="grid grid-cols-2 gap-2 bg-stone-50 border-2 border-[#0f172a] rounded-xl p-3">
                      <label className="flex items-center justify-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={includeEmojis}
                          onChange={(e) => setIncludeEmojis(e.target.checked)}
                          className="rounded border-stone-400 text-[#0f172a] focus:ring-[#0f172a] w-4 h-4 bg-white"
                        />
                        <span className="text-xs font-bold text-[#0f172a]">Include Emojis</span>
                      </label>

                      <label className="flex items-center justify-center gap-2 cursor-pointer select-none border-l-2 border-[#0f172a]">
                        <input
                          type="checkbox"
                          checked={includeHashtags}
                          onChange={(e) => setIncludeHashtags(e.target.checked)}
                          className="rounded border-stone-400 text-[#0f172a] focus:ring-[#0f172a] w-4 h-4 bg-white"
                        />
                        <span className="text-xs font-bold text-[#0f172a]">Include Hashtags</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Card 3: Visual Asset */}
                <div className={`bg-white rounded-2xl border-2 border-[#0f172a] shadow-sm overflow-hidden ${!includeVisual ? "bg-stone-50" : ""}`}>
                  {/* Heading with Slate Background & White Text */}
                  <div className="bg-[#0f172a] text-white px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-[#0f172a]">
                    <h2 className="font-serif text-white flex items-center gap-2 text-base sm:text-lg font-bold tracking-tight">
                      <Image className="w-5 h-5 text-white" />
                      3. Visual Asset Studio (Optional)
                    </h2>
                    <div className="flex items-center gap-1 bg-[#1e293b] p-1 rounded-xl w-max self-start sm:self-auto border border-slate-700">
                      <button
                        type="button"
                        onClick={() => setIncludeVisual(true)}
                        className={`text-[10px] sm:text-xs px-3 py-1.5 rounded-lg transition-all font-semibold cursor-pointer ${includeVisual ? "bg-white text-[#0f172a] shadow-xs font-bold" : "text-slate-300 hover:text-white"}`}
                      >
                        🎨 Attach Visual
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIncludeVisual(false);
                          setAttachedImage("");
                        }}
                        className={`text-[10px] sm:text-xs px-3 py-1.5 rounded-lg transition-all font-semibold cursor-pointer ${!includeVisual ? "bg-white text-[#0f172a] shadow-xs font-bold" : "text-slate-300 hover:text-white"}`}
                      >
                        📄 Text Only
                      </button>
                    </div>
                  </div>

                  <div className="p-5 sm:p-6 space-y-4">
                    {!includeVisual ? (
                      <div className="py-6 px-4 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white space-y-1.5 animate-fade-in">
                        <span className="text-2xl block">📄</span>
                        <h3 className="text-xs font-bold text-slate-800">Text-Only Mode Activated</h3>
                        <p className="text-[10px] text-slate-500 max-w-sm mx-auto leading-relaxed">
                          Your posts will be drafted and formatted cleanly for text-only LinkedIn engagement.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4 animate-fade-in">
                        <div className="space-y-3">
                          <div className="border-2 border-dashed border-slate-300 hover:border-[#0f172a] rounded-2xl p-5 text-center bg-white hover:bg-slate-50 transition-all relative">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="space-y-1">
                              <div className="text-2xl">🖼️</div>
                              <p className="text-xs font-semibold text-slate-700">Click or Drag Image File Here</p>
                              <p className="text-[10px] text-slate-400">Supports PNG, JPG, JPEG, and WEBP formats</p>
                            </div>
                          </div>
                        </div>

                        {/* Inline image thumbnail when attached */}
                        {attachedImage && (
                          <div className="p-3 bg-blue-50/40 border-2 border-blue-200 rounded-2xl flex items-center gap-3 animate-fade-in relative">
                            <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-white shrink-0 flex items-center justify-center">
                              <img
                                src={attachedImage}
                                alt="Post preview thumbnail"
                                className="object-cover w-full h-full"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider block w-max mb-1">
                                ✓ Visual Ready
                              </span>
                              <p className="text-xs font-bold text-slate-800 truncate">Attached Post Graphic</p>
                              <p className="text-[10px] text-slate-500">Rendered in mockup preview</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setAttachedImage(null)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer shrink-0 transition-all"
                              title="Remove image"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Final Post Drafting Submission */}
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      {errorMsg && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl p-3 font-semibold flex items-center justify-between gap-2">
                          <span className="flex-1">⚠️ {errorMsg}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isGenerating || learningsText.trim().length === 0}
                        className={`w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all ${
                          isGenerating || learningsText.trim().length === 0
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none border-2 border-slate-200"
                            : "bg-[#0f172a] hover:bg-slate-800 text-white border-2 border-[#0f172a] hover:shadow-lg active:scale-98"
                        }`}
                      >
                        {isGenerating ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin text-white" />
                            <span>⚡ Fast-Drafting 3 Posts with Gemini Flash...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 text-blue-200" />
                            Draft 3 Custom LinkedIn Posts
                          </>
                        )}
                      </button>

                      {isGenerating && (
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 h-full w-full animate-pulse"></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </form>
            </>
          ) : activeWorkspaceTab === "scheduled" ? (
            
            /* SCHEDULED POSTS VIEW */
            <div className="bg-white rounded-3xl border-2 border-[#0f172a] shadow-sm p-5 sm:p-6 space-y-5 transition-all">
              <div className="flex items-center justify-between border-b-2 border-stone-200 pb-3 flex-wrap gap-2">
                <div>
                  <h3 className="font-bold text-[#0f172a] flex items-center gap-2 text-base">
                    <Calendar className="w-5 h-5 text-[#0f172a]" />
                    Scheduled LinkedIn Posts ({scheduledPosts.length})
                  </h3>
                  <p className="text-xs text-stone-500">Automated schedule and queue for direct LinkedIn publishing</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!activeDraftText && generatedDrafts.length > 0) {
                        setActiveDraftText(generatedDrafts[selectedDraftIndex]?.text || "");
                      }
                      setShowScheduleModal(true);
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-xs border border-blue-500 hover:scale-102"
                  >
                    <Plus className="w-3.5 h-3.5" /> Schedule a Post
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveWorkspaceTab("create")}
                    className="px-3 py-1.5 bg-[#0f172a] text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1 shadow-xs border-2 border-[#0f172a]"
                  >
                    <PenSquare className="w-3.5 h-3.5" /> Open Drafter
                  </button>
                </div>
              </div>

              {scheduledPosts.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-stone-300 rounded-2xl p-6 bg-stone-50 space-y-3">
                  <Calendar className="w-10 h-10 text-stone-400 mx-auto" />
                  <div>
                    <p className="text-sm text-stone-800 font-bold">No posts scheduled yet.</p>
                    <p className="text-xs text-stone-500 mt-0.5">Queue your drafts to publish at peak visibility times automatically!</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!activeDraftText && generatedDrafts.length > 0) {
                        setActiveDraftText(generatedDrafts[selectedDraftIndex]?.text || "");
                      }
                      setShowScheduleModal(true);
                    }}
                    className="px-4 py-2 bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-md inline-flex items-center gap-1.5"
                  >
                    <Calendar className="w-3.5 h-3.5 text-blue-400" />
                    <span>Schedule a Draft Now</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3 max-h-120 overflow-y-auto pr-1">
                  {scheduledPosts.map((post) => (
                    <div key={post.id} className="p-4 bg-stone-50 border-2 border-stone-200 rounded-2xl relative hover:border-[#0f172a] transition-all space-y-2.5">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          {post.status === "published" ? (
                            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-600 text-white px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                              <CheckCircle2 className="w-3 h-3" /> Published
                            </span>
                          ) : post.status === "due" ? (
                            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-amber-600 text-white px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs animate-pulse">
                              <AlertCircle className="w-3 h-3" /> Due Now - Ready to Post
                            </span>
                          ) : (
                            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#0f172a] text-white px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                              <Clock className="w-3 h-3" /> {post.scheduledFor}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCancelScheduledPost(post.id)}
                          className="text-rose-600 hover:text-rose-700 p-1 rounded hover:bg-rose-50 cursor-pointer text-xs font-bold flex items-center gap-1"
                          title="Remove from schedule"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                      </div>

                      <p className="text-xs text-stone-800 line-clamp-3 leading-relaxed whitespace-pre-wrap font-sans font-medium bg-white p-3 rounded-xl border border-stone-200/80">
                        {post.text}
                      </p>

                      {post.imageUrl && (
                        <img src={post.imageUrl} alt="Attached Visual" className="w-full h-28 object-cover rounded-xl border-2 border-stone-200 mt-1" />
                      )}

                      <div className="pt-2 border-t border-stone-200 flex flex-wrap items-center justify-between gap-2 text-[10px] text-stone-500 font-medium">
                        <div>
                          <span>Topic: {post.title}</span> • <span>Queued {post.createdAt}</span>
                        </div>
                        <div className="flex items-center gap-2 ml-auto">
                          <button
                            type="button"
                            onClick={() => handlePublishScheduledPost(post)}
                            className="px-3 py-1.5 bg-[#0a66c2] hover:bg-[#004182] text-white text-[11px] font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs hover:scale-102"
                            title="Publish to LinkedIn"
                          >
                            <Send className="w-3 h-3" /> Publish Now
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveDraftText(post.text);
                              if (post.imageUrl) setAttachedImage(post.imageUrl);
                              if (post.title) setLearningTitle(post.title);
                              setActiveWorkspaceTab("create");
                              triggerToast("Loaded into Drafter editor.");
                            }}
                            className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-[#0f172a] text-[11px] font-bold rounded-lg border border-stone-300 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <PenSquare className="w-3 h-3" /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyToClipboard(post.text, -1)}
                            className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-stone-700 text-[11px] font-semibold rounded-lg border border-stone-300 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Copy className="w-3 h-3" /> Copy
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeWorkspaceTab === "saved" ? (

            /* SAVED DRAFTS VIEW */
            <div className="bg-white rounded-3xl border-2 border-[#0f172a] shadow-sm p-5 sm:p-6 space-y-5 transition-all">
              <div className="flex items-center justify-between border-b-2 border-stone-200 pb-3">
                <div>
                  <h3 className="font-bold text-[#0f172a] flex items-center gap-2 text-base">
                    <Bookmark className="w-5 h-5 text-[#0f172a]" />
                    Your Saved Drafts ({savedDrafts.length})
                  </h3>
                  <p className="text-xs text-stone-500">Curated post templates and saved LinkedIn drafts</p>
                </div>
              </div>

              {savedDrafts.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-stone-300 rounded-2xl p-5 bg-stone-50">
                  <Bookmark className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                  <p className="text-xs text-stone-600 font-semibold">No drafts bookmarked yet.</p>
                  <p className="text-[10px] text-stone-500 mt-1">Generate posts in Drafter and click "Save Draft"!</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-120 overflow-y-auto pr-1">
                  {savedDrafts.map((draft) => (
                    <div key={draft.id} className="p-3 bg-stone-50 border-2 border-stone-200 rounded-2xl relative hover:border-[#0f172a] transition-colors">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-[#0f172a]/10 text-[#0f172a] px-2 py-0.5 rounded-md border border-[#0f172a]/20">
                          {draft.styleLabel}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleReloadSavedDraft(draft)}
                            className="text-[#0f172a] hover:text-slate-800 text-[10px] font-bold bg-[#0f172a]/10 border border-[#0f172a]/20 px-2 py-0.5 rounded-lg flex items-center gap-0.5 cursor-pointer"
                            title="Load back into editor"
                          >
                            <Wand2 className="w-2.5 h-2.5" /> Drafter
                          </button>
                          <button
                            onClick={() => handleDeleteDraft(draft.id)}
                            className="text-rose-600 hover:text-rose-700 p-1 rounded hover:bg-rose-50 cursor-pointer"
                            title="Delete draft"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-stone-800 line-clamp-3 leading-relaxed whitespace-pre-wrap font-sans font-medium">
                        {draft.text}
                      </p>
                      <div className="mt-2 pt-1.5 border-t border-stone-200 flex items-center justify-between text-[10px] text-stone-500">
                        <span>Original topic: {draft.learningTitle}</span>
                        <span>Saved {draft.createdAt.split(",")[0]}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (

            /* NOTES HISTORY VIEW */
            <div className="bg-white rounded-3xl border-2 border-[#0f172a] shadow-[0_8px_32px_rgba(0,0,0,0.02)] p-5 sm:p-6 space-y-5 hover:shadow-[0_12px_40px_rgba(0,0,0,0.03)] transition-all">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="font-bold text-[#0f172a] flex items-center gap-2 text-base">
                    <History className="w-5 h-5 text-[#0f172a]" />
                    Notes & Source History ({savedLearnings.length})
                  </h3>
                  <p className="text-xs text-slate-600 font-medium">Previously input learning notes, links, and documents</p>
                </div>
              </div>

              {savedLearnings.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-slate-300 rounded-2xl p-5 bg-slate-50">
                  <History className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-800 font-bold">No raw learning logs recorded.</p>
                  <p className="text-xs text-slate-500 mt-1">Input source materials in Drafter to save history!</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-120 overflow-y-auto pr-1">
                  {savedLearnings.map((learning) => (
                    <div
                      key={learning.id}
                      onClick={() => handleReloadLearning(learning)}
                      className="p-3.5 bg-slate-50 border-2 border-slate-200 hover:border-[#0f172a] rounded-xl flex items-center justify-between gap-3 text-xs cursor-pointer transition-all hover:shadow-md group"
                    >
                      <div className="truncate flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[10px] bg-[#0f172a] text-white font-bold px-2 py-0.5 rounded">
                            {learning.category}
                          </span>
                          <span className="font-bold text-[#0f172a] group-hover:text-blue-900 truncate block text-xs">
                            {learning.title}
                          </span>
                          {learning.drafts && learning.drafts.length > 0 && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.2 rounded border border-emerald-300 flex items-center gap-1 shrink-0">
                              <Sparkles className="w-2.5 h-2.5" /> 3 Drafts Ready
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">{learning.createdAt}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReloadLearning(learning);
                        }}
                        className="bg-[#0f172a] hover:bg-slate-800 text-white p-2 px-3.5 rounded-xl text-xs font-bold shrink-0 cursor-pointer flex items-center gap-1.5 transition shadow-xs group-hover:scale-102"
                      >
                        <Wand2 className="w-3.5 h-3.5 text-blue-300" /> Open 3 Drafts
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* RIGHT COLUMN: Output Playground & Mockup */}
        <section id="preview-column" className="lg:col-span-7 flex flex-col gap-5 p-4 sm:p-6 rounded-3xl bg-[#0f172a] border-2 border-slate-800 text-white shadow-2xl min-w-0 max-w-full overflow-hidden">
          
          {/* Main Block Heading */}
          <div className="flex items-center justify-between pb-3 border-b-2 border-slate-800">
            <h2 className="font-serif text-white flex items-center gap-2.5 text-base sm:text-lg font-bold tracking-tight">
              <Eye className="w-5 h-5 text-white" />
              Live LinkedIn Feed View
            </h2>
            {generatedDrafts.length > 0 && (
              <span className="text-[11px] bg-[#1e293b] text-slate-300 font-semibold px-2.5 py-0.5 rounded-full border border-slate-700">
                Draft {selectedDraftIndex + 1} of {generatedDrafts.length}
              </span>
            )}
          </div>

          {generatedDrafts.length === 0 ? (
            // Clean Waiting State Card
            <div className="bg-[#1e293b] rounded-2xl border-2 border-slate-700 p-6 sm:p-10 text-center flex flex-col items-center justify-center min-h-[340px] text-white shadow-lg w-full">
              <div className="w-14 h-14 bg-[#0f172a] text-white rounded-2xl flex items-center justify-center mb-3 border-2 border-slate-700 shadow-sm">
                <Wand2 className="w-7 h-7 text-white animate-pulse" />
              </div>
              <p className="text-xs sm:text-sm text-slate-300 max-w-md font-medium leading-relaxed">
                Enter your source notes and tap <span className="text-white font-bold">Generate LinkedIn Posts</span> to see your live preview here.
              </p>
            </div>
          ) : (
            
            // Post active container
            <div className="space-y-6 w-full min-w-0">
              
              {/* Tabs selector for Draft options */}
              {/* Draft Selector Tabs & Quick Actions Header */}
              <div className="bg-[#1e293b] border-2 border-slate-700 p-2.5 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shadow-md">
                <div className="flex gap-1 overflow-x-auto">
                  {generatedDrafts.map((draft, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedDraftIndex(idx)}
                      className={`min-w-[85px] py-2 px-3 rounded-xl transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                        selectedDraftIndex === idx
                          ? "bg-[#0f172a] text-white font-bold shadow-md border-2 border-slate-600"
                          : "text-slate-300 hover:bg-slate-800 hover:text-white"
                      }`}
                    >
                      <span className="font-bold text-3xs leading-none">Draft {idx + 1}</span>
                      <span className="text-[10px] opacity-90 font-medium truncate max-w-[90px] mt-0.5 text-center block leading-none">
                        {draft.styleLabel}
                      </span>
                    </button>
                  ))}
                </div>

              </div>

              {/* AUTHENTIC MOBILE SMARTPHONE MOCKUP */}
              <div className="w-full max-w-[420px] mx-auto bg-slate-950 border-[9px] sm:border-[11px] border-slate-900 rounded-[44px] sm:rounded-[48px] shadow-2xl overflow-hidden ring-1 ring-slate-700/60 relative">
                {/* Phone Status Bar with Dynamic Island */}
                <div className="bg-slate-950 px-6 pt-3 pb-2 flex items-center justify-between text-white text-[11px] font-semibold border-b border-slate-900/60 select-none">
                  <span>9:41</span>
                  <div className="w-22 h-4.5 bg-black rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-slate-900/80 mr-1.5 border border-slate-800"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-950/60"></div>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-300 text-[10px]">
                    <span className="font-bold text-[9px] tracking-tighter">5G</span>
                    <span>📶</span>
                    <span>🔋</span>
                  </div>
                </div>

                {/* LinkedIn In-App Mobile App Header */}
                <div className="bg-white px-3.5 py-2 border-b border-slate-200 flex items-center justify-between gap-2.5">
                  <img
                    src={userAvatar}
                    alt={userName}
                    referrerPolicy="no-referrer"
                    className="w-7 h-7 rounded-full border border-slate-200 object-cover shrink-0"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=0A66C2&color=fff`;
                    }}
                  />
                  <div className="flex-1 bg-slate-100 hover:bg-slate-200/80 rounded-md py-1 px-2.5 flex items-center gap-1.5 text-slate-400 text-xs transition-colors">
                    <Search className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[11px] text-slate-500 font-medium">Search</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <MessageSquare className="w-4 h-4 text-slate-600" />
                  </div>
                </div>

                {/* LinkedIn Mobile Feed Viewport */}
                <div className="bg-slate-100 p-2.5 sm:p-3 overflow-y-auto max-h-[580px] space-y-2.5">
                  {/* LinkedIn Feed Post Card */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 overflow-hidden text-[#212020]">
                    {/* User Profile Info Header */}
                    <div className="p-3.5 pb-2.5 flex items-start gap-2.5">
                      <img
                        src={userAvatar}
                        alt={userName}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-full border border-slate-200 object-cover shrink-0"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=0A66C2&color=fff`;
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-xs truncate">
                            {userName || "Your Name"}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 truncate leading-tight mt-0.5">{userHeadline || "LinkedIn Member"}</p>
                        <p className="text-[9px] text-slate-400 mt-0.5 flex items-center gap-1 font-medium">
                          <span>1h</span>
                          <span>•</span>
                          <span>🌐</span>
                        </p>
                      </div>
                    </div>

                    {/* Post Content Body */}
                    <div className="px-3.5 pb-3 text-slate-800 text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap break-words">
                      {isEditingManually ? (
                        <div className="space-y-2">
                          <textarea
                            value={activeDraftText}
                            onChange={handleManualTextChange}
                            rows={8}
                            className="w-full text-xs border border-slate-200 bg-slate-50 text-slate-900 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-900/15 focus:border-blue-900 focus:outline-none leading-relaxed break-words"
                            placeholder=""
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => setIsEditingManually(false)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] px-2.5 py-1 rounded-lg font-semibold cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={saveManualEdits}
                              className="bg-[#0f172a] hover:bg-slate-800 text-white text-[11px] px-2.5 py-1 rounded-lg font-semibold cursor-pointer"
                            >
                              Save Edits
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className={`break-words ${!isMockExpanded ? "max-h-28 overflow-hidden relative" : ""}`}>
                            {activeDraftText}
                            {!isMockExpanded && (
                              <div className="absolute bottom-0 right-0 bg-gradient-to-l from-white via-white/95 to-transparent pl-12 pt-1 font-semibold">
                                <button
                                  onClick={() => setIsMockExpanded(true)}
                                  className="text-slate-500 hover:text-blue-900 text-[11px] font-bold bg-white cursor-pointer"
                                >
                                  ...see more
                                </button>
                              </div>
                            )}
                          </div>
                          {isMockExpanded && (
                            <div className="mt-2 text-right">
                              <button
                                onClick={() => setIsMockExpanded(false)}
                                className="text-slate-400 hover:text-slate-600 text-[11px] font-medium cursor-pointer"
                              >
                                Show less
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Attached Media Asset */}
                    {attachedImage && (
                      <div className="relative border-y border-slate-100 bg-slate-900/5 max-h-80 flex items-center justify-center overflow-hidden">
                        <img
                          src={attachedImage}
                          alt="Attached media asset"
                          className="max-h-80 object-contain w-full"
                          referrerPolicy="no-referrer"
                        />
                        <button
                          onClick={() => setAttachedImage(null)}
                          className="absolute top-2 right-2 bg-black/80 hover:bg-black text-white p-1.5 rounded-full text-xs flex items-center justify-center cursor-pointer border border-zinc-700 shadow-md"
                          title="Remove attached image"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {/* Social Reactions Counter */}
                    <div className="border-t border-slate-100 px-3 py-2 flex items-center justify-between text-slate-500 text-[10px] font-medium">
                      <div className="flex items-center gap-1">
                        <span className="flex items-center -space-x-1">
                          <span className="w-3.5 h-3.5 rounded-full bg-[#0077b5] flex items-center justify-center text-[7px] text-white">👍</span>
                          <span className="w-3.5 h-3.5 rounded-full bg-rose-500 flex items-center justify-center text-[7px] text-white">❤️</span>
                          <span className="w-3.5 h-3.5 rounded-full bg-amber-500 flex items-center justify-center text-[7px] text-white">💡</span>
                        </span>
                        <span className="text-slate-600 font-semibold pl-0.5">34</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500 text-[10px]">
                        <span>12 comments</span>
                        <span>•</span>
                        <span>3 reposts</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Smartphone Bottom Home Indicator Bar */}
                <div className="bg-slate-950 py-2 flex justify-center">
                  <div className="w-28 h-1 bg-slate-600 rounded-full"></div>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              {publishSuccess && (
                <div className="w-full bg-emerald-50 border-2 border-emerald-400 text-emerald-950 p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs font-semibold mt-4 shadow-sm animate-fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Post published directly to your LinkedIn feed!</span>
                  </div>
                  <a
                    href="https://www.linkedin.com/feed/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-bold text-emerald-800 hover:text-emerald-950 shrink-0"
                  >
                    View Feed ↗
                  </a>
                </div>
              )}

              {publishError && (
                <div className="w-full bg-rose-50 border-2 border-rose-300 text-rose-800 p-3.5 rounded-2xl flex items-center gap-2 text-xs font-semibold mt-4 shadow-sm animate-fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="flex-1">Posting error: {publishError}</span>
                  <button
                    type="button"
                    onClick={() => setPublishError("")}
                    className="text-stone-400 hover:text-stone-700 text-xs font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
                <button
                  onClick={linkedinAccount ? handlePublishToLinkedIn : connectLinkedIn}
                  disabled={isPublishingLinkedIn || !activeDraftText}
                  className="bg-[#0077b5] hover:bg-[#006097] text-white font-bold text-sm py-3 px-5 rounded-xl flex items-center gap-2 shadow-md disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isPublishingLinkedIn ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      {linkedinAccount ? "Post Now" : "Connect & Post"}
                    </>
                  )}
                </button>

                <button
                  id="post-preview-schedule-btn"
                  onClick={() => {
                    if (!isLoggedIn && !linkedinAccount) {
                      triggerToast("🔒 Please log in to schedule posts.");
                      setShowEmailAuthModal(true);
                      return;
                    }
                    if (!activeDraftText) {
                      triggerToast("⚠️ Generate or select a post draft before scheduling.");
                      return;
                    }
                    setShowScheduleModal(true);
                  }}
                  disabled={!activeDraftText}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm py-3 px-5 rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer border border-slate-600 disabled:opacity-50"
                  title="Schedule this post for future publishing"
                >
                  <Calendar className="w-4 h-4 text-blue-400" /> Schedule
                </button>

                <button
                  onClick={() => handleCopyToClipboard(activeDraftText, selectedDraftIndex)}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm py-3 px-5 rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer border border-slate-600"
                >
                  {copiedIndex === selectedDraftIndex ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-300" />
                      Copy Post
                    </>
                  )}
                </button>

                <button
                  onClick={handleSaveDraft}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm py-3 px-5 rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer border border-slate-600"
                >
                  <Bookmark className="w-4 h-4 text-amber-400" />
                  Save
                </button>

                <button
                  onClick={() => setIsEditingManually(!isEditingManually)}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm py-3 px-5 rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer border border-slate-600"
                >
                  <PenSquare className="w-4 h-4 text-purple-400" />
                  {isEditingManually ? "Done Editing" : "Edit"}
                </button>
              </div>

              {/* RATIONALE AND AI REFINEMENT DRAWER */}
              <div className="bg-[#1e293b] rounded-2xl border-2 border-slate-700 shadow-xl p-4 sm:p-5 space-y-4">
                <div>
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-white" />
                    AI Polish & Refinements
                  </h4>
                  <p className="text-xs text-slate-300">Select a preset or enter instructions to customize this post.</p>
                </div>

                {/* Preset edit chips */}
                <div className="flex flex-wrap gap-1.5">
                  {REFINEMENT_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleRefinePost(preset.prompt)}
                      disabled={isRefining}
                      className="text-3xs bg-[#0f172a] hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold px-2.5 py-1.5 rounded-full transition-colors flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                    >
                      ✨ {preset.label}
                    </button>
                  ))}
                </div>

                {/* Instruction custom box */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={refinementPrompt}
                      onChange={(e) => setRefinementPrompt(e.target.value)}
                      placeholder=""
                      className="flex-1 text-xs border border-slate-700 rounded-xl px-3 py-2.5 bg-[#0f172a] text-white focus:ring-1 focus:ring-slate-500 focus:outline-none"
                    />
                    <button
                      onClick={() => handleRefinePost(refinementPrompt)}
                      disabled={isRefining || !refinementPrompt.trim()}
                      className={`px-4 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 ${
                        isRefining || !refinementPrompt.trim()
                          ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                          : "bg-[#0f172a] text-white hover:bg-slate-800 cursor-pointer border border-slate-600"
                      }`}
                    >
                      {isRefining ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      Apply
                    </button>
                  </div>

                  {refinementFeedback && (
                    <div className="bg-[#0f172a] border border-slate-700 text-slate-200 text-3xs rounded-xl p-3 leading-relaxed">
                      <strong>AI Editor Note:</strong> {refinementFeedback}
                    </div>
                  )}
                </div>

              </div>

              {/* AUTOMATED ADVANCED ANALYTICS */}
              <div className="bg-white rounded-2xl border-2 border-[#0f172a] shadow-md p-4 sm:p-5 space-y-4 text-slate-800">
                <div className="flex items-center justify-between border-b-2 border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#0f172a] text-white flex items-center justify-center shrink-0">
                      <TrendingUp className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#0f172a] text-sm">
                        Algorithmic Copy Analyzer
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">Real-time analysis based on high-performing copy guidelines</p>
                    </div>
                  </div>
                  
                  {isAnalyzing && (
                    <span className="text-3xs font-bold text-white bg-[#0f172a] px-2.5 py-1 rounded-full flex items-center gap-1.5 animate-pulse">
                      <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Recalculating...
                    </span>
                  )}
                </div>

                {analysis ? (
                  <div className="space-y-4">
                    {/* Scores layout */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Hook Score */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-3xs font-bold text-slate-500">Hook Strength</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${getScoreColor(analysis.hookScore)}`}>
                            {analysis.hookScore}/10
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full mb-2 overflow-hidden">
                          <div className={`h-full rounded-full ${analysis.hookScore >= 8 ? "bg-blue-900" : analysis.hookScore >= 5 ? "bg-stone-500" : "bg-rose-500"}`} style={{ width: `${analysis.hookScore * 10}%` }}></div>
                        </div>
                        <p className="text-[10px] text-slate-600 leading-normal">{analysis.hookFeedback}</p>
                      </div>

                      {/* Readability Score */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-3xs font-bold text-slate-500">Spacing & Whitespace</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${getScoreColor(analysis.readabilityScore)}`}>
                            {analysis.readabilityScore}/10
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full mb-2 overflow-hidden">
                          <div className={`h-full rounded-full ${analysis.readabilityScore >= 8 ? "bg-blue-900" : analysis.readabilityScore >= 5 ? "bg-stone-500" : "bg-rose-500"}`} style={{ width: `${analysis.readabilityScore * 10}%` }}></div>
                        </div>
                        <p className="text-[10px] text-slate-600 leading-normal">{analysis.readabilityFeedback}</p>
                      </div>

                      {/* Value score */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-3xs font-bold text-slate-500">Insight Density</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${getScoreColor(analysis.valueScore)}`}>
                            {analysis.valueScore}/10
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full mb-2 overflow-hidden">
                          <div className={`h-full rounded-full ${analysis.valueScore >= 8 ? "bg-blue-900" : analysis.valueScore >= 5 ? "bg-stone-500" : "bg-rose-500"}`} style={{ width: `${analysis.valueScore * 10}%` }}></div>
                        </div>
                        <p className="text-[10px] text-slate-600 leading-normal">{analysis.valueFeedback}</p>
                      </div>
                    </div>

                    {/* Meta stats block */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-slate-50 rounded-xl p-3 border border-slate-200">
                      <div className="text-center md:border-r border-slate-200 pb-2 md:pb-0">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Estimated Reach</span>
                        <span className={`text-xs font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full ${
                          analysis.estimatedEngagement === "High" ? "bg-blue-50 text-blue-900 border border-blue-200" :
                          analysis.estimatedEngagement === "Medium" ? "bg-[#ede6db] text-[#212020] border border-stone-300" :
                          "bg-rose-50 text-rose-750 border border-rose-100"
                        }`}>
                          🚀 {analysis.estimatedEngagement} Potential
                        </span>
                      </div>
                      
                      <div className="text-center md:border-r border-slate-200 pb-2 md:pb-0">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Word Count</span>
                        <span className="text-xs font-bold text-slate-800 flex items-center justify-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          {analysis.wordCount} words
                        </span>
                      </div>

                      <div className="text-center col-span-2 md:col-span-1 border-t md:border-t-0 border-slate-200 pt-2 md:pt-0">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Estimated Read Time</span>
                        <span className="text-xs font-bold text-slate-800 flex items-center justify-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {analysis.readTimeSeconds} seconds
                        </span>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="py-6 text-center border border-slate-200 bg-slate-50 text-slate-500 rounded-xl text-3xs font-medium">
                    {isGenerating ? "Evaluating draft metrics..." : "Generating analytics insights from Gemini..."}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>

      {/* Footer copyright */}
      <footer id="app-footer" className="bg-white border-t border-[#ede6db] py-6 px-4 text-center text-xs text-stone-500 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="font-medium">Developed by alt. All rights reserved. 2026.</span>
          <button
            onClick={handleDownloadAppClick}
            className="flex items-center gap-1.5 text-stone-600 hover:text-stone-900 font-medium transition cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Install draftr App</span>
          </button>
        </div>
      </footer>

      {/* Schedule Post Modal */}
      <ScheduleModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        postText={activeDraftText || (generatedDrafts.length > 0 ? generatedDrafts[selectedDraftIndex]?.text : "")}
        postTitle={learningTitle || (generatedDrafts[selectedDraftIndex]?.styleLabel ? `${generatedDrafts[selectedDraftIndex].styleLabel} Draft` : "LinkedIn Post")}
        postImage={attachedImage}
        userName={userName}
        userAvatar={userAvatar}
        scheduledDate={scheduledDate}
        setScheduledDate={setScheduledDate}
        scheduledTime={scheduledTime}
        setScheduledTime={setScheduledTime}
        onConfirmSchedule={handleSchedulePostSubmit}
        isLinkedInConnected={!!linkedinAccount}
        onConnectLinkedIn={connectLinkedIn}
        isLoggedIn={isLoggedIn || !!linkedinAccount}
        onOpenLogin={() => {
          setShowScheduleModal(false);
          setShowEmailAuthModal(true);
        }}
        drafts={generatedDrafts}
        selectedDraftIndex={selectedDraftIndex}
        onSelectDraftIndex={(i) => {
          setSelectedDraftIndex(i);
          setActiveDraftText(generatedDrafts[i]?.text || "");
        }}
      />

      {/* Saved History & Drafts Modal */}
      {showSavedHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#fcfbfa] w-full max-w-2xl rounded-3xl border border-stone-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-fade-in text-slate-800">
            <div className="p-6 border-b border-stone-150 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-indigo-650" />
                <div>
                  <h3 className="font-serif font-bold text-slate-900 text-lg leading-tight">Your Curated Drafts & Notes</h3>
                  <p className="text-xs text-stone-500">Restore or manage your technical publications portfolio</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSavedHistoryModal(false)}
                className="text-stone-400 hover:text-stone-700 p-1.5 rounded-full hover:bg-stone-50 transition cursor-pointer font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div>
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  📁 Bookmarked LinkedIn Posts ({savedDrafts.length})
                </h4>
                {savedDrafts.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-stone-200 rounded-2xl p-5 bg-white">
                    <Bookmark className="w-6 h-6 text-stone-300 mx-auto mb-2" />
                    <p className="text-xs text-stone-600 font-semibold">No drafts bookmarked yet.</p>
                    <p className="text-[10px] text-stone-500 mt-0.5">Your generated and curated drafts will appear here.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {savedDrafts.map((draft) => (
                      <div key={draft.id} className="p-4 bg-white border border-stone-150 rounded-2xl relative hover:border-stone-300 transition shadow-2xs flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[9px] font-bold uppercase tracking-wider bg-stone-100 text-stone-650 px-2 py-0.5 rounded">
                              {draft.styleLabel}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  handleReloadSavedDraft(draft);
                                  setShowSavedHistoryModal(false);
                                }}
                                className="text-indigo-600 hover:text-indigo-700 text-[9px] font-bold bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded flex items-center gap-0.5 cursor-pointer"
                              >
                                Load
                              </button>
                              <button
                                onClick={() => handleDeleteDraft(draft.id)}
                                className="text-rose-600 hover:text-rose-700 p-1 rounded hover:bg-rose-50 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-stone-700 line-clamp-4 leading-relaxed whitespace-pre-wrap font-sans">
                            {draft.text}
                          </p>
                        </div>
                        <div className="mt-4 pt-2 border-t border-stone-100 flex items-center justify-between text-[9px] text-stone-400">
                          <span className="truncate max-w-[120px]">Topic: {draft.learningTitle}</span>
                          <span>{draft.createdAt.split(",")[0]}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-stone-150 pt-5">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-indigo-650 shrink-0" />
                  Notes History Logs ({savedLearnings.length})
                </h4>
                {savedLearnings.length === 0 ? (
                  <p className="text-[10px] text-stone-400">No logs found.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {savedLearnings.map((learning) => (
                      <div
                        key={learning.id}
                        onClick={() => {
                          handleReloadLearning(learning);
                          setShowSavedHistoryModal(false);
                        }}
                        className="p-3 bg-white border border-stone-200 hover:border-[#0f172a] rounded-xl flex items-center justify-between gap-3 text-xs shadow-3xs cursor-pointer transition-all hover:bg-slate-50"
                      >
                        <div className="truncate flex-1">
                          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                            <span className="text-[9px] bg-stone-100 text-stone-600 font-semibold px-1.5 py-0.2 rounded">
                              {learning.category}
                            </span>
                            <span className="font-semibold text-stone-850 truncate block text-[11px]">
                              {learning.title}
                            </span>
                            {learning.drafts && learning.drafts.length > 0 && (
                              <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1 rounded">
                                3 Drafts
                              </span>
                            )}
                          </div>
                          <p className="text-[9px] text-stone-400">{learning.createdAt}</p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReloadLearning(learning);
                            setShowSavedHistoryModal(false);
                          }}
                          className="bg-[#0f172a] hover:bg-slate-800 border border-[#0f172a] text-white p-1 px-3 rounded-lg text-2xs font-bold cursor-pointer shrink-0 transition"
                        >
                          Open 3 Drafts
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* About Modal */}
      {showAboutModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl border-2 border-[#0f172a] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-up text-[#0f172a]">
            {/* Modal Header */}
            <div className="p-5 border-b-2 border-slate-800 flex items-center justify-between bg-[#0f172a] text-white">
              <div className="flex items-center gap-2.5">
                <DraftrLogo className="w-7 h-7" variant="light" />
                <div>
                  <h3 className="font-serif font-bold text-white text-lg leading-tight">About draftr</h3>
                  <p className="text-xs text-slate-300 font-medium">Your intelligent LinkedIn content studio</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAboutModal(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-800 transition cursor-pointer font-bold text-sm"
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-sm text-[#0f172a] leading-relaxed">
              <div className="bg-slate-50 rounded-2xl border-2 border-[#0f172a] p-5 space-y-2 shadow-xs">
                <h4 className="font-serif text-[#0f172a] font-bold text-lg">Empowering Professionals to Share Ideas</h4>
                <p className="text-xs text-slate-700 font-medium leading-relaxed">
                  draftr transforms your raw notes, project summaries, URLs, code, or documents into engaging, high-impact LinkedIn posts. Designed for creators, engineers, founders, and professionals who want to consistently build a powerful online presence.
                </p>
              </div>

              {/* Optimization Standards */}
              <div className="space-y-3">
                <h4 className="font-bold text-[#0f172a] text-xs uppercase tracking-wider">Content Optimization Engine</h4>
                <div className="bg-slate-50 border-2 border-[#0f172a] rounded-2xl p-4.5 space-y-3 shadow-inner">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-lg bg-[#0f172a] text-white flex items-center justify-center shrink-0 font-bold text-xs">✓</span>
                    <div>
                      <strong className="text-xs text-[#0f172a] block">Whitespace & Spacing Optimization</strong>
                      <p className="text-xs text-slate-600 leading-relaxed font-medium">Automatically structures short readable paragraphs that drive high digital retention.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 pt-2 border-t border-slate-200">
                    <span className="w-6 h-6 rounded-lg bg-[#0f172a] text-white flex items-center justify-center shrink-0 font-bold text-xs">✓</span>
                    <div>
                      <strong className="text-xs text-[#0f172a] block">High-Impact Hook Crafting</strong>
                      <p className="text-xs text-slate-600 leading-relaxed font-medium">Drafts compelling opening lines designed to earn clicks on the "see more" button.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 pt-2 border-t border-slate-200">
                    <span className="w-6 h-6 rounded-lg bg-[#0f172a] text-white flex items-center justify-center shrink-0 font-bold text-xs">✓</span>
                    <div>
                      <strong className="text-xs text-[#0f172a] block">Zero AI-Cliche Filters</strong>
                      <p className="text-xs text-slate-600 leading-relaxed font-medium">Removes boring AI prefixes, making your professional profile look highly organic and authentic.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Core capabilities */}
              <div className="space-y-3">
                <h4 className="font-bold text-[#0f172a] text-xs uppercase tracking-wider">What draftr Does</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 bg-slate-50 border-2 border-[#0f172a] rounded-xl shadow-2xs">
                    <span className="text-[#0f172a] font-bold text-xs block mb-1">📝 Multiformat Ingestion</span>
                    <p className="text-[11px] text-slate-600 leading-normal font-medium">Accepts raw text notes, web page links, and uploaded files (PDFs, docs, text, images).</p>
                  </div>
                  <div className="p-3.5 bg-slate-50 border-2 border-[#0f172a] rounded-xl shadow-2xs">
                    <span className="text-[#0f172a] font-bold text-xs block mb-1">✨ Smart Tone Tuning</span>
                    <p className="text-[11px] text-slate-600 leading-normal font-medium">Customize tone, target audience, emoji levels, and hashtags to match your voice.</p>
                  </div>
                  <div className="p-3.5 bg-slate-50 border-2 border-[#0f172a] rounded-xl shadow-2xs">
                    <span className="text-[#0f172a] font-bold text-xs block mb-1">🖼️ Visual Asset Creator</span>
                    <p className="text-[11px] text-slate-600 leading-normal font-medium">Generate brand-aligned graphic banners or illustrations for every post.</p>
                  </div>
                  <div className="p-3.5 bg-slate-50 border-2 border-[#0f172a] rounded-xl shadow-2xs">
                    <span className="text-[#0f172a] font-bold text-xs block mb-1">🚀 Schedule & Direct Publish</span>
                    <p className="text-[11px] text-slate-600 leading-normal font-medium">Publish instantly or schedule your posts directly to your LinkedIn account.</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl border-2 border-[#0f172a] p-4 flex items-center justify-end">
                <button
                  onClick={() => setShowAboutModal(false)}
                  className="px-5 py-2 bg-[#0f172a] text-white rounded-xl text-xs font-bold hover:bg-slate-800 cursor-pointer transition shadow-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact Support Modal */}
      {showContactModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowContactModal(false)}
        >
          <div 
            className="bg-white w-full max-w-md rounded-3xl border-2 border-[#0f172a] shadow-2xl overflow-hidden flex flex-col animate-fade-in text-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 sm:p-6 border-b-2 border-stone-200 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#0f172a] text-white flex items-center justify-center shadow-xs">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-[#0f172a] text-lg leading-tight">Contact Support</h3>
                  <p className="text-xs text-stone-500 font-medium">Get in touch with our team</p>
                </div>
              </div>
              <button 
                onClick={() => setShowContactModal(false)}
                className="text-stone-400 hover:text-stone-700 p-2 rounded-full hover:bg-stone-200 transition cursor-pointer font-bold text-sm"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* HQ Card */}
              <div className="bg-stone-50 rounded-2xl border-2 border-stone-200 p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-stone-500 text-[10px] font-bold uppercase tracking-wider">
                  <span>📍 HQ</span>
                </div>
                <p className="text-sm font-bold text-[#0f172a]">
                  Cape Town, South Africa
                </p>
              </div>

              {/* Email Card */}
              <div className="bg-stone-50 rounded-2xl border-2 border-stone-200 p-4 space-y-2">
                <div className="flex items-center gap-2 text-stone-500 text-[10px] font-bold uppercase tracking-wider">
                  <span>✉️ Email</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <a
                    href="mailto:draftr@alt.online"
                    className="text-sm font-bold text-blue-900 hover:text-blue-700 hover:underline break-all"
                  >
                    draftr@alt.online
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText("draftr@alt.online");
                      triggerToast("📋 Email address copied to clipboard!");
                    }}
                    className="px-3 py-1.5 text-xs font-bold rounded-xl bg-white hover:bg-stone-100 text-[#0f172a] border border-stone-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                    title="Copy email address"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 border-t-2 border-stone-200 bg-stone-50 flex justify-end">
              <button
                type="button"
                onClick={() => setShowContactModal(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-white hover:bg-stone-100 text-stone-700 border-2 border-stone-300 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Authentication Modal */}
      {showEmailAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl border border-stone-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-fade-in text-slate-800">
            <div className="p-6 border-b border-stone-150 flex items-center justify-between">
              <h3 className="font-serif font-bold text-slate-900 text-lg leading-tight">
                {showResetForm ? "Reset Creator Password" : isRegistering ? "Create Real Account" : "Access Creator Studio"}
              </h3>
              <button 
                onClick={() => {
                  setShowEmailAuthModal(false);
                  setShowResetForm(false);
                }}
                className="text-stone-400 hover:text-stone-700 p-1.5 rounded-full hover:bg-stone-50 transition cursor-pointer font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {showResetForm ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!resetEmail.trim()) return;
                    triggerToast(`📨 Password reset token successfully sent to "${resetEmail}"! Please verify your inbox.`);
                    setShowResetForm(false);
                    setResetEmail("");
                  }}
                  className="space-y-4"
                >
                  <p className="text-xs text-stone-550 leading-relaxed">
                    Provide your registered account email address. We will transmit an encrypted security link to immediately update your password.
                  </p>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="alex@example.com"
                      className="w-full text-xs border border-stone-200 bg-slate-50 text-slate-900 rounded-lg p-2.5 focus:bg-white focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 focus:outline-none transition-all font-medium"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowResetForm(false)}
                      className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                    >
                      Back to Log In
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-[#1b382b] hover:bg-[#142c22] text-[#ede6db] text-xs font-bold rounded-xl transition-all cursor-pointer"
                    >
                      Send Reset Link
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-1 p-1 bg-stone-100 rounded-xl text-xs font-semibold">
                    <button
                      onClick={() => { setIsRegistering(false); setAuthError(""); }}
                      className={`py-2 rounded-lg transition-all cursor-pointer ${!isRegistering ? "bg-white text-[#212020] shadow-xs" : "text-stone-500 hover:text-stone-900"}`}
                    >
                      Log In
                    </button>
                    <button
                      onClick={() => { setIsRegistering(true); setAuthError(""); }}
                      className={`py-2 rounded-lg transition-all cursor-pointer ${isRegistering ? "bg-white text-[#212020] shadow-xs" : "text-stone-500 hover:text-stone-900"}`}
                    >
                      Sign Up
                    </button>
                  </div>

                  <form 
                    onSubmit={async (e) => {
                      if (isRegistering) {
                        await handleRegister(e);
                      } else {
                        await handleLogin(e);
                      }
                      // Close modal on successful logins
                      if (localStorage.getItem("lnk_session_token")) {
                        setShowEmailAuthModal(false);
                      }
                    }} 
                    className="space-y-4"
                  >
                    {authError && (
                      <div className="p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-100 text-xs font-medium">
                        ⚠️ {authError}
                      </div>
                    )}

                    {isRegistering && (
                      <>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Your Full Name</label>
                          <input
                            type="text"
                            required
                            value={authName}
                            onChange={(e) => setAuthName(e.target.value)}
                            placeholder="Your Name"
                            className="w-full text-xs border border-stone-200 bg-slate-50 text-slate-900 rounded-lg p-2.5 focus:bg-white focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 focus:outline-none transition-all font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">LinkedIn Profile Headline</label>
                          <input
                            type="text"
                            value={authHeadline}
                            onChange={(e) => setAuthHeadline(e.target.value)}
                            placeholder="Senior Developer Advocate"
                            className="w-full text-xs border border-stone-200 bg-slate-50 text-slate-900 rounded-lg p-2.5 focus:bg-white focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 focus:outline-none transition-all font-medium"
                          />
                        </div>
                      </>
                    )}

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
                      <input
                        type="email"
                        required
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        placeholder="alex@example.com"
                        className="w-full text-xs border border-stone-200 bg-slate-50 text-slate-900 rounded-lg p-2.5 focus:bg-white focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 focus:outline-none transition-all font-medium"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Secure Password</label>
                        {!isRegistering && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowResetForm(true);
                              setResetEmail(authEmail);
                            }}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                          >
                            Forgot Password?
                          </button>
                        )}
                      </div>
                      <input
                        type="password"
                        required
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full text-xs border border-stone-200 bg-slate-50 text-slate-900 rounded-lg p-2.5 focus:bg-white focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 focus:outline-none transition-all font-medium"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isAuthenticating}
                      className="w-full py-2.5 bg-[#1b382b] hover:bg-[#142c22] text-[#ede6db] text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                    >
                      {isAuthenticating ? "Connecting Secure Server..." : isRegistering ? "Register New Account" : "Sign In to Studio"}
                    </button>
                  </form>

                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-stone-150"></div>
                    <span className="flex-shrink mx-3 text-stone-400 font-mono text-[9px] uppercase tracking-wider font-bold">Or login via</span>
                    <div className="flex-grow border-t border-stone-150"></div>
                  </div>

                  {/* LinkedIn Connect Direct option */}
                  <button
                    type="button"
                    onClick={() => {
                      connectLinkedIn();
                      setShowEmailAuthModal(false);
                    }}
                    className="w-full py-3 bg-[#0a66c2] hover:bg-[#004182] text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0">
                      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.8v8.37h2.8v-4.67c0-.25.02-.5.1-.68a1.14 1.14 0 0 1 1-.77c.76 0 1 .58 1 1.42v4.7h2.8M6.5 8.37a1.37 1.37 0 1 0 0-2.75 1.37 1.37 0 0 0 0 2.75M8 18.5V10.13H5.2V18.5H8z"/>
                    </svg>
                    <span>Log In with LinkedIn Account</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* How to use draftr Modal */}
      <HowToUseModal
        isOpen={showHowToUseModal}
        onClose={() => setShowHowToUseModal(false)}
      />

      {/* Super Admin Portal Modal */}
      <AdminPortalModal
        isOpen={showAdminPortal}
        onClose={() => setShowAdminPortal(false)}
        triggerToast={triggerToast}
      />

      {/* Edit Profile & Photo Modal */}
      <EditProfileModal
        isOpen={showEditProfileModal}
        onClose={() => setShowEditProfileModal(false)}
        currentName={userName}
        currentHeadline={userHeadline}
        currentAvatar={userAvatar}
        isAdmin={isAdmin}
        userEmail={SUPER_ADMIN_EMAIL}
        onSaveProfile={(p) => {
          setUserName(p.name);
          setUserHeadline(p.headline);
          setUserAvatar(p.avatar);
          localStorage.setItem("lnk_user_name", p.name);
          localStorage.setItem("lnk_user_headline", p.headline);
          localStorage.setItem("lnk_user_avatar", p.avatar);
          if (linkedinAccount) {
            setLinkedinAccount({
              ...linkedinAccount,
              profile: {
                ...linkedinAccount.profile,
                name: p.name,
                headline: p.headline,
                avatar: p.avatar,
                picture: p.avatar
              }
            });
          }
        }}
        triggerToast={triggerToast}
      />

      {/* Fixed Bottom Navigation Menu with Icons */}
      <nav id="bottom-navigation-bar" className="fixed bottom-0 left-0 right-0 z-50 bg-[#0f172a]/95 backdrop-blur-md border-t-2 border-slate-800 shadow-[0_-8px_30px_rgba(0,0,0,0.4)] py-2 px-3">
        <div className="max-w-md md:max-w-lg mx-auto flex items-center justify-between gap-1">
          <button
            id="nav-btn-drafter"
            onClick={() => {
              setActiveWorkspaceTab("create");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-xl transition-all cursor-pointer ${
              activeWorkspaceTab === "create"
                ? "bg-[#1e293b] text-white font-bold border-2 border-slate-700 shadow-xs scale-102"
                : "text-slate-300 hover:text-white hover:bg-[#1e293b]/50 font-medium"
            }`}
          >
            <PenSquare className={`w-5 h-5 ${activeWorkspaceTab === "create" ? "text-white" : "text-slate-300"}`} />
            <span className="text-[11px] leading-none tracking-tight">Drafter</span>
          </button>

          <button
            id="nav-btn-schedule"
            onClick={() => {
              setActiveWorkspaceTab("scheduled");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-xl transition-all cursor-pointer relative ${
              activeWorkspaceTab === "scheduled"
                ? "bg-[#1e293b] text-white font-bold border-2 border-slate-700 shadow-xs scale-102"
                : "text-slate-300 hover:text-white hover:bg-[#1e293b]/50 font-medium"
            }`}
          >
            <div className="relative">
              <Calendar className={`w-5 h-5 ${activeWorkspaceTab === "scheduled" ? "text-white" : "text-slate-300"}`} />
              {scheduledPosts.length > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-blue-500 text-white text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center border border-[#0f172a]">
                  {scheduledPosts.length}
                </span>
              )}
            </div>
            <span className="text-[11px] leading-none tracking-tight">Schedule</span>
          </button>

          <button
            id="nav-btn-saved-drafts"
            onClick={() => {
              setActiveWorkspaceTab("saved");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-xl transition-all cursor-pointer relative ${
              activeWorkspaceTab === "saved"
                ? "bg-[#1e293b] text-white font-bold border-2 border-slate-700 shadow-xs scale-102"
                : "text-slate-300 hover:text-white hover:bg-[#1e293b]/50 font-medium"
            }`}
          >
            <div className="relative">
              <Bookmark className={`w-5 h-5 ${activeWorkspaceTab === "saved" ? "text-white" : "text-slate-300"}`} />
              {savedDrafts.length > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-blue-500 text-white text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center border border-[#0f172a]">
                  {savedDrafts.length}
                </span>
              )}
            </div>
            <span className="text-[11px] leading-none tracking-tight">Saved Drafts</span>
          </button>

          <button
            id="nav-btn-history"
            onClick={() => {
              setActiveWorkspaceTab("history");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-xl transition-all cursor-pointer relative ${
              activeWorkspaceTab === "history"
                ? "bg-[#1e293b] text-white font-bold border-2 border-slate-700 shadow-xs scale-102"
                : "text-slate-300 hover:text-white hover:bg-[#1e293b]/50 font-medium"
            }`}
          >
            <div className="relative">
              <History className={`w-5 h-5 ${activeWorkspaceTab === "history" ? "text-white" : "text-slate-300"}`} />
              {savedLearnings.length > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-slate-700 text-slate-100 text-[9px] font-bold px-1 rounded-full border border-[#0f172a]">
                  {savedLearnings.length}
                </span>
              )}
            </div>
            <span className="text-[11px] leading-none tracking-tight">History</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
