import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Toaster } from "@/components/ui/sonner";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Bold,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  FlipHorizontal2,
  FlipVertical2,
  FolderOpen,
  Frame,
  ImagePlus,
  Italic,
  Layers,
  LayoutGrid,
  Move,
  Printer,
  RotateCcw,
  Save,
  Settings,
  SlidersHorizontal,
  Smile,
  Trash2,
  Type,
  Underline,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterType = "original" | "bw" | "sepia" | "vintage" | "fade";
type LayoutType = "4cut" | "4r" | "combo";
type DatePos = "tl" | "tr" | "bl" | "br";
type FramePreset = "clean" | "film" | "vintage";
type LogoPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "center";

interface SlotState {
  imageUrl: string | null;
  zoom: number;
  panX: number;
  panY: number;
  rotation: number;
  flipH: boolean;
  flipV: boolean;
  filter: FilterType;
  brightness: number;
  contrast: number;
  saturation: number;
  temperature: number;
  shadow: number;
  vignette: number;
  naturalW: number;
  naturalH: number;
  filmDate: boolean;
  filmDateStr: string;
}

interface TextOverlay {
  id: string;
  text: string;
  fontSize: number;
  color: string;
  fontFamily: string;
  x: number;
  y: number;
  rotation: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
}

interface StickerItem {
  id: string;
  emoji: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
}

// ─── Layout dimensions ────────────────────────────────────────────────────────
const SLOT_W_4CUT = 210;
const SLOT_H_4CUT = 210;
const SLOT_W_4R = 210;
const SLOT_H_4R = 315;
const LOGO_AREA_4R = 48; // px: top/bottom logo margin for 4R layout

// ─── Helpers ──────────────────────────────────────────────────────────────────

const defaultSlot = (): SlotState => ({
  imageUrl: null,
  zoom: 1,
  panX: 0,
  panY: 0,
  rotation: 0,
  flipH: false,
  flipV: false,
  filter: "original",
  brightness: 100,
  contrast: 100,
  saturation: 100,
  temperature: 0,
  shadow: 0,
  vignette: 0,
  naturalW: 0,
  naturalH: 0,
  filmDate: false,
  filmDateStr: new Date().toISOString().slice(0, 10).replace(/-/g, "."),
});

const getSlotCount = (layout: LayoutType) => {
  if (layout === "4cut") return 4;
  if (layout === "4r") return 2;
  return 6;
};

const getFilterCSS = (
  filter: FilterType,
  slot?: Partial<SlotState>,
): string => {
  const brightness = slot?.brightness ?? 100;
  const contrast = slot?.contrast ?? 100;
  const saturation = slot?.saturation ?? 100;
  const temperature = slot?.temperature ?? 0;
  let base = `brightness(${brightness / 100}) contrast(${contrast / 100}) saturate(${saturation / 100})`;
  if (temperature > 0) {
    base += ` sepia(${temperature * 0.005}) saturate(${1 + temperature * 0.003})`;
  } else if (temperature < 0) {
    base += ` hue-rotate(${temperature * 0.3}deg) saturate(${1 + Math.abs(temperature) * 0.002})`;
  }
  switch (filter) {
    case "bw":
      return `${base} grayscale(1)`;
    case "sepia":
      return `${base} sepia(0.85)`;
    case "vintage":
      return `${base} sepia(0.4) contrast(1.1) brightness(1.05) saturate(0.8) hue-rotate(-5deg)`;
    case "fade":
      return `${base} brightness(1.12) contrast(0.88) saturate(0.7) opacity(0.88)`;
    default:
      return base;
  }
};

const getFilterCanvasCSS = (
  filter: FilterType,
  slot?: Partial<SlotState>,
): string => {
  const brightness = slot?.brightness ?? 100;
  const contrast = slot?.contrast ?? 100;
  const saturation = slot?.saturation ?? 100;
  const temperature = slot?.temperature ?? 0;
  let base = `brightness(${brightness / 100}) contrast(${contrast / 100}) saturate(${saturation / 100})`;
  if (temperature > 0) {
    base += ` sepia(${temperature * 0.005}) saturate(${1 + temperature * 0.003})`;
  } else if (temperature < 0) {
    base += ` hue-rotate(${temperature * 0.3}deg) saturate(${1 + Math.abs(temperature) * 0.002})`;
  }
  switch (filter) {
    case "bw":
      return `${base} grayscale(1)`;
    case "sepia":
      return `${base} sepia(0.85)`;
    case "vintage":
      return `${base} sepia(0.4) contrast(1.1) brightness(1.05) saturate(0.8)`;
    case "fade":
      return `${base} brightness(1.12) contrast(0.88) saturate(0.7)`;
    default:
      return base;
  }
};

// Pastel color palettes
const PASTEL_BG_COLORS = [
  { name: "화이트", hex: "#FFFFFF" },
  { name: "아이보리", hex: "#FAF7F2" },
  { name: "블러시", hex: "#F9EEE8" },
  { name: "로즈", hex: "#F5DDD5" },
  { name: "라벤더", hex: "#EDE8F5" },
  { name: "민트", hex: "#E8F5EE" },
  { name: "스카이", hex: "#E8F0FA" },
  { name: "샌드", hex: "#F5F0E8" },
  { name: "세이지", hex: "#E8EDE5" },
  { name: "차콜", hex: "#2D2D2D" },
];

const PASTEL_BORDER_COLORS = [
  { name: "없음", hex: "transparent" },
  { name: "화이트", hex: "#FFFFFF" },
  { name: "크림", hex: "#F7F3EC" },
  { name: "블러시핑크", hex: "#F2D4CB" },
  { name: "로즈", hex: "#ECC4BA" },
  { name: "라벤더", hex: "#D9D0EF" },
  { name: "민트", hex: "#C8E8D4" },
  { name: "파우더블루", hex: "#C5D8F5" },
  { name: "토프", hex: "#D4CEC6" },
  { name: "웜그레이", hex: "#C8C4BE" },
  { name: "블랙", hex: "#1A1A1A" },
];

const STICKER_EMOJIS = [
  "❤️",
  "🩷",
  "🧡",
  "💛",
  "💚",
  "💙",
  "💜",
  "🖤",
  "🤍",
  "💕",
  "💗",
  "💓",
  "💞",
  "💝",
  "💟",
  "⭐",
  "🌸",
  "💫",
  "✨",
  "🎞",
  "📷",
  "🎀",
  "🌙",
  "💎",
  "🦋",
];

const FRAME_PRESETS: Record<
  FramePreset,
  { borderColor: string; bgColor: string; name: string }
> = {
  clean: { borderColor: "#ffffff", bgColor: "#ffffff", name: "클린" },
  film: { borderColor: "#1a1a1a", bgColor: "#111111", name: "필름" },
  vintage: { borderColor: "#e8dcc8", bgColor: "#f5edd6", name: "빈티지" },
};

const FILTERS: { id: FilterType; label: string }[] = [
  { id: "original", label: "원본" },
  { id: "bw", label: "흑백" },
  { id: "sepia", label: "세피아" },
  { id: "vintage", label: "빈티지" },
  { id: "fade", label: "페이드" },
];

interface CheckPattern {
  id: string;
  name: string;
  css: string;
}

const CHECK_PATTERNS: CheckPattern[] = [
  {
    id: "bw-small",
    name: "흑백 체크",
    css: "repeating-conic-gradient(#222 0% 25%, #fff 0% 50%) 0 0 / 16px 16px",
  },
  {
    id: "pink-white",
    name: "핑크 체크",
    css: "repeating-conic-gradient(#f9c4d2 0% 25%, #fff0f4 0% 50%) 0 0 / 16px 16px",
  },
  {
    id: "blue-white",
    name: "블루 체크",
    css: "repeating-conic-gradient(#bfdbfe 0% 25%, #eff6ff 0% 50%) 0 0 / 16px 16px",
  },
  {
    id: "bw-large",
    name: "버팔로 체크",
    css: "repeating-conic-gradient(#1a1a1a 0% 25%, #ffffff 0% 50%) 0 0 / 40px 40px",
  },
  {
    id: "polka-dot",
    name: "땡땡이",
    css: "radial-gradient(circle, #f472b6 30%, transparent 30%) 0 0 / 28px 28px, radial-gradient(circle, #f472b6 30%, transparent 30%) 14px 14px / 28px 28px #fdf2f8",
  },
  {
    id: "gingham",
    name: "깅엄 체크",
    css: "repeating-linear-gradient(0deg, rgba(74,222,128,0.5) 0, rgba(74,222,128,0.5) 12px, transparent 12px, transparent 24px), repeating-linear-gradient(90deg, rgba(74,222,128,0.5) 0, rgba(74,222,128,0.5) 12px, transparent 12px, transparent 24px) 0 0/24px 24px #f0fdf4",
  },
  {
    id: "tartan-red",
    name: "레드 타탄",
    css: "repeating-linear-gradient(0deg, rgba(255,255,255,0.65) 0 8px, transparent 8px 20px, rgba(240,180,190,0.6) 20px 26px, transparent 26px 34px, rgba(255,255,255,0.35) 34px 38px, transparent 38px 46px, rgba(180,50,70,0.45) 46px 54px, transparent 54px 70px, rgba(255,255,255,0.65) 70px 78px, transparent 78px 96px), repeating-linear-gradient(90deg, rgba(255,255,255,0.65) 0 8px, transparent 8px 20px, rgba(240,180,190,0.6) 20px 26px, transparent 26px 34px, rgba(255,255,255,0.35) 34px 38px, transparent 38px 46px, rgba(180,50,70,0.45) 46px 54px, transparent 54px 70px, rgba(255,255,255,0.65) 70px 78px, transparent 78px 96px) 0 0/96px 96px #D4697A",
  },
  {
    id: "tartan-green",
    name: "그린 타탄",
    css: "repeating-linear-gradient(0deg, rgba(255,255,255,0.6) 0 8px, transparent 8px 20px, rgba(200,235,210,0.55) 20px 26px, transparent 26px 34px, rgba(255,255,255,0.3) 34px 38px, transparent 38px 46px, rgba(50,100,60,0.4) 46px 54px, transparent 54px 70px, rgba(255,255,255,0.6) 70px 78px, transparent 78px 96px), repeating-linear-gradient(90deg, rgba(255,255,255,0.6) 0 8px, transparent 8px 20px, rgba(200,235,210,0.55) 20px 26px, transparent 26px 34px, rgba(255,255,255,0.3) 34px 38px, transparent 38px 46px, rgba(50,100,60,0.4) 46px 54px, transparent 54px 70px, rgba(255,255,255,0.6) 70px 78px, transparent 78px 96px) 0 0/96px 96px #7AAE88",
  },
  {
    id: "tartan-navy",
    name: "네이비 타탄",
    css: "repeating-linear-gradient(0deg, rgba(255,255,255,0.6) 0 8px, transparent 8px 20px, rgba(200,220,255,0.5) 20px 26px, transparent 26px 32px, rgba(255,200,200,0.45) 32px 35px, transparent 35px 42px, rgba(50,70,140,0.4) 42px 50px, transparent 50px 66px, rgba(255,255,255,0.6) 66px 74px, transparent 74px 96px), repeating-linear-gradient(90deg, rgba(255,255,255,0.6) 0 8px, transparent 8px 20px, rgba(200,220,255,0.5) 20px 26px, transparent 26px 32px, rgba(255,200,200,0.45) 32px 35px, transparent 35px 42px, rgba(50,70,140,0.4) 42px 50px, transparent 50px 66px, rgba(255,255,255,0.6) 66px 74px, transparent 74px 96px) 0 0/96px 96px #7A8EC4",
  },
];

const TODAY = new Date();
const DATE_STR = `${TODAY.getFullYear()}.${String(TODAY.getMonth() + 1).padStart(2, "0")}.${String(TODAY.getDate()).padStart(2, "0")}`;

const LOGO_POSITION_KEYS: Record<LogoPosition, string> = {
  "top-left": "posTopLeft",
  "top-right": "posTopRight",
  "bottom-left": "posBotLeft",
  "bottom-right": "posBotRight",
  center: "posCenter",
};

const getLogoStyle = (
  pos: LogoPosition,
  color: string,
): React.CSSProperties => {
  const base: React.CSSProperties = {
    position: "absolute",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: "0.25em",
    pointerEvents: "none",
    zIndex: 5,
    whiteSpace: "nowrap",
    color,
  };
  switch (pos) {
    case "top-left":
      return { ...base, top: 8, left: 8 };
    case "top-right":
      return { ...base, top: 8, right: 8 };
    case "bottom-left":
      return { ...base, bottom: 8, left: 8 };
    case "center":
      return {
        ...base,
        top: "50%",
        left: "50%",
        transform: "translate(-50%,-50%)",
      };
    default:
      return { ...base, bottom: 8, right: 8 };
  }
};

// ─── Translations ─────────────────────────────────────────────────────────────

type Language = "en" | "ko";

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Header
    print: "Print",
    saveImage: "Save",
    loadProject: "Load",
    saveProject: "Save Project",
    // Layout names
    layout4cut: "4-Cut",
    layout4r: "4R",
    layoutCombo: "4-Cut + 4R Combo",
    layoutShort4cut: "4-Cut",
    layoutShort4r: "4R",
    layoutShortCombo: "Combo",
    // Panel tabs
    tabEdit: "Edit",
    tabOverlay: "Overlay",
    tabFrame: "Frame",
    // Sidebar labels
    sidebarHide: "Hide panel",
    sidebarShow: "Show panel",
    // Edit tab
    selectSlot: "Select a slot",
    clickSlot: "Click a photo slot on canvas",
    tapSlot: "Tap a photo slot on canvas",
    slot: "Slot",
    addPhoto: "Add Photo",
    zoom: "Zoom",
    rotate: "Rotate",
    reset: "Reset",
    flip: "Flip",
    flipH: "Horizontal",
    flipV: "Vertical",
    filter: "Filter",
    adjust: "Adjustments",
    brightness: "Bright.",
    contrast: "Contrast",
    saturation: "Saturati.",
    temperature: "Temp.",
    shadow: "Shadow",
    vignette: "Vignette",
    // Filter labels
    filterOriginal: "Original",
    filterBW: "B&W",
    filterSepia: "Sepia",
    filterVintage: "Vintage",
    filterFade: "Fade",
    // Overlay tab
    dateStamp: "Date Stamp",
    position: "Position",
    positionTL: "Top-L",
    positionTR: "Top-R",
    positionBL: "Bot-L",
    positionBR: "Bot-R",
    text: "Text",
    textPlaceholder: "Enter text...",
    style: "Style",
    font: "Font",
    size: "Size (px)",
    color: "Color",
    addText: "Add Text",
    sticker: "Stickers",
    dragHint: "Drag to move, corner handle to resize/rotate",
    // Frame tab
    stylePreset: "Style Preset",
    borderColor: "Border Color",
    margin: "Margin",
    bgColor: "Background Color",
    bgPattern: "Background Pattern",
    noPattern: "None",
    logoLabel: "SONA STUDIO Logo",
    logoPosition: "Position",
    logoColor: "Color",
    // Logo positions
    posTopLeft: "Top Left",
    posTopRight: "Top Right",
    posBotLeft: "Bot Left",
    posBotRight: "Bot Right",
    posCenter: "Center",
    // Presets
    presetClean: "Clean",
    presetFilm: "Film",
    presetVintage: "Vintage",
    // Mobile tabs
    mobileLayout: "Layout",
    mobileEdit: "Photo Edit",
    mobileText: "Text",
    mobileSticker: "Sticker",
    mobileFrame: "Frame",
    // Mobile drawer titles
    drawerLayout: "Select Layout",
    // Toast messages
    toastProjectSaved: "Project saved",
    toastProjectLoaded: "Project loaded",
    toastProjectError: "Cannot read project file",
    toastSaving: "Generating image...",
    toastSaved: "Saved! (High quality 300DPI)",
    toastSaveError: "Save failed.",
    // Language toggle
    langToggle: "KO",
    // Film date stamp
    filmDateLabel: "Film Date Stamp",
    filmDateEnabled: "Enable",
    filmDateStr: "Date Text",
    // Layout change dialog
    layoutChangeTitle: "Change Layout",
    layoutChangeDesc: "Switching layouts will reset the current layout.",
    layoutChangeSave: "Save & Switch",
    layoutChangeDontSave: "Don't Save",
    layoutChangeCancel: "Cancel",
  },
  ko: {
    // Header
    print: "인쇄",
    saveImage: "저장",
    loadProject: "불러오기",
    saveProject: "프로젝트 저장",
    // Layout names
    layout4cut: "4컷",
    layout4r: "4R",
    layoutCombo: "4컷+4R 콤보",
    layoutShort4cut: "4컷",
    layoutShort4r: "4R",
    layoutShortCombo: "콤보",
    // Panel tabs
    tabEdit: "편집",
    tabOverlay: "오버레이",
    tabFrame: "프레임",
    // Sidebar labels
    sidebarHide: "패널 숨기기",
    sidebarShow: "패널 보기",
    // Edit tab
    selectSlot: "슬롯을 선택하세요",
    clickSlot: "캔버스에서 사진 슬롯을 클릭",
    tapSlot: "캔버스에서 사진 슬롯을 탭",
    slot: "슬롯",
    addPhoto: "사진 추가",
    zoom: "줌",
    rotate: "회전",
    reset: "초기화",
    flip: "반전",
    flipH: "좌우",
    flipV: "상하",
    filter: "필터",
    adjust: "조정",
    brightness: "밝기",
    contrast: "대조",
    saturation: "채도",
    temperature: "색온도",
    shadow: "쉐도우",
    vignette: "비네팅",
    // Filter labels
    filterOriginal: "원본",
    filterBW: "흑백",
    filterSepia: "세피아",
    filterVintage: "빈티지",
    filterFade: "페이드",
    // Overlay tab
    dateStamp: "날짜 스탬프",
    position: "위치",
    positionTL: "좌상",
    positionTR: "우상",
    positionBL: "좌하",
    positionBR: "우하",
    text: "텍스트",
    textPlaceholder: "텍스트 입력...",
    style: "스타일",
    font: "폰트",
    size: "크기 (px)",
    color: "색상",
    addText: "텍스트 추가",
    sticker: "스티커",
    dragHint: "드래그로 이동, 모서리 핸들로 크기/회전 조정",
    // Frame tab
    stylePreset: "스타일 프리셋",
    borderColor: "테두리 색상",
    margin: "여백",
    bgColor: "배경 색상",
    bgPattern: "배경 패턴",
    noPattern: "없음",
    logoLabel: "SONA STUDIO 로고",
    logoPosition: "위치",
    logoColor: "색상",
    // Logo positions
    posTopLeft: "좌상단",
    posTopRight: "우상단",
    posBotLeft: "좌하단",
    posBotRight: "우하단",
    posCenter: "가운데",
    // Presets
    presetClean: "클린",
    presetFilm: "필름",
    presetVintage: "빈티지",
    // Mobile tabs
    mobileLayout: "레이아웃",
    mobileEdit: "사진편집",
    mobileText: "텍스트",
    mobileSticker: "스티커",
    mobileFrame: "프레임",
    // Mobile drawer titles
    drawerLayout: "레이아웃 선택",
    // Toast messages
    toastProjectSaved: "프로젝트가 저장되었습니다",
    toastProjectLoaded: "프로젝트를 불러왔습니다",
    toastProjectError: "프로젝트 파일을 읽을 수 없습니다",
    toastSaving: "이미지 생성 중...",
    toastSaved: "고화질 저장 완료! (300DPI급)",
    toastSaveError: "저장에 실패했습니다.",
    // Language toggle
    langToggle: "EN",
    // Film date stamp
    filmDateLabel: "필름 날짜 스탬프",
    filmDateEnabled: "활성화",
    filmDateStr: "날짜 텍스트",
    // Layout change dialog
    layoutChangeTitle: "레이아웃 변경",
    layoutChangeDesc: "레이아웃을 변경하면 현재 작업이 초기화됩니다.",
    layoutChangeSave: "저장 후 변경",
    layoutChangeDontSave: "저장 안함",
    layoutChangeCancel: "취소",
  },
};

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [layout, setLayout] = useState<LayoutType>("4cut");
  const [slots, setSlots] = useState<SlotState[]>(() =>
    Array.from({ length: 4 }, defaultSlot),
  );
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [swapSlot, setSwapSlot] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState<string>("");
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [language, setLanguage] = useState<Language>("en");
  const t = (key: string): string => translations[language][key] ?? key;

  // Frame
  const [borderColor, setBorderColor] = useState("#ffffff");
  const [borderWidth, setBorderWidth] = useState(8);
  const [bgColor, setBgColor] = useState("#ffffff");
  const [bgPattern, setBgPattern] = useState<string | null>(null);
  const [framePreset, setFramePreset] = useState<FramePreset>("clean");

  // Logo
  const [logoEnabled, setLogoEnabled] = useState(true);
  const [logoPosition, setLogoPosition] =
    useState<LogoPosition>("bottom-right");
  const [logoColor, setLogoColor] = useState("#888888");

  // Overlay: date
  const [dateEnabled, setDateEnabled] = useState(false);
  const [datePos, setDatePos] = useState<DatePos>("br");

  // Overlay: text
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [newText, setNewText] = useState("");
  const [newTextSize, setNewTextSize] = useState(18);
  const [newTextColor, setNewTextColor] = useState("#ffffff");
  const [newTextBold, setNewTextBold] = useState(false);
  const [newTextItalic, setNewTextItalic] = useState(false);
  const [newTextUnderline, setNewTextUnderline] = useState(false);
  const [newTextFont, setNewTextFont] = useState("sans-serif");

  // Overlay: stickers
  const [stickers, setStickers] = useState<StickerItem[]>([]);

  const compositionRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingSlotRef = useRef<number | null>(null);

  // ── Layout change dialog
  const [pendingLayout, setPendingLayout] = useState<LayoutType | null>(null);
  const [layoutSaveDialogOpen, setLayoutSaveDialogOpen] = useState(false);

  // ── Save name dialog
  const [saveNameDialogOpen, setSaveNameDialogOpen] = useState(false);
  const [saveNameInput, setSaveNameInput] = useState("sona-studio-project");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsPhotoPrefix, setSettingsPhotoPrefix] = useState("sona-studio");
  const [settingsProjectPrefix, setSettingsProjectPrefix] = useState(
    "sona-studio-project",
  );
  const [settingsIncludePhotos, setSettingsIncludePhotos] = useState(false);
  const [saveDirHandle, setSaveDirHandle] =
    useState<FileSystemDirectoryHandle | null>(null);

  // ── Layout change
  const handleLayoutChange = useCallback(
    (l: LayoutType) => {
      const hasPhotos = slots.some((s) => s.imageUrl !== null);
      if (hasPhotos) {
        setPendingLayout(l);
        setLayoutSaveDialogOpen(true);
      } else {
        setLayout(l);
        const count = getSlotCount(l);
        setSlots(Array.from({ length: count }, defaultSlot));
        setSelectedSlot(null);
      }
    },
    [slots],
  );

  const applyLayoutSwitch = useCallback((l: LayoutType) => {
    setLayout(l);
    const count = getSlotCount(l);
    setSlots(Array.from({ length: count }, defaultSlot));
    setSelectedSlot(null);
    setPendingLayout(null);
    setLayoutSaveDialogOpen(false);
  }, []);

  // ── Slot update
  const updateSlot = useCallback((idx: number, patch: Partial<SlotState>) => {
    setSlots((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    );
  }, []);

  // ── Text overlay update
  const updateTextOverlay = useCallback(
    (id: string, patch: Partial<TextOverlay>) => {
      setTextOverlays((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      );
    },
    [],
  );

  // ── Sticker update
  const updateSticker = useCallback(
    (id: string, patch: Partial<StickerItem>) => {
      setStickers((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      );
    },
    [],
  );

  const sel = selectedSlot !== null ? slots[selectedSlot] : null;

  // ── Upload
  const openUpload = (idx: number) => {
    pendingSlotRef.current = idx;
    fileInputRef.current?.click();
  };

  const readExifDate = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const fallback = (() => {
        const d = new Date(file.lastModified);
        return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
      })();
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const buf = e.target?.result as ArrayBuffer;
          const view = new DataView(buf);
          if (view.getUint16(0) !== 0xffd8) {
            resolve(fallback);
            return;
          }
          let offset = 2;
          while (offset < buf.byteLength - 1) {
            const marker = view.getUint16(offset);
            offset += 2;
            if (marker === 0xffe1) {
              const segLen = view.getUint16(offset);
              const exifStart = offset + 2;
              if (
                view.getUint32(exifStart) === 0x45786966 &&
                view.getUint16(exifStart + 4) === 0x0000
              ) {
                const tiffStart = exifStart + 6;
                const littleEndian = view.getUint16(tiffStart) === 0x4949;
                const getU16 = (o: number) =>
                  littleEndian
                    ? view.getUint16(tiffStart + o, true)
                    : view.getUint16(tiffStart + o, false);
                const getU32 = (o: number) =>
                  littleEndian
                    ? view.getUint32(tiffStart + o, true)
                    : view.getUint32(tiffStart + o, false);
                const ifd0Offset = getU32(4);
                const entryCount = getU16(ifd0Offset);
                let exifIfdOffset = -1;
                for (let i = 0; i < entryCount; i++) {
                  const entryOffset = ifd0Offset + 2 + i * 12;
                  const tag = getU16(entryOffset);
                  if (tag === 0x8769) {
                    exifIfdOffset = getU32(entryOffset + 8);
                    break;
                  }
                }
                if (exifIfdOffset !== -1) {
                  const subCount = getU16(exifIfdOffset);
                  for (let i = 0; i < subCount; i++) {
                    const entryOffset = exifIfdOffset + 2 + i * 12;
                    const tag = getU16(entryOffset);
                    if (tag === 0x9003 || tag === 0x0132) {
                      const valueOffset = getU32(entryOffset + 8);
                      let str = "";
                      for (let c = 0; c < 19; c++) {
                        const ch = view.getUint8(tiffStart + valueOffset + c);
                        if (ch === 0) break;
                        str += String.fromCharCode(ch);
                      }
                      const m = str.match(/^(\d{4}):(\d{2}):(\d{2})/);
                      if (m) {
                        resolve(`${m[1]}.${m[2]}.${m[3]}`);
                        return;
                      }
                    }
                  }
                }
              }
              offset += segLen;
              continue;
            }
            if (marker === 0xffda) break;
            if ((marker & 0xff00) !== 0xff00) break;
            offset += view.getUint16(offset);
          }
        } catch (_) {}
        resolve(fallback);
      };
      reader.onerror = () => resolve(fallback);
      reader.readAsArrayBuffer(file.slice(0, 65536));
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || pendingSlotRef.current === null) return;
    const url = URL.createObjectURL(file);
    const idx = pendingSlotRef.current;
    const exifDate = await readExifDate(file);
    const img = new Image();
    img.onload = () => {
      updateSlot(idx, {
        imageUrl: url,
        panX: 0,
        panY: 0,
        zoom: 1,
        rotation: 0,
        naturalW: img.naturalWidth,
        naturalH: img.naturalHeight,
        filmDateStr: exifDate,
      });
      setSelectedSlot(idx);
    };
    img.src = url;
    e.target.value = "";
  };

  // ── Frame preset
  const applyPreset = (p: FramePreset) => {
    setFramePreset(p);
    setBorderColor(FRAME_PRESETS[p].borderColor);
    setBgColor(FRAME_PRESETS[p].bgColor);
    setBgPattern(null);
  };

  // ── Add text
  const addText = () => {
    if (!newText.trim()) return;
    setTextOverlays((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        text: newText.trim(),
        fontSize: newTextSize,
        color: newTextColor,
        fontFamily: newTextFont,
        x: 10,
        y: 10,
        rotation: 0,
        bold: newTextBold,
        italic: newTextItalic,
        underline: newTextUnderline,
      },
    ]);
    setNewText("");
  };

  // ── Add sticker
  const addSticker = (emoji: string) => {
    setStickers((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        emoji,
        x: 30 + Math.random() * 40,
        y: 30 + Math.random() * 40,
        size: 32,
        rotation: 0,
      },
    ]);
  };

  // ── Project save/load
  const projectLoadRef = useRef<HTMLInputElement>(null);

  const confirmProjectSave = async (customName?: string) => {
    const name = customName ?? saveNameInput ?? settingsProjectPrefix;

    const processedSlots = await Promise.all(
      slots.map(async (s) => {
        if (settingsIncludePhotos && s.imageUrl) {
          try {
            const resp = await fetch(s.imageUrl);
            const blobData = await resp.blob();
            const b64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.readAsDataURL(blobData);
            });
            return { ...s, imageUrl: b64 };
          } catch {
            return { ...s, imageUrl: null };
          }
        }
        return { ...s, imageUrl: null };
      }),
    );

    const projectData = {
      layout,
      borderColor,
      bgColor,
      bgPattern,
      borderWidth,
      framePreset,
      dateEnabled,
      datePos,
      textOverlays,
      stickers,
      logoEnabled,
      logoPosition,
      logoColor,
      slots: processedSlots,
    };
    const blob = new Blob([JSON.stringify(projectData, null, 2)], {
      type: "application/json",
    });

    if (saveDirHandle) {
      try {
        const fileHandle = await saveDirHandle.getFileHandle(`${name}.json`, {
          create: true,
        });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        setSaveNameDialogOpen(false);
        toast.success(t("toastProjectSaved"));
        return;
      } catch (e: any) {
        if (e.name !== "AbortError") {
          // fall through to default download
        } else {
          return;
        }
      }
    }
    // default: anchor download
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setSaveNameDialogOpen(false);
    toast.success(t("toastProjectSaved"));
  };

  const handleProjectSave = () => {
    setSaveNameInput(settingsProjectPrefix);
    setSaveNameDialogOpen(true);
  };

  const handleProjectLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (data.layout) setLayout(data.layout);
        if (data.slots)
          setSlots(
            data.slots.map((s: SlotState) => ({
              ...defaultSlot(),
              ...s,
              imageUrl: s.imageUrl?.startsWith("data:") ? s.imageUrl : null,
            })),
          );
        if (data.borderColor) setBorderColor(data.borderColor);
        if (data.bgColor) setBgColor(data.bgColor);
        if (data.bgPattern !== undefined) setBgPattern(data.bgPattern);
        if (data.borderWidth) setBorderWidth(data.borderWidth);
        if (data.framePreset) setFramePreset(data.framePreset);
        if (data.dateEnabled !== undefined) setDateEnabled(data.dateEnabled);
        if (data.datePos) setDatePos(data.datePos);
        if (data.textOverlays) setTextOverlays(data.textOverlays);
        if (data.stickers) setStickers(data.stickers);
        if (data.logoEnabled !== undefined) setLogoEnabled(data.logoEnabled);
        if (data.logoPosition) setLogoPosition(data.logoPosition);
        if (data.logoColor) setLogoColor(data.logoColor);
        toast.success(t("toastProjectLoaded"));
      } catch {
        toast.error(t("toastProjectError"));
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ── Export canvas
  const handleExport = () => {
    // 1. Clear slot selection state
    setSwapSlot(null);
    setSelectedSlot(null);
    // 2. Blur any focused element (e.g. a photo slot button in WebView)
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    // 3. Focus the composition frame itself so the whole frame is the active target
    if (compositionRef.current) {
      compositionRef.current.focus();
    }
    // 4. Use setTimeout (150ms) for reliable re-render in WebView/APK environments
    setTimeout(() => {
      runExport();
    }, 150);
  };

  const runExport = async () => {
    const comp = compositionRef.current;
    if (!comp) return;
    const toastId = toast.loading(t("toastSaving"));
    try {
      const compRect = comp.getBoundingClientRect();
      const scale = Math.max(3, 2480 / compRect.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(compRect.width * scale);
      canvas.height = Math.round(compRect.height * scale);
      const ctx = canvas.getContext("2d", { alpha: false })!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.scale(scale, scale);

      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, compRect.width, compRect.height);

      // Draw pattern if active
      if (bgPattern) {
        const W = compRect.width;
        const H = compRect.height;
        const activePattern = CHECK_PATTERNS.find((p) => p.css === bgPattern);
        if (activePattern) {
          if (activePattern.id === "bw-small") {
            const sz = 16;
            for (let y = 0; y < H; y += sz) {
              for (let x = 0; x < W; x += sz) {
                ctx.fillStyle =
                  Math.floor(x / sz + y / sz) % 2 === 0 ? "#222" : "#fff";
                ctx.fillRect(x, y, sz, sz);
              }
            }
          } else if (activePattern.id === "pink-white") {
            const sz = 16;
            for (let y = 0; y < H; y += sz) {
              for (let x = 0; x < W; x += sz) {
                ctx.fillStyle =
                  Math.floor(x / sz + y / sz) % 2 === 0 ? "#f9c4d2" : "#fff0f4";
                ctx.fillRect(x, y, sz, sz);
              }
            }
          } else if (activePattern.id === "blue-white") {
            const sz = 16;
            for (let y = 0; y < H; y += sz) {
              for (let x = 0; x < W; x += sz) {
                ctx.fillStyle =
                  Math.floor(x / sz + y / sz) % 2 === 0 ? "#bfdbfe" : "#eff6ff";
                ctx.fillRect(x, y, sz, sz);
              }
            }
          } else if (activePattern.id === "bw-large") {
            const sz = 40;
            for (let y = 0; y < H; y += sz) {
              for (let x = 0; x < W; x += sz) {
                ctx.fillStyle =
                  Math.floor(x / sz + y / sz) % 2 === 0 ? "#1a1a1a" : "#ffffff";
                ctx.fillRect(x, y, sz, sz);
              }
            }
          } else if (activePattern.id === "polka-dot") {
            ctx.fillStyle = "#fdf2f8";
            ctx.fillRect(0, 0, W, H);
            const dotSize = 28;
            const dotR = dotSize * 0.3;
            ctx.fillStyle = "#f472b6";
            for (let row = 0; row * dotSize < H + dotSize; row++) {
              for (let col = 0; col * dotSize < W + dotSize; col++) {
                const offX = row % 2 === 1 ? dotSize / 2 : 0;
                const cx2 = col * dotSize + offX;
                const cy2 = row * dotSize;
                ctx.beginPath();
                ctx.arc(cx2, cy2, dotR, 0, Math.PI * 2);
                ctx.fill();
              }
            }
          } else if (activePattern.id === "gingham") {
            ctx.fillStyle = "#f0fdf4";
            ctx.fillRect(0, 0, W, H);
            const sz2 = 12;
            ctx.fillStyle = "rgba(74,222,128,0.5)";
            for (let y = 0; y < H; y += sz2 * 2) {
              ctx.fillRect(0, y, W, sz2);
            }
            for (let x = 0; x < W; x += sz2 * 2) {
              ctx.fillRect(x, 0, sz2, H);
            }
          } else if (
            activePattern.id === "tartan-red" ||
            activePattern.id === "tartan-green" ||
            activePattern.id === "tartan-navy"
          ) {
            type TartanStripe = { color: string; w: number };
            const tartanSetts: Record<
              string,
              { bg: string; stripes: TartanStripe[] }
            > = {
              "tartan-red": {
                bg: "#D4697A",
                stripes: [
                  { color: "rgba(255,255,255,0.65)", w: 8 },
                  { color: "transparent", w: 12 },
                  { color: "rgba(240,180,190,0.6)", w: 6 },
                  { color: "transparent", w: 8 },
                  { color: "rgba(255,255,255,0.35)", w: 4 },
                  { color: "transparent", w: 8 },
                  { color: "rgba(180,50,70,0.45)", w: 8 },
                  { color: "transparent", w: 16 },
                  { color: "rgba(255,255,255,0.65)", w: 8 },
                  { color: "transparent", w: 18 },
                ],
              },
              "tartan-green": {
                bg: "#7AAE88",
                stripes: [
                  { color: "rgba(255,255,255,0.6)", w: 8 },
                  { color: "transparent", w: 12 },
                  { color: "rgba(200,235,210,0.55)", w: 6 },
                  { color: "transparent", w: 8 },
                  { color: "rgba(255,255,255,0.3)", w: 4 },
                  { color: "transparent", w: 8 },
                  { color: "rgba(50,100,60,0.4)", w: 8 },
                  { color: "transparent", w: 16 },
                  { color: "rgba(255,255,255,0.6)", w: 8 },
                  { color: "transparent", w: 18 },
                ],
              },
              "tartan-navy": {
                bg: "#7A8EC4",
                stripes: [
                  { color: "rgba(255,255,255,0.6)", w: 8 },
                  { color: "transparent", w: 12 },
                  { color: "rgba(200,220,255,0.5)", w: 6 },
                  { color: "transparent", w: 6 },
                  { color: "rgba(255,200,200,0.45)", w: 3 },
                  { color: "transparent", w: 7 },
                  { color: "rgba(50,70,140,0.4)", w: 8 },
                  { color: "transparent", w: 16 },
                  { color: "rgba(255,255,255,0.6)", w: 8 },
                  { color: "transparent", w: 22 },
                ],
              },
            };
            const ts = tartanSetts[activePattern.id];
            ctx.fillStyle = ts.bg;
            ctx.fillRect(0, 0, W, H);
            const unit = ts.stripes.reduce((a, s) => a + s.w, 0);
            // Horizontal stripes
            for (let y = 0; y < H + unit; y += unit) {
              let off = 0;
              for (const stripe of ts.stripes) {
                if (stripe.color !== "transparent") {
                  ctx.fillStyle = stripe.color;
                  ctx.fillRect(0, y + off, W, stripe.w);
                }
                off += stripe.w;
              }
            }
            // Vertical stripes (woven overlay)
            ctx.globalAlpha = 0.65;
            for (let x = 0; x < W + unit; x += unit) {
              let off = 0;
              for (const stripe of ts.stripes) {
                if (stripe.color !== "transparent") {
                  ctx.fillStyle = stripe.color;
                  ctx.fillRect(x + off, 0, stripe.w, H);
                }
                off += stripe.w;
              }
            }
            ctx.globalAlpha = 1.0;
          }
        }
      }

      const slotEls = comp.querySelectorAll<HTMLElement>("[data-slot-index]");
      const drawPromises: Promise<void>[] = [];

      for (const el of slotEls) {
        const idx = Number.parseInt(el.getAttribute("data-slot-index") ?? "0");
        const slot = slots[idx];
        const r = el.getBoundingClientRect();
        const x = r.left - compRect.left;
        const y = r.top - compRect.top;
        const w = r.width;
        const h = r.height;

        if (!slot?.imageUrl) {
          ctx.fillStyle = "#d0d0d0";
          ctx.fillRect(x, y, w, h);
          continue;
        }

        const p = new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            ctx.save();
            ctx.beginPath();
            ctx.rect(x, y, w, h);
            ctx.clip();

            const imgAr = img.naturalWidth / img.naturalHeight;
            const slotAr = w / h;
            const visualZoom = slot.zoom * 1.1;
            const coverScale =
              imgAr > slotAr ? h / img.naturalHeight : w / img.naturalWidth;
            const drawW = img.naturalWidth * coverScale * visualZoom;
            const drawH = img.naturalHeight * coverScale * visualZoom;

            const cx = x + w / 2 + slot.panX;
            const cy = y + h / 2 + slot.panY;
            ctx.translate(cx, cy);
            ctx.scale(slot.flipH ? -1 : 1, slot.flipV ? -1 : 1);
            ctx.rotate((slot.rotation * Math.PI) / 180);

            const f = getFilterCanvasCSS(slot.filter, slot);
            if (f !== "none") ctx.filter = f;
            ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
            ctx.filter = "none";
            ctx.restore();

            // Film date stamp overlay
            if (slot.filmDate && slot.filmDateStr) {
              ctx.save();
              const dateText = slot.filmDateStr;
              const dateFontSize = Math.max(8, h * 0.038);
              ctx.font = `italic bold ${dateFontSize}px "Courier New", monospace`;
              const dtw = ctx.measureText(dateText).width;
              const padX = 6;
              const padY = 5;
              const dateX = x + w - dtw - padX * 2;
              const dateY = y + h - padY * 2;
              ctx.shadowColor = "transparent";
              ctx.shadowBlur = 0;
              ctx.fillStyle = "rgba(253,232,200,0.85)";
              ctx.fillText(dateText, dateX, dateY);
              ctx.restore();
            }

            resolve();
          };
          img.onerror = () => resolve();
          img.src = slot.imageUrl!;
        });
        drawPromises.push(p);
      }

      await Promise.all(drawPromises);

      // Date stamp
      if (dateEnabled) {
        ctx.save();
        ctx.font = "italic 600 13px serif";
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.shadowColor = "rgba(0,0,0,0.7)";
        ctx.shadowBlur = 4;
        const tw = ctx.measureText(DATE_STR).width;
        const pad = 14;
        const tx =
          datePos === "tr" || datePos === "br"
            ? compRect.width - tw - pad
            : pad;
        const ty =
          datePos === "bl" || datePos === "br"
            ? compRect.height - 26
            : pad + 13;
        ctx.fillText(DATE_STR, tx, ty);
        ctx.restore();
      }

      // Text overlays
      for (const t of textOverlays) {
        ctx.save();
        const weight = t.bold ? "bold" : "600";
        const style = t.italic ? "italic" : "";
        ctx.font = `${style} ${weight} ${t.fontSize}px sans-serif`.trim();
        ctx.fillStyle = t.color;
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 4;
        const tx = (t.x / 100) * compRect.width;
        const ty = (t.y / 100) * compRect.height;
        ctx.translate(tx, ty);
        if (t.rotation) ctx.rotate((t.rotation * Math.PI) / 180);
        ctx.fillText(t.text, 0, t.fontSize);
        if (t.underline) {
          const tw2 = ctx.measureText(t.text).width;
          ctx.beginPath();
          ctx.moveTo(0, t.fontSize + 2);
          ctx.lineTo(tw2, t.fontSize + 2);
          ctx.strokeStyle = t.color;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        ctx.restore();
      }

      // Stickers
      for (const s of stickers) {
        ctx.save();
        ctx.font = `${s.size}px serif`;
        const sx = (s.x / 100) * compRect.width;
        const sy = (s.y / 100) * compRect.height;
        ctx.translate(sx, sy);
        if (s.rotation) ctx.rotate((s.rotation * Math.PI) / 180);
        ctx.fillText(s.emoji, -s.size / 2, s.size / 2);
        ctx.restore();
      }

      // Logo
      if (logoEnabled) {
        ctx.save();
        const logoText = "SONA STUDIO";
        if (layout === "4r" || layout === "combo") {
          ctx.font = "700 11px 'Plus Jakarta Sans', sans-serif";
          ctx.fillStyle = logoColor;
          const lw = ctx.measureText(logoText).width;
          if (layout === "4r") {
            const logoFontSize = 11;
            // Top logo area center
            ctx.fillText(
              logoText,
              (compRect.width - lw) / 2,
              LOGO_AREA_4R / 2 + logoFontSize / 2,
            );
            // Bottom logo area center
            const bottomLogoY =
              LOGO_AREA_4R +
              borderWidth +
              SLOT_H_4R +
              borderWidth +
              SLOT_H_4R +
              borderWidth +
              LOGO_AREA_4R / 2 +
              logoFontSize / 2;
            ctx.fillText(logoText, (compRect.width - lw) / 2, bottomLogoY);
          } else {
            // combo: bottom logo area
            const comboW = SLOT_W_4R * 2 + borderWidth * 3;
            const smallW = Math.floor((comboW - borderWidth * 5) / 4);
            const smallH = Math.floor(smallW * 1.4);
            const logoFontSize = 11;
            const bottomLogoY =
              borderWidth +
              SLOT_H_4R +
              borderWidth * 2 +
              smallH +
              borderWidth +
              LOGO_AREA_4R / 2 +
              logoFontSize / 2;
            ctx.fillText(logoText, (compRect.width - lw) / 2, bottomLogoY);
          }
        } else {
          // 4cut: use logoPosition
          ctx.font = "700 9px sans-serif";
          ctx.fillStyle = logoColor;
          const lw = ctx.measureText(logoText).width;
          const pad2 = 8;
          let lx = 0;
          let ly = 0;
          switch (logoPosition) {
            case "top-left":
              lx = pad2;
              ly = 12 + pad2;
              break;
            case "top-right":
              lx = compRect.width - lw - pad2;
              ly = 12 + pad2;
              break;
            case "bottom-left":
              lx = pad2;
              ly = compRect.height - pad2;
              break;
            case "center":
              lx = (compRect.width - lw) / 2;
              ly = compRect.height / 2;
              break;
            default:
              lx = compRect.width - lw - pad2;
              ly = compRect.height - pad2;
              break;
          }
          ctx.fillText(logoText, lx, ly);
        }
        ctx.restore();
      }

      // Cutting guides
      if (layout === "4r") {
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = "rgba(60,60,60,0.45)";
        ctx.lineWidth = 1.5 / scale;
        const guideW = SLOT_W_4R + borderWidth * 2;
        const guides = [
          LOGO_AREA_4R + borderWidth / 2,
          LOGO_AREA_4R + borderWidth + SLOT_H_4R + borderWidth / 2,
          LOGO_AREA_4R +
            borderWidth +
            SLOT_H_4R +
            borderWidth +
            SLOT_H_4R +
            borderWidth / 2,
        ];
        for (const gy of guides) {
          ctx.beginPath();
          ctx.moveTo(0, gy);
          ctx.lineTo(guideW, gy);
          ctx.stroke();
        }
        ctx.restore();
      } else if (layout === "combo") {
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = "rgba(60,60,60,0.45)";
        ctx.lineWidth = 1.5 / scale;
        const comboW = SLOT_W_4R * 2 + borderWidth * 3;
        const smallW = Math.floor((comboW - borderWidth * 5) / 4);
        const smallH = Math.floor(smallW * 1.4);
        // Vertical guide between two 4R photos
        const vertX = borderWidth + SLOT_W_4R + borderWidth / 2;
        const vertH = borderWidth + SLOT_H_4R + borderWidth;
        ctx.beginPath();
        ctx.moveTo(vertX, 0);
        ctx.lineTo(vertX, vertH);
        ctx.stroke();
        // Horizontal guide 1: between 4R row and 4-cut strip
        const hGuide1Y = borderWidth + SLOT_H_4R + borderWidth;
        ctx.beginPath();
        ctx.moveTo(0, hGuide1Y);
        ctx.lineTo(comboW, hGuide1Y);
        ctx.stroke();
        // Horizontal guide 2: above bottom logo
        const hGuide2Y =
          borderWidth + SLOT_H_4R + borderWidth * 2 + smallH + borderWidth;
        ctx.beginPath();
        ctx.moveTo(0, hGuide2Y);
        ctx.lineTo(comboW, hGuide2Y);
        ctx.stroke();
        ctx.restore();
      }

      const exportBlob = await new Promise<Blob>((res) =>
        canvas.toBlob((b) => res(b!), "image/jpeg", 0.97),
      );
      const filename = `${settingsPhotoPrefix}-${Date.now()}.jpg`;

      if (saveDirHandle) {
        try {
          const fileHandle = await saveDirHandle.getFileHandle(filename, {
            create: true,
          });
          const writable = await fileHandle.createWritable();
          await writable.write(exportBlob);
          await writable.close();
          toast.dismiss(toastId);
          toast.success(t("toastSaved"));
          return;
        } catch (e: any) {
          if (e.name === "AbortError") {
            toast.dismiss(toastId);
            return;
          }
          // fall through to default download
        }
      }
      const exportUrl = URL.createObjectURL(exportBlob);
      const exportA = document.createElement("a");
      exportA.href = exportUrl;
      exportA.download = filename;
      exportA.click();
      URL.revokeObjectURL(exportUrl);
      toast.dismiss(toastId);
      toast.success(t("toastSaved"));
    } catch {
      toast.dismiss(toastId);
      toast.error(t("toastSaveError"));
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans">
      <Toaster position="top-center" />

      {/* Layout change confirmation dialog */}
      <AlertDialog
        open={saveNameDialogOpen}
        onOpenChange={setSaveNameDialogOpen}
      >
        <AlertDialogContent data-ocid="save.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === "ko" ? "프로젝트 저장" : "Save Project"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === "ko"
                ? "저장 파일 이름을 입력하세요"
                : "Enter a filename for your project"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={saveNameInput}
            onChange={(e) => setSaveNameInput(e.target.value)}
            placeholder="sona-studio-project"
            className="mt-2"
            data-ocid="save.name.input"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                confirmProjectSave();
              }
            }}
          />
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="save.cancel_button">
              {language === "ko" ? "취소" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmProjectSave()}
              data-ocid="save.confirm_button"
              className="bg-primary text-primary-foreground"
            >
              {language === "ko" ? "저장" : "Save"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={layoutSaveDialogOpen}
        onOpenChange={setLayoutSaveDialogOpen}
      >
        <AlertDialogContent data-ocid="layout.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("layoutChangeTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("layoutChangeDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-wrap gap-2">
            <AlertDialogCancel
              onClick={() => {
                setLayoutSaveDialogOpen(false);
                setPendingLayout(null);
              }}
              data-ocid="layout.cancel_button"
            >
              {t("layoutChangeCancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingLayout) applyLayoutSwitch(pendingLayout);
              }}
              data-ocid="layout.secondary_button"
              className="bg-muted text-foreground hover:bg-muted/80 border border-border"
            >
              {t("layoutChangeDontSave")}
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => {
                handleExport();
                if (pendingLayout) applyLayoutSwitch(pendingLayout);
              }}
              data-ocid="layout.save_photo_button"
              className="bg-secondary text-secondary-foreground hover:opacity-90"
            >
              {language === "ko" ? "사진 저장 후 변경" : "Save Photo & Switch"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md" data-ocid="settings.dialog">
          <DialogHeader>
            <DialogTitle>{language === "ko" ? "설정" : "Settings"}</DialogTitle>
            <DialogDescription>
              {language === "ko"
                ? "저장 옵션을 설정하세요."
                : "Configure save options."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {language === "ko"
                  ? "사진 저장 파일명 접두사"
                  : "Photo Filename Prefix"}
              </Label>
              <Input
                value={settingsPhotoPrefix}
                onChange={(e) => setSettingsPhotoPrefix(e.target.value)}
                placeholder="sona-studio"
                data-ocid="settings.photo_prefix.input"
              />
              <p className="text-xs text-muted-foreground">
                {language === "ko"
                  ? `저장 파일명: ${settingsPhotoPrefix}-[타임스탬프].jpg`
                  : `Saves as: ${settingsPhotoPrefix}-[timestamp].jpg`}
              </p>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {language === "ko"
                  ? "프로젝트 저장 파일명 접두사"
                  : "Project Filename Prefix"}
              </Label>
              <Input
                value={settingsProjectPrefix}
                onChange={(e) => setSettingsProjectPrefix(e.target.value)}
                placeholder="sona-studio-project"
                data-ocid="settings.project_prefix.input"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label className="text-sm font-medium">
                  {language === "ko"
                    ? "프로젝트에 사진 포함"
                    : "Include Photos in Project"}
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {language === "ko"
                    ? "프로젝트 저장 시 프레임 안 사진도 함께 저장합니다. 파일 크기가 커질 수 있습니다."
                    : "Embeds frame photos in the project file. File size may increase significantly."}
                </p>
              </div>
              <Switch
                checked={settingsIncludePhotos}
                onCheckedChange={setSettingsIncludePhotos}
                data-ocid="settings.include_photos.switch"
              />
            </div>
            <Separator />
            {"showDirectoryPicker" in window ? (
              <div className="space-y-2">
                <div>
                  <Label className="text-sm font-medium">
                    {language === "ko" ? "저장 폴더 지정" : "Set Save Folder"}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {language === "ko"
                      ? "한 번 설정하면 이후 저장이 모두 해당 폴더로 자동 저장됩니다."
                      : "Set once, and all saves automatically go to that folder."}
                  </p>
                </div>
                {saveDirHandle ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs bg-muted px-2 py-1 rounded-md font-mono border border-border">
                      📁 {saveDirHandle.name}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      data-ocid="settings.change_folder.button"
                      onClick={async () => {
                        try {
                          const handle = await (
                            window as any
                          ).showDirectoryPicker();
                          setSaveDirHandle(handle);
                        } catch (e: any) {
                          if (e.name !== "AbortError") console.error(e);
                        }
                      }}
                    >
                      {language === "ko" ? "변경" : "Change"}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      data-ocid="settings.clear_folder.button"
                      onClick={() => setSaveDirHandle(null)}
                    >
                      {language === "ko" ? "해제" : "Clear"}
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    data-ocid="settings.select_folder.button"
                    onClick={async () => {
                      try {
                        const handle = await (
                          window as any
                        ).showDirectoryPicker();
                        setSaveDirHandle(handle);
                      } catch (e: any) {
                        if (e.name !== "AbortError") console.error(e);
                      }
                    }}
                  >
                    {language === "ko" ? "폴더 선택" : "Select Folder"}
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {language === "ko"
                  ? "이 브라우저는 폴더 지정을 지원하지 않습니다."
                  : "Your browser does not support folder selection."}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header */}
      <header className="no-print sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-3 md:px-6 py-2 md:py-3 gap-2 md:gap-4">
          <div className="flex items-center gap-3 flex-shrink-0">
            <Layers className="w-5 h-5 text-primary" strokeWidth={1.5} />
            <span className="font-display text-base md:text-xl tracking-[0.15em] md:tracking-[0.2em] text-foreground">
              SONA STUDIO
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1 bg-muted rounded-lg p-1">
            {(["4cut", "4r", "combo"] as LayoutType[]).map((l, i) => (
              <button
                type="button"
                key={l}
                data-ocid={`layout.item.${i + 1}`}
                onClick={() => handleLayoutChange(l)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  layout === l
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {l === "4cut"
                  ? t("layout4cut")
                  : l === "4r"
                    ? t("layout4r")
                    : t("layoutCombo")}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
            <button
              type="button"
              data-ocid="header.language_toggle"
              onClick={() => setLanguage((l) => (l === "en" ? "ko" : "en"))}
              className="px-2.5 py-1 rounded-full border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition-all tracking-wider"
            >
              {t("langToggle")}
            </button>
            <button
              type="button"
              data-ocid="header.settings_button"
              onClick={() => setSettingsOpen(true)}
              className="p-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
              title={language === "ko" ? "설정" : "Settings"}
            >
              <Settings className="w-4 h-4" />
            </button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              data-ocid="studio.secondary_button"
              className="gap-2 border-border text-foreground hover:bg-accent"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden md:inline">{t("print")}</span>
            </Button>
            <Button
              size="sm"
              onClick={handleExport}
              data-ocid="studio.primary_button"
              className="gap-2 bg-primary text-primary-foreground hover:opacity-90"
            >
              <Download className="w-4 h-4" />
              <span className="hidden md:inline">{t("saveImage")}</span>
            </Button>
            <input
              ref={projectLoadRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleProjectLoad}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => projectLoadRef.current?.click()}
              data-ocid="studio.secondary_button"
              className="gap-2 border-border text-foreground hover:bg-accent"
            >
              <FolderOpen className="w-4 h-4" />
              <span className="hidden md:inline">{t("loadProject")}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleProjectSave}
              data-ocid="studio.save_button"
              className="gap-2 border-border text-foreground hover:bg-accent"
            >
              <Save className="w-4 h-4" />
              <span className="hidden md:inline">{t("saveProject")}</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex flex-1 overflow-hidden relative">
        {/* Canvas area */}
        <div
          className="flex-1 flex items-start justify-center overflow-auto p-2 md:p-4 pb-20 md:pb-4 transition-all duration-300"
          style={{ minWidth: 0 }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={layout}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.22 }}
            >
              {/* A4 Paper wrapper */}
              <div
                style={{
                  background: "white",
                  boxShadow:
                    "0 4px 24px rgba(0,0,0,0.13), 0 1px 6px rgba(0,0,0,0.07)",
                  padding: 20,
                  display: "inline-flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 480,
                  minHeight: 679,
                  position: "relative",
                  transformOrigin: "top center",
                  transform: "scale(0.88)",
                  marginBottom: "-82px",
                }}
              >
                {/* A4 label */}
                <span
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 10,
                    fontSize: 9,
                    color: "#ccc",
                    fontFamily: "monospace",
                    letterSpacing: "0.08em",
                    pointerEvents: "none",
                  }}
                >
                  A4
                </span>
                <StudioComposition
                  compositionRef={compositionRef}
                  layout={layout}
                  slots={slots}
                  selectedSlot={selectedSlot}
                  borderWidth={borderWidth}
                  bgColor={bgColor}
                  bgPattern={bgPattern}
                  dateEnabled={dateEnabled}
                  datePos={datePos}
                  textOverlays={textOverlays}
                  stickers={stickers}
                  logoEnabled={logoEnabled}
                  logoPosition={logoPosition}
                  logoColor={logoColor}
                  borderColor={borderColor}
                  onSlotClick={(idx) => {
                    if (!slots[idx].imageUrl) {
                      if (swapSlot !== null) {
                        // Drop swap into empty slot
                        setSlots((prev) => {
                          const next = [...prev];
                          next[idx] = { ...prev[swapSlot] };
                          next[swapSlot] = defaultSlot();
                          return next;
                        });
                        setSwapSlot(null);
                        setSelectedSlot(null);
                      } else {
                        openUpload(idx);
                      }
                    } else {
                      if (swapSlot === null) {
                        setSwapSlot(idx);
                        setSelectedSlot(idx);
                      } else if (swapSlot === idx) {
                        setSwapSlot(null);
                        setSelectedSlot(null);
                      } else {
                        // Perform swap
                        setSlots((prev) => {
                          const next = [...prev];
                          const tmp = { ...prev[swapSlot] };
                          next[swapSlot] = { ...prev[idx] };
                          next[idx] = tmp;
                          return next;
                        });
                        setSwapSlot(null);
                        setSelectedSlot(idx);
                      }
                    }
                  }}
                  swapSlot={swapSlot}
                  onClearSlot={(idx) => {
                    setSlots((prev) =>
                      prev.map((s, i) => (i === idx ? defaultSlot() : s)),
                    );
                    if (selectedSlot === idx) setSelectedSlot(null);
                    if (swapSlot === idx) setSwapSlot(null);
                  }}
                  onUpload={openUpload}
                  onUpdateSlot={updateSlot}
                  onUpdateText={updateTextOverlay}
                  onUpdateSticker={updateSticker}
                  onDeleteText={(id) =>
                    setTextOverlays((prev) => prev.filter((t) => t.id !== id))
                  }
                  onDeleteSticker={(id) =>
                    setStickers((prev) => prev.filter((s) => s.id !== id))
                  }
                  addPhotoLabel={t("addPhoto")}
                />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Sidebar toggle button */}
        <button
          type="button"
          data-ocid="sidebar.toggle"
          onClick={() => setSidebarOpen((v) => !v)}
          className="no-print absolute right-0 top-1/2 -translate-y-1/2 z-20 hidden md:flex items-center justify-center w-6 h-12 bg-card border border-border rounded-l-lg shadow-md hover:bg-accent transition-all duration-300"
          style={{ right: sidebarOpen ? "288px" : "0px" }}
          title={sidebarOpen ? t("sidebarHide") : t("sidebarShow")}
        >
          {sidebarOpen ? (
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </button>

        {/* Right panel */}
        <aside
          className="no-print border-l border-border bg-card hidden md:flex flex-col shrink-0 overflow-hidden transition-all duration-300"
          style={{
            width: sidebarOpen ? "288px" : "0px",
            opacity: sidebarOpen ? 1 : 0,
          }}
        >
          <Tabs defaultValue="edit" className="flex flex-col h-full">
            <TabsList className="w-full rounded-none border-b border-border bg-transparent px-0 h-11 shrink-0">
              <TabsTrigger
                value="edit"
                data-ocid="panel.edit.tab"
                className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                편집
              </TabsTrigger>
              <TabsTrigger
                value="overlay"
                data-ocid="panel.overlay.tab"
                className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                오버레이
              </TabsTrigger>
              <TabsTrigger
                value="frame"
                data-ocid="panel.frame.tab"
                className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                프레임
              </TabsTrigger>
            </TabsList>

            {/* ── Edit tab */}
            <TabsContent
              value="edit"
              className="flex-1 overflow-hidden m-0 data-[state=inactive]:hidden"
            >
              <ScrollArea className="h-full">
                <div className="p-4 space-y-5">
                  {sel === null ? (
                    <div
                      data-ocid="edit.empty_state"
                      className="flex flex-col items-center justify-center py-16 text-center gap-3"
                    >
                      <div className="w-14 h-14 rounded-full border border-border flex items-center justify-center">
                        <ImagePlus className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm text-foreground font-medium">
                          {t("selectSlot")}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t("clickSlot")}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={selectedSlot}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.18 }}
                        className="space-y-5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                            슬롯 {(selectedSlot ?? 0) + 1}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                            onClick={() => openUpload(selectedSlot!)}
                            data-ocid="edit.upload_button"
                          >
                            <ImagePlus className="w-3.5 h-3.5" />
                            {t("addPhoto")}
                          </Button>
                        </div>

                        <Separator className="bg-border" />

                        {/* Zoom */}
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                            확대/축소
                          </Label>
                          <div className="flex items-center gap-3">
                            <Slider
                              data-ocid="edit.zoom.input"
                              min={1}
                              max={3}
                              step={0.05}
                              value={[sel.zoom]}
                              onValueChange={([v]) =>
                                updateSlot(selectedSlot!, { zoom: v })
                              }
                              className="flex-1 [&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary"
                            />
                            <span className="text-xs text-muted-foreground w-8 text-right">
                              {sel.zoom.toFixed(1)}x
                            </span>
                          </div>
                        </div>

                        {/* Rotation */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                              {t("rotate")}
                            </Label>
                            <button
                              type="button"
                              onClick={() =>
                                updateSlot(selectedSlot!, {
                                  rotation: 0,
                                  panX: 0,
                                  panY: 0,
                                })
                              }
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                              data-ocid="edit.rotation.button"
                            >
                              <RotateCcw className="w-3 h-3" />
                              {t("reset")}
                            </button>
                          </div>
                          <div className="flex items-center gap-3">
                            <Slider
                              data-ocid="edit.rotation.input"
                              min={-180}
                              max={180}
                              step={1}
                              value={[sel.rotation]}
                              onValueChange={([v]) =>
                                updateSlot(selectedSlot!, { rotation: v })
                              }
                              className="flex-1 [&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary"
                            />
                            <span className="text-xs text-muted-foreground w-10 text-right">
                              {sel.rotation}°
                            </span>
                          </div>
                        </div>

                        {/* Flip */}
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                            {t("flip")}
                          </Label>
                          <div className="flex gap-2">
                            <Button
                              variant={sel.flipH ? "default" : "outline"}
                              size="sm"
                              className={`flex-1 gap-2 text-xs ${sel.flipH ? "bg-primary text-primary-foreground" : "border-border text-foreground"}`}
                              onClick={() =>
                                updateSlot(selectedSlot!, { flipH: !sel.flipH })
                              }
                              data-ocid="edit.flip.h.toggle"
                            >
                              <FlipHorizontal2 className="w-4 h-4" />
                              {t("flipH")}
                            </Button>
                            <Button
                              variant={sel.flipV ? "default" : "outline"}
                              size="sm"
                              className={`flex-1 gap-2 text-xs ${sel.flipV ? "bg-primary text-primary-foreground" : "border-border text-foreground"}`}
                              onClick={() =>
                                updateSlot(selectedSlot!, { flipV: !sel.flipV })
                              }
                              data-ocid="edit.flip.v.toggle"
                            >
                              <FlipVertical2 className="w-4 h-4" />
                              {t("flipV")}
                            </Button>
                          </div>
                        </div>

                        {/* Filters */}
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                            {t("filter")}
                          </Label>
                          <div className="flex flex-wrap gap-1.5">
                            {FILTERS.map((f) => (
                              <button
                                type="button"
                                key={f.id}
                                onClick={() =>
                                  updateSlot(selectedSlot!, { filter: f.id })
                                }
                                data-ocid="edit.filter.toggle"
                                className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                                  sel.filter === f.id
                                    ? "bg-primary text-primary-foreground border-transparent"
                                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                                }`}
                              >
                                {f.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Adjustments */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                              {t("adjust")}
                            </Label>
                            <button
                              type="button"
                              onClick={() =>
                                updateSlot(selectedSlot!, {
                                  brightness: 100,
                                  contrast: 100,
                                  saturation: 100,
                                  temperature: 0,
                                  shadow: 0,
                                  vignette: 0,
                                })
                              }
                              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                              data-ocid="edit.adjustment.button"
                            >
                              <RotateCcw className="w-3 h-3" />
                              {t("reset")}
                            </button>
                          </div>
                          <div className="space-y-2.5">
                            {[
                              {
                                key: "brightness" as const,
                                label: t("brightness"),
                                min: 0,
                                max: 200,
                                def: 100,
                              },
                              {
                                key: "contrast" as const,
                                label: t("contrast"),
                                min: 0,
                                max: 200,
                                def: 100,
                              },
                              {
                                key: "saturation" as const,
                                label: t("saturation"),
                                min: 0,
                                max: 200,
                                def: 100,
                              },
                              {
                                key: "temperature" as const,
                                label: t("temperature"),
                                min: -100,
                                max: 100,
                                def: 0,
                              },
                              {
                                key: "shadow" as const,
                                label: t("shadow"),
                                min: 0,
                                max: 100,
                                def: 0,
                              },
                              {
                                key: "vignette" as const,
                                label: t("vignette"),
                                min: 0,
                                max: 100,
                                def: 0,
                              },
                            ].map(({ key, label, min, max }) => (
                              <div
                                key={key}
                                className="grid grid-cols-[52px_1fr_32px] items-center gap-2"
                              >
                                <Label className="text-xs text-muted-foreground">
                                  {label}
                                </Label>
                                <Slider
                                  data-ocid={`edit.${key}.input`}
                                  min={min}
                                  max={max}
                                  step={1}
                                  value={[sel[key]]}
                                  onValueChange={([v]) =>
                                    updateSlot(selectedSlot!, { [key]: v })
                                  }
                                  className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary"
                                />
                                <span className="text-[10px] text-muted-foreground text-right tabular-nums">
                                  {sel[key]}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground">
                          <Move className="w-3.5 h-3.5 shrink-0" />
                          <span>확대 후 드래그로 위치 조정</span>
                        </div>

                        {/* Film date stamp */}
                        <div className="space-y-3 pt-1">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-primary" />
                            <span className="text-xs font-semibold uppercase tracking-widest">
                              {t("filmDateLabel")}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border">
                            <span className="text-sm text-foreground">
                              {t("filmDateEnabled")}
                            </span>
                            <Switch
                              checked={sel.filmDate}
                              onCheckedChange={(v) =>
                                updateSlot(selectedSlot!, { filmDate: v })
                              }
                              data-ocid="edit.film_date.switch"
                              className="data-[state=checked]:bg-primary"
                            />
                          </div>
                          {sel.filmDate && (
                            <div className="space-y-1.5">
                              <Label className="text-xs text-muted-foreground">
                                {t("filmDateStr")}
                              </Label>
                              <Input
                                value={sel.filmDateStr}
                                onChange={(e) =>
                                  updateSlot(selectedSlot!, {
                                    filmDateStr: e.target.value,
                                  })
                                }
                                data-ocid="edit.film_date.input"
                                placeholder="2026.03.17"
                                className="bg-input border-border text-foreground font-mono text-sm"
                              />
                            </div>
                          )}
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* ── Overlay tab */}
            <TabsContent
              value="overlay"
              className="flex-1 overflow-hidden m-0 data-[state=inactive]:hidden"
            >
              <ScrollArea className="h-full">
                <div className="p-4 space-y-5">
                  {/* Date stamp */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      <span className="text-xs font-semibold uppercase tracking-widest">
                        {t("dateStamp")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border">
                      <span className="text-sm text-foreground font-mono">
                        {DATE_STR}
                      </span>
                      <Switch
                        checked={dateEnabled}
                        onCheckedChange={setDateEnabled}
                        data-ocid="overlay.date.switch"
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>
                    {dateEnabled && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-2 pt-1">
                          <Label className="text-xs text-muted-foreground">
                            {t("position")}
                          </Label>
                          <div className="grid grid-cols-2 gap-1.5">
                            {[
                              { id: "tl" as DatePos, labelKey: "positionTL" },
                              { id: "tr" as DatePos, labelKey: "positionTR" },
                              { id: "bl" as DatePos, labelKey: "positionBL" },
                              { id: "br" as DatePos, labelKey: "positionBR" },
                            ].map((p) => (
                              <button
                                type="button"
                                key={p.id}
                                onClick={() => setDatePos(p.id)}
                                data-ocid="overlay.date.position.toggle"
                                className={`py-1.5 rounded text-xs font-medium transition-all border ${
                                  datePos === p.id
                                    ? "bg-primary text-primary-foreground border-transparent"
                                    : "border-border text-muted-foreground hover:border-primary/40"
                                }`}
                              >
                                {t(p.labelKey)}
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  <Separator className="bg-border" />

                  {/* Text overlay */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Type className="w-4 h-4 text-primary" />
                      <span className="text-xs font-semibold uppercase tracking-widest">
                        {t("text")}
                      </span>
                    </div>

                    <Input
                      value={newText}
                      onChange={(e) => setNewText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addText()}
                      placeholder={t("textPlaceholder")}
                      data-ocid="overlay.text.input"
                      className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                    />

                    {/* Font style toggles: B / I / U */}
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground flex-1">
                        {t("style")}
                      </Label>
                      <button
                        type="button"
                        data-ocid="overlay.text.bold.toggle"
                        onClick={() => setNewTextBold((v) => !v)}
                        className={`w-8 h-8 rounded border text-sm font-bold transition-all ${
                          newTextBold
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border text-foreground hover:bg-muted"
                        }`}
                        title={t("style")}
                      >
                        <Bold className="w-3.5 h-3.5 mx-auto" />
                      </button>
                      <button
                        type="button"
                        data-ocid="overlay.text.italic.toggle"
                        onClick={() => setNewTextItalic((v) => !v)}
                        className={`w-8 h-8 rounded border text-sm transition-all ${
                          newTextItalic
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border text-foreground hover:bg-muted"
                        }`}
                        title={t("style")}
                      >
                        <Italic className="w-3.5 h-3.5 mx-auto" />
                      </button>
                      <button
                        type="button"
                        data-ocid="overlay.text.underline.toggle"
                        onClick={() => setNewTextUnderline((v) => !v)}
                        className={`w-8 h-8 rounded border text-sm transition-all ${
                          newTextUnderline
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border text-foreground hover:bg-muted"
                        }`}
                        title={t("style")}
                      >
                        <Underline className="w-3.5 h-3.5 mx-auto" />
                      </button>
                    </div>

                    {/* Font family selector */}
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        {t("font")}
                      </Label>
                      <select
                        value={newTextFont}
                        onChange={(e) => setNewTextFont(e.target.value)}
                        data-ocid="overlay.text.font.select"
                        className="w-full h-9 rounded-md border border-border bg-input px-2 text-xs text-foreground"
                      >
                        <option value="sans-serif">고딕 (기본)</option>
                        <option value="serif">명조</option>
                        <option value="'Nanum Myeongjo', serif">
                          나눔명조
                        </option>
                        <option value="'Nanum Gothic', sans-serif">
                          나눔고딕
                        </option>
                        <option value="cursive">손글씨</option>
                        <option value="'Playfair Display', serif">
                          플레이페어
                        </option>
                      </select>
                    </div>

                    <div className="flex gap-2">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          {t("size")}
                        </Label>
                        <Input
                          type="number"
                          min={10}
                          max={64}
                          value={newTextSize}
                          onChange={(e) =>
                            setNewTextSize(Number(e.target.value))
                          }
                          data-ocid="overlay.text.size.input"
                          className="bg-input border-border text-foreground h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          {t("color")}
                        </Label>
                        <div className="relative">
                          <input
                            type="color"
                            value={newTextColor}
                            onChange={(e) => setNewTextColor(e.target.value)}
                            data-ocid="overlay.text.color.input"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                          <div
                            className="w-9 h-9 rounded border border-border"
                            style={{ background: newTextColor }}
                          />
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={addText}
                      size="sm"
                      className="w-full bg-primary text-primary-foreground hover:opacity-90"
                      data-ocid="overlay.text.submit_button"
                    >
                      {t("addText")}
                    </Button>

                    {textOverlays.length > 0 && (
                      <div
                        data-ocid="overlay.text.list"
                        className="space-y-1.5"
                      >
                        {textOverlays.map((overlay, i) => (
                          <div
                            key={overlay.id}
                            data-ocid={`overlay.text.item.${i + 1}`}
                            className="flex items-center justify-between p-2 rounded-md bg-muted/30 border border-border text-xs"
                          >
                            <span
                              className="truncate max-w-[140px]"
                              style={{
                                color: overlay.color,
                                fontSize: 13,
                                fontWeight: overlay.bold ? "bold" : "normal",
                                fontStyle: overlay.italic ? "italic" : "normal",
                                textDecoration: overlay.underline
                                  ? "underline"
                                  : "none",
                              }}
                            >
                              {overlay.text}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-[10px] text-muted-foreground">
                                {Math.round(overlay.fontSize)}px
                              </span>
                              <label
                                className="cursor-pointer"
                                title={
                                  language === "ko"
                                    ? "색상 변경"
                                    : "Change color"
                                }
                              >
                                <div
                                  className="w-5 h-5 rounded-full border border-border"
                                  style={{ background: overlay.color }}
                                />
                                <input
                                  type="color"
                                  value={overlay.color}
                                  onChange={(e) =>
                                    setTextOverlays((prev) =>
                                      prev.map((x) =>
                                        x.id === overlay.id
                                          ? { ...x, color: e.target.value }
                                          : x,
                                      ),
                                    )
                                  }
                                  className="sr-only"
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() =>
                                  setTextOverlays((prev) =>
                                    prev.filter((x) => x.id !== overlay.id),
                                  )
                                }
                                data-ocid={`overlay.text.delete_button.${i + 1}`}
                                className="text-muted-foreground hover:text-destructive ml-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Separator className="bg-border" />

                  {/* Stickers */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Smile className="w-4 h-4 text-primary" />
                      <span className="text-xs font-semibold uppercase tracking-widest">
                        {t("sticker")}
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-1">
                      {STICKER_EMOJIS.map((e) => (
                        <button
                          type="button"
                          key={e}
                          onClick={() => addSticker(e)}
                          data-ocid="overlay.sticker.button"
                          className="text-2xl py-2 rounded-lg hover:bg-accent transition-colors"
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                    {stickers.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {stickers.map((s, i) => (
                          <div
                            key={s.id}
                            data-ocid={`overlay.sticker.item.${i + 1}`}
                            className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted/40 border border-border text-xs"
                          >
                            <span>{s.emoji}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setStickers((prev) =>
                                  prev.filter((x) => x.id !== s.id),
                                )
                              }
                              data-ocid={`overlay.sticker.delete_button.${i + 1}`}
                              className="text-muted-foreground hover:text-destructive leading-none"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {stickers.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {t("dragHint")}
                      </p>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* ── Frame tab */}
            <TabsContent
              value="frame"
              className="flex-1 overflow-hidden m-0 data-[state=inactive]:hidden"
            >
              <ScrollArea className="h-full">
                <div className="p-4 space-y-5">
                  {/* Presets */}
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      {t("stylePreset")}
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        Object.entries(FRAME_PRESETS) as [
                          FramePreset,
                          (typeof FRAME_PRESETS)[FramePreset],
                        ][]
                      ).map(([key, p]) => (
                        <button
                          type="button"
                          key={key}
                          onClick={() => applyPreset(key)}
                          data-ocid="frame.preset.toggle"
                          className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${
                            framePreset === key
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/40 hover:bg-muted/40"
                          }`}
                        >
                          <div
                            className="w-8 h-10 rounded border-2"
                            style={{
                              background: p.bgColor,
                              borderColor: p.borderColor,
                            }}
                          />
                          <span
                            className={`text-xs font-medium ${framePreset === key ? "text-primary" : "text-muted-foreground"}`}
                          >
                            {t(
                              `preset${key.charAt(0).toUpperCase()}${key.slice(1)}`,
                            )}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <Separator className="bg-border" />

                  {/* Border color - pastel swatches */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                      {t("borderColor")}
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {PASTEL_BORDER_COLORS.map((c) => (
                        <button
                          key={c.hex}
                          type="button"
                          title={c.name}
                          data-ocid="frame.border.color.toggle"
                          onClick={() =>
                            setBorderColor(
                              c.hex === "transparent" ? "transparent" : c.hex,
                            )
                          }
                          className="relative transition-transform hover:scale-110"
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: "50%",
                            background:
                              c.hex === "transparent"
                                ? "linear-gradient(135deg, #fff 45%, #f00 45%, #f00 55%, #fff 55%)"
                                : c.hex,
                            border:
                              borderColor === c.hex
                                ? "2.5px solid oklch(0.55 0.15 265)"
                                : "1.5px solid rgba(0,0,0,0.15)",
                            boxShadow:
                              borderColor === c.hex
                                ? "0 0 0 2px white, 0 0 0 3.5px oklch(0.55 0.15 265)"
                                : undefined,
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Border width */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                      {t("margin")} — {borderWidth}px
                    </Label>
                    <Slider
                      data-ocid="frame.border.width.input"
                      min={0}
                      max={40}
                      step={1}
                      value={[borderWidth]}
                      onValueChange={([v]) => setBorderWidth(v)}
                      className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0</span>
                      <span>40px</span>
                    </div>
                  </div>

                  {/* Bg color - pastel swatches */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                      {t("bgColor")}
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {PASTEL_BG_COLORS.map((c) => (
                        <button
                          key={c.hex}
                          type="button"
                          title={c.name}
                          data-ocid="frame.bg.color.toggle"
                          onClick={() => setBgColor(c.hex)}
                          className="relative transition-transform hover:scale-110"
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: "50%",
                            background: c.hex,
                            border:
                              bgColor === c.hex
                                ? "2.5px solid oklch(0.55 0.15 265)"
                                : "1.5px solid rgba(0,0,0,0.15)",
                            boxShadow:
                              bgColor === c.hex
                                ? "0 0 0 2px white, 0 0 0 3.5px oklch(0.55 0.15 265)"
                                : undefined,
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <Separator className="bg-border" />

                  {/* Patterns */}
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      {t("bgPattern")}
                    </Label>
                    <div className="grid grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => setBgPattern(null)}
                        data-ocid="pattern.item.1"
                        title={t("noPattern")}
                        className={`relative w-full aspect-square rounded-md border-2 transition-all overflow-hidden ${
                          bgPattern === null
                            ? "border-primary shadow-sm scale-105"
                            : "border-border hover:border-primary/50"
                        }`}
                        style={{ background: bgColor }}
                      >
                        <span className="text-[9px] text-muted-foreground font-medium leading-tight absolute inset-0 flex items-center justify-center">
                          {t("noPattern")}
                        </span>
                      </button>
                      {CHECK_PATTERNS.map((p, i) => (
                        <button
                          type="button"
                          key={p.id}
                          onClick={() => setBgPattern(p.css)}
                          data-ocid={`pattern.item.${i + 2}`}
                          title={p.name}
                          className={`relative w-full aspect-square rounded-md border-2 transition-all overflow-hidden ${
                            bgPattern === p.css
                              ? "border-primary shadow-sm scale-105"
                              : "border-border hover:border-primary/50"
                          }`}
                          style={{ background: p.css }}
                        />
                      ))}
                    </div>
                    {bgPattern && (
                      <p className="text-xs text-muted-foreground">
                        {CHECK_PATTERNS.find((p) => p.css === bgPattern)
                          ?.name ?? ""}{" "}
                        선택됨
                      </p>
                    )}
                  </div>

                  <Separator className="bg-border" />

                  {/* Logo */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        {t("logoLabel")}
                      </Label>
                      <Switch
                        checked={logoEnabled}
                        onCheckedChange={setLogoEnabled}
                        data-ocid="frame.logo.switch"
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>
                    {logoEnabled && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="overflow-hidden space-y-3"
                      >
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">
                            {t("logoPosition")}
                          </Label>
                          <Select
                            value={logoPosition}
                            onValueChange={(v) =>
                              setLogoPosition(v as LogoPosition)
                            }
                          >
                            <SelectTrigger
                              data-ocid="frame.logo.position.select"
                              className="h-9 text-xs border-border"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(
                                Object.entries(LOGO_POSITION_KEYS) as [
                                  LogoPosition,
                                  string,
                                ][]
                              ).map(([k, tKey]) => (
                                <SelectItem
                                  key={k}
                                  value={k}
                                  className="text-xs"
                                >
                                  {t(tKey)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">
                            {t("logoColor")}
                          </Label>
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <input
                                type="color"
                                value={logoColor}
                                onChange={(e) => setLogoColor(e.target.value)}
                                data-ocid="frame.logo.color.input"
                                className="absolute inset-0 opacity-0 cursor-pointer w-10 h-10"
                              />
                              <div
                                className="w-10 h-10 rounded border border-border"
                                style={{ background: logoColor }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground font-mono">
                              {logoColor}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </aside>
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="no-print md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border flex items-stretch h-16">
        {[
          {
            id: "layout",
            icon: <LayoutGrid className="w-5 h-5" />,
            label: t("mobileLayout"),
          },
          {
            id: "edit",
            icon: <SlidersHorizontal className="w-5 h-5" />,
            label: t("mobileEdit"),
          },
          {
            id: "text",
            icon: <Type className="w-5 h-5" />,
            label: t("mobileText"),
          },
          {
            id: "sticker",
            icon: <Smile className="w-5 h-5" />,
            label: t("mobileSticker"),
          },
          {
            id: "frame",
            icon: <Frame className="w-5 h-5" />,
            label: t("mobileFrame"),
          },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            data-ocid={`mobile.${tab.id}.tab`}
            onClick={() => {
              if (mobileTab === tab.id && mobileDrawerOpen) {
                setMobileDrawerOpen(false);
              } else {
                setMobileTab(tab.id);
                setMobileDrawerOpen(true);
              }
            }}
            className={`flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors min-h-[44px] ${
              mobileTab === tab.id && mobileDrawerOpen
                ? "text-primary"
                : "text-muted-foreground"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Mobile Drawer Panel */}
      <Drawer
        open={mobileDrawerOpen && isMobile}
        onOpenChange={(open) => {
          if (!open) setMobileDrawerOpen(false);
        }}
        direction="bottom"
      >
        <DrawerContent className="md:hidden max-h-[75vh] pb-16">
          <DrawerHeader className="flex items-center justify-between py-2 px-4 border-b border-border">
            <DrawerTitle className="text-sm font-semibold">
              {mobileTab === "layout" && t("mobileLayout")}
              {mobileTab === "edit" && t("mobileEdit")}
              {mobileTab === "text" && t("mobileText")}
              {mobileTab === "sticker" && t("mobileSticker")}
              {mobileTab === "frame" && t("mobileFrame")}
            </DrawerTitle>
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(false)}
              data-ocid="mobile.drawer.close_button"
              className="p-2 rounded-md hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </DrawerHeader>
          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="p-4">
              {/* Layout tab */}
              {mobileTab === "layout" && (
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                    {t("drawerLayout")}
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {(["4cut", "4r", "combo"] as LayoutType[]).map((l, i) => (
                      <button
                        type="button"
                        key={l}
                        data-ocid={`mobile.layout.item.${i + 1}`}
                        onClick={() => {
                          handleLayoutChange(l);
                          setMobileDrawerOpen(false);
                        }}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all min-h-[80px] justify-center ${
                          layout === l
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        <LayoutGrid className="w-6 h-6" />
                        <span className="text-sm font-medium">
                          {l === "4cut"
                            ? t("layoutShort4cut")
                            : l === "4r"
                              ? t("layoutShort4r")
                              : t("layoutShortCombo")}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Edit tab */}
              {mobileTab === "edit" && (
                <div className="space-y-5">
                  {selectedSlot === null ? (
                    <div
                      data-ocid="mobile.edit.empty_state"
                      className="flex flex-col items-center justify-center py-12 text-center gap-3"
                    >
                      <div className="w-14 h-14 rounded-full border border-border flex items-center justify-center">
                        <ImagePlus className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-foreground font-medium">
                        {t("selectSlot")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("tapSlot")}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                          {t("slot")} {(selectedSlot ?? 0) + 1}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs gap-1.5"
                          onClick={() => openUpload(selectedSlot!)}
                          data-ocid="mobile.edit.upload_button"
                        >
                          <ImagePlus className="w-3.5 h-3.5" />
                          {t("addPhoto")}
                        </Button>
                      </div>
                      {slots[selectedSlot]?.imageUrl && (
                        <>
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                              줌 —{" "}
                              {Math.round(
                                (slots[selectedSlot]?.zoom ?? 1) * 100,
                              )}
                              %
                            </Label>
                            <Slider
                              min={50}
                              max={300}
                              step={1}
                              value={[
                                Math.round(
                                  (slots[selectedSlot]?.zoom ?? 1) * 100,
                                ),
                              ]}
                              onValueChange={([v]) =>
                                updateSlot(selectedSlot!, { zoom: v / 100 })
                              }
                              className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                              {t("rotate")} —{" "}
                              {slots[selectedSlot]?.rotation ?? 0}°
                            </Label>
                            <Slider
                              min={-180}
                              max={180}
                              step={1}
                              value={[slots[selectedSlot]?.rotation ?? 0]}
                              onValueChange={([v]) =>
                                updateSlot(selectedSlot!, { rotation: v })
                              }
                              className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                              {t("filter")}
                            </Label>
                            <div className="flex flex-wrap gap-1.5">
                              {FILTERS.map((f) => (
                                <button
                                  type="button"
                                  key={f.id}
                                  onClick={() =>
                                    updateSlot(selectedSlot!, { filter: f.id })
                                  }
                                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${slots[selectedSlot]?.filter === f.id ? "bg-primary text-primary-foreground border-transparent" : "border-border text-muted-foreground"}`}
                                >
                                  {f.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                                조정
                              </Label>
                              <button
                                type="button"
                                onClick={() =>
                                  updateSlot(selectedSlot!, {
                                    brightness: 100,
                                    contrast: 100,
                                    saturation: 100,
                                    temperature: 0,
                                    shadow: 0,
                                    vignette: 0,
                                  })
                                }
                                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                              >
                                <RotateCcw className="w-3 h-3" />
                                {t("reset")}
                              </button>
                            </div>
                            {[
                              {
                                key: "brightness" as const,
                                label: t("brightness"),
                                min: 0,
                                max: 200,
                              },
                              {
                                key: "contrast" as const,
                                label: t("contrast"),
                                min: 0,
                                max: 200,
                              },
                              {
                                key: "saturation" as const,
                                label: t("saturation"),
                                min: 0,
                                max: 200,
                              },
                              {
                                key: "temperature" as const,
                                label: t("temperature"),
                                min: -100,
                                max: 100,
                              },
                              {
                                key: "shadow" as const,
                                label: t("shadow"),
                                min: 0,
                                max: 100,
                              },
                              {
                                key: "vignette" as const,
                                label: t("vignette"),
                                min: 0,
                                max: 100,
                              },
                            ].map(({ key, label, min, max }) => (
                              <div
                                key={key}
                                className="grid grid-cols-[52px_1fr_32px] items-center gap-2"
                              >
                                <Label className="text-xs text-muted-foreground">
                                  {label}
                                </Label>
                                <Slider
                                  min={min}
                                  max={max}
                                  step={1}
                                  value={[
                                    slots[selectedSlot!]?.[key] ??
                                      (key === "brightness" ||
                                      key === "contrast" ||
                                      key === "saturation"
                                        ? 100
                                        : 0),
                                  ]}
                                  onValueChange={([v]) =>
                                    updateSlot(selectedSlot!, { [key]: v })
                                  }
                                  className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary"
                                />
                                <span className="text-[10px] text-muted-foreground text-right tabular-nums">
                                  {slots[selectedSlot!]?.[key] ?? 0}
                                </span>
                              </div>
                            ))}
                          </div>
                          {/* Film date stamp - mobile */}
                          <div className="space-y-3 pt-1">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-primary" />
                              <span className="text-xs font-semibold uppercase tracking-widest">
                                {t("filmDateLabel")}
                              </span>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border">
                              <span className="text-sm text-foreground">
                                {t("filmDateEnabled")}
                              </span>
                              <Switch
                                checked={
                                  slots[selectedSlot!]?.filmDate ?? false
                                }
                                onCheckedChange={(v) =>
                                  updateSlot(selectedSlot!, { filmDate: v })
                                }
                                className="data-[state=checked]:bg-primary"
                              />
                            </div>
                            {slots[selectedSlot!]?.filmDate && (
                              <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">
                                  {t("filmDateStr")}
                                </Label>
                                <Input
                                  value={
                                    slots[selectedSlot!]?.filmDateStr ?? ""
                                  }
                                  onChange={(e) =>
                                    updateSlot(selectedSlot!, {
                                      filmDateStr: e.target.value,
                                    })
                                  }
                                  placeholder="2026.03.17"
                                  className="bg-input border-border text-foreground font-mono text-sm"
                                />
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Text tab */}
              {mobileTab === "text" && (
                <div className="space-y-4">
                  <Input
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addText()}
                    placeholder={t("textPlaceholder")}
                    data-ocid="mobile.overlay.text.input"
                    className="bg-input border-border text-foreground"
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant={newTextBold ? "default" : "outline"}
                      size="sm"
                      className="h-9 w-9 p-0"
                      onClick={() => setNewTextBold((v) => !v)}
                    >
                      <Bold className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant={newTextItalic ? "default" : "outline"}
                      size="sm"
                      className="h-9 w-9 p-0"
                      onClick={() => setNewTextItalic((v) => !v)}
                    >
                      <Italic className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant={newTextUnderline ? "default" : "outline"}
                      size="sm"
                      className="h-9 w-9 p-0"
                      onClick={() => setNewTextUnderline((v) => !v)}
                    >
                      <Underline className="w-4 h-4" />
                    </Button>
                    <select
                      value={newTextFont}
                      onChange={(e) => setNewTextFont(e.target.value)}
                      className="flex-1 text-xs border border-border rounded-md h-9 px-2 bg-input text-foreground"
                    >
                      <option value="sans-serif">고딕</option>
                      <option value="serif">명조</option>
                      <option value="'Nanum Myeongjo', serif">나눔명조</option>
                      <option value="'Nanum Gothic', sans-serif">
                        나눔고딕
                      </option>
                      <option value="cursive">손글씨</option>
                      <option value="'Playfair Display', serif">
                        플레이페어
                      </option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        크기 (px)
                      </Label>
                      <Input
                        type="number"
                        min={10}
                        max={64}
                        value={newTextSize}
                        onChange={(e) => setNewTextSize(Number(e.target.value))}
                        className="bg-input border-border text-foreground h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        색상
                      </Label>
                      <div className="relative">
                        <input
                          type="color"
                          value={newTextColor}
                          onChange={(e) => setNewTextColor(e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <div
                          className="w-9 h-9 rounded border border-border"
                          style={{ background: newTextColor }}
                        />
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={addText}
                    size="sm"
                    className="w-full bg-primary text-primary-foreground"
                    data-ocid="mobile.overlay.text.submit_button"
                  >
                    {t("addText")}
                  </Button>
                  {textOverlays.length > 0 && (
                    <div className="space-y-1.5 mt-2">
                      {textOverlays.map((overlay, i) => (
                        <div
                          key={overlay.id}
                          className="flex items-center justify-between p-2 rounded-md bg-muted/30 border border-border text-xs"
                        >
                          <span
                            className="truncate max-w-[180px]"
                            style={{
                              color: overlay.color,
                              fontWeight: overlay.bold ? "bold" : "normal",
                              fontStyle: overlay.italic ? "italic" : "normal",
                              textDecoration: overlay.underline
                                ? "underline"
                                : "none",
                            }}
                          >
                            {overlay.text}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <label
                              className="cursor-pointer"
                              title={
                                language === "ko" ? "색상 변경" : "Change color"
                              }
                            >
                              <div
                                className="w-5 h-5 rounded-full border border-border"
                                style={{ background: overlay.color }}
                              />
                              <input
                                type="color"
                                value={overlay.color}
                                onChange={(e) =>
                                  setTextOverlays((prev) =>
                                    prev.map((x) =>
                                      x.id === overlay.id
                                        ? { ...x, color: e.target.value }
                                        : x,
                                    ),
                                  )
                                }
                                className="sr-only"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() =>
                                setTextOverlays((prev) =>
                                  prev.filter((x) => x.id !== overlay.id),
                                )
                              }
                              data-ocid={`mobile.overlay.text.delete_button.${i + 1}`}
                              className="text-muted-foreground hover:text-destructive ml-2"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Sticker tab */}
              {mobileTab === "sticker" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-6 gap-1">
                    {STICKER_EMOJIS.map((e) => (
                      <button
                        type="button"
                        key={e}
                        onClick={() => addSticker(e)}
                        data-ocid="mobile.overlay.sticker.button"
                        className="text-2xl py-2.5 rounded-lg hover:bg-accent transition-colors"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                  {stickers.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {stickers.map((s, i) => (
                        <div
                          key={s.id}
                          className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted/40 border border-border text-xs"
                        >
                          <span>{s.emoji}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setStickers((prev) =>
                                prev.filter((x) => x.id !== s.id),
                              )
                            }
                            data-ocid={`mobile.overlay.sticker.delete_button.${i + 1}`}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Frame tab */}
              {mobileTab === "frame" && (
                <div className="space-y-5">
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      {t("stylePreset")}
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        Object.entries(FRAME_PRESETS) as [
                          FramePreset,
                          (typeof FRAME_PRESETS)[FramePreset],
                        ][]
                      ).map(([key, p]) => (
                        <button
                          type="button"
                          key={key}
                          onClick={() => applyPreset(key)}
                          data-ocid="mobile.frame.preset.toggle"
                          className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${framePreset === key ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}
                        >
                          <div
                            className="w-8 h-10 rounded border-2"
                            style={{
                              background: p.bgColor,
                              borderColor: p.borderColor,
                            }}
                          />
                          <span
                            className={`text-xs font-medium ${framePreset === key ? "text-primary" : "text-muted-foreground"}`}
                          >
                            {t(
                              `preset${key.charAt(0).toUpperCase()}${key.slice(1)}`,
                            )}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <Separator className="bg-border" />
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                      {t("borderColor")}
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {PASTEL_BORDER_COLORS.map((c) => (
                        <button
                          key={c.hex}
                          type="button"
                          title={c.name}
                          data-ocid="mobile.frame.border.color.toggle"
                          onClick={() =>
                            setBorderColor(
                              c.hex === "transparent" ? "transparent" : c.hex,
                            )
                          }
                          className="relative transition-transform hover:scale-110"
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            background:
                              c.hex === "transparent"
                                ? "linear-gradient(135deg, #fff 45%, #f00 45%, #f00 55%, #fff 55%)"
                                : c.hex,
                            border:
                              borderColor === c.hex
                                ? "2.5px solid oklch(0.55 0.15 265)"
                                : "1.5px solid rgba(0,0,0,0.15)",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                      {t("margin")} — {borderWidth}px
                    </Label>
                    <Slider
                      min={0}
                      max={40}
                      step={1}
                      value={[borderWidth]}
                      onValueChange={([v]) => setBorderWidth(v)}
                      className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary"
                    />
                  </div>
                  <Separator className="bg-border" />
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      {t("bgColor")}
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {PASTEL_BG_COLORS.map((c) => (
                        <button
                          key={c.hex}
                          type="button"
                          title={c.name}
                          data-ocid="mobile.frame.bg.color.toggle"
                          onClick={() => setBgColor(c.hex)}
                          className="relative transition-transform hover:scale-110"
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            background: c.hex,
                            border:
                              bgColor === c.hex
                                ? "2.5px solid oklch(0.55 0.15 265)"
                                : "1.5px solid rgba(0,0,0,0.15)",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      {t("bgPattern")}
                    </Label>
                    <div className="grid grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => setBgPattern(null)}
                        data-ocid="mobile.pattern.item.1"
                        className={`relative w-full aspect-square rounded-md border-2 transition-all overflow-hidden ${bgPattern === null ? "border-primary shadow-sm scale-105" : "border-border"}`}
                        style={{ background: bgColor }}
                      >
                        <span className="text-[9px] text-muted-foreground font-medium absolute inset-0 flex items-center justify-center">
                          {t("noPattern")}
                        </span>
                      </button>
                      {CHECK_PATTERNS.map((p, i) => (
                        <button
                          type="button"
                          key={p.id}
                          onClick={() => setBgPattern(p.css)}
                          data-ocid={`mobile.pattern.item.${i + 2}`}
                          title={p.name}
                          className={`relative w-full aspect-square rounded-md border-2 transition-all overflow-hidden ${bgPattern === p.css ? "border-primary shadow-sm scale-105" : "border-border"}`}
                          style={{ background: p.css }}
                        />
                      ))}
                    </div>
                  </div>
                  <Separator className="bg-border" />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        {t("logoLabel")}
                      </Label>
                      <Switch
                        checked={logoEnabled}
                        onCheckedChange={setLogoEnabled}
                        data-ocid="mobile.frame.logo.switch"
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </DrawerContent>
      </Drawer>

      {/* Footer */}
      <footer className="no-print border-t border-border bg-card py-3 px-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()}.{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground transition-colors"
        >
          Built with ♥ using caffeine.ai
        </a>
      </footer>
    </div>
  );
}

// ─── StudioComposition component ──────────────────────────────────────────────

interface StudioCompositionProps {
  compositionRef: React.RefObject<HTMLDivElement | null>;
  layout: LayoutType;
  slots: SlotState[];
  selectedSlot: number | null;
  borderWidth: number;
  bgColor: string;
  bgPattern: string | null;
  dateEnabled: boolean;
  datePos: DatePos;
  textOverlays: TextOverlay[];
  stickers: StickerItem[];
  logoEnabled: boolean;
  logoPosition: LogoPosition;
  logoColor: string;
  borderColor: string;
  onSlotClick: (idx: number) => void;
  swapSlot: number | null;
  onClearSlot: (idx: number) => void;
  onUpload: (idx: number) => void;
  onUpdateSlot: (idx: number, patch: Partial<SlotState>) => void;
  onUpdateText: (id: string, patch: Partial<TextOverlay>) => void;
  onUpdateSticker: (id: string, patch: Partial<StickerItem>) => void;
  onDeleteText: (id: string) => void;
  onDeleteSticker: (id: string) => void;
  addPhotoLabel: string;
  onUpdateSlotFilmDate?: (
    idx: number,
    filmDate: boolean,
    filmDateStr: string,
  ) => void;
}

// ─── CutGuideLine component ───────────────────────────────────────────────────
function CutGuideLine({
  orientation,
  position,
  length,
  startOffset = 0,
}: {
  orientation: "horizontal" | "vertical";
  position: number;
  length: number;
  startOffset?: number;
}) {
  const isH = orientation === "horizontal";
  return (
    <div
      style={{
        position: "absolute",
        zIndex: 25,
        pointerEvents: "none",
        ...(isH
          ? {
              top: position - 1,
              left: startOffset,
              width: length,
              height: 0,
              borderTop: "1.5px dashed rgba(60,60,60,0.45)",
            }
          : {
              left: position - 1,
              top: startOffset,
              width: 0,
              height: length,
              borderLeft: "1.5px dashed rgba(60,60,60,0.45)",
            }),
      }}
    />
  );
}

function StudioComposition({
  compositionRef,
  layout,
  slots,
  selectedSlot,
  borderWidth,
  bgColor,
  bgPattern,
  dateEnabled,
  datePos,
  textOverlays,
  stickers,
  logoEnabled,
  logoPosition,
  logoColor,
  borderColor: _borderColor,
  onSlotClick,
  swapSlot,
  onClearSlot,
  onUpload,
  onUpdateSlot,
  onUpdateText,
  onUpdateSticker,
  onDeleteText,
  onDeleteSticker,
  addPhotoLabel,
}: StudioCompositionProps) {
  const gap = borderWidth;

  // ── Slot renderer
  const renderSlot = (idx: number, w: number, h: number) => {
    const slot = slots[idx];
    if (!slot) return null;
    return (
      <SlotButton
        key={idx}
        idx={idx}
        slot={slot}
        isSelected={selectedSlot === idx}
        isSwapSource={swapSlot === idx}
        isSwapTarget={swapSlot !== null && swapSlot !== idx}
        w={w}
        h={h}
        onSelect={onSlotClick}
        onUpload={onUpload}
        onClear={onClearSlot}
        addPhotoLabel={addPhotoLabel}
        filmDate={slot.filmDate}
        filmDateStr={slot.filmDateStr}
        onPan={(i, panX, panY) => onUpdateSlot(i, { panX, panY })}
        onZoom={(i, zoom) => onUpdateSlot(i, { zoom })}
      />
    );
  };

  // ── Date position
  const dateStyle: React.CSSProperties = {
    position: "absolute",
    fontFamily: "'Playfair Display', serif",
    fontStyle: "italic",
    fontWeight: 600,
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
    textShadow: "0 1px 6px rgba(0,0,0,0.9)",
    letterSpacing: "0.04em",
    pointerEvents: "none",
    zIndex: 10,
    ...(datePos === "tl" && { top: 12, left: 14 }),
    ...(datePos === "tr" && { top: 12, right: 14 }),
    ...(datePos === "bl" && { bottom: 26, left: 14 }),
    ...(datePos === "br" && { bottom: 26, right: 14 }),
  };

  return (
    <div
      ref={compositionRef}
      className="studio-composition relative select-none"
      style={{
        background: bgPattern ?? bgColor,
        display: "inline-block",
        position: "relative",
        outline: "1.5px solid rgba(180,180,180,0.55)",
        outlineOffset: "0px",
      }}
    >
      {/* ── 4-cut layout: 2×2 grid */}
      {layout === "4cut" && (
        <div
          style={{
            padding: gap,
            display: "flex",
            flexDirection: "column",
            gap,
            width: SLOT_W_4CUT * 2 + gap * 3,
          }}
        >
          <div style={{ display: "flex", gap }}>
            {renderSlot(0, SLOT_W_4CUT, SLOT_H_4CUT)}
            {renderSlot(1, SLOT_W_4CUT, SLOT_H_4CUT)}
          </div>
          <div style={{ display: "flex", gap }}>
            {renderSlot(2, SLOT_W_4CUT, SLOT_H_4CUT)}
            {renderSlot(3, SLOT_W_4CUT, SLOT_H_4CUT)}
          </div>
          {/* bottom strip spacer */}
          <div style={{ height: 16 }} />
        </div>
      )}

      {/* ── 4R layout: 2 portrait slots stacked with logo margins */}
      {layout === "4r" && (
        <>
          <div
            style={{
              width: SLOT_W_4R + gap * 2,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Top logo area */}
            <div
              style={{
                height: LOGO_AREA_4R,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {logoEnabled && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.18em",
                    color: logoColor,
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    textTransform: "uppercase",
                    opacity: 0.85,
                    userSelect: "none",
                  }}
                >
                  SONA STUDIO
                </span>
              )}
            </div>
            {/* Photo slots */}
            <div
              style={{
                padding: gap,
                display: "flex",
                flexDirection: "column",
                gap,
              }}
            >
              {renderSlot(0, SLOT_W_4R, SLOT_H_4R)}
              {renderSlot(1, SLOT_W_4R, SLOT_H_4R)}
            </div>
            {/* Bottom logo area */}
            <div
              style={{
                height: LOGO_AREA_4R,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {logoEnabled && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.18em",
                    color: logoColor,
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    textTransform: "uppercase",
                    opacity: 0.85,
                    userSelect: "none",
                  }}
                >
                  SONA STUDIO
                </span>
              )}
            </div>
          </div>
          {/* Top cut guide: center of gap between top logo and photo 0 */}
          <CutGuideLine
            orientation="horizontal"
            position={LOGO_AREA_4R + Math.floor(gap / 2)}
            length={SLOT_W_4R + gap * 2}
          />
          {/* Middle cut guide: center of gap between two 4R photos */}
          <CutGuideLine
            orientation="horizontal"
            position={LOGO_AREA_4R + gap + SLOT_H_4R + Math.floor(gap / 2)}
            length={SLOT_W_4R + gap * 2}
          />
          {/* Bottom cut guide: center of gap between photo 1 and bottom logo */}
          <CutGuideLine
            orientation="horizontal"
            position={
              LOGO_AREA_4R +
              gap +
              SLOT_H_4R +
              gap +
              SLOT_H_4R +
              Math.floor(gap / 2)
            }
            length={SLOT_W_4R + gap * 2}
          />
        </>
      )}

      {/* ── Combo layout */}
      {layout === "combo" &&
        (() => {
          const comboW = SLOT_W_4R * 2 + gap * 3;
          const smallW = Math.floor((comboW - gap * 5) / 4);
          const smallH = Math.floor(smallW * 1.4);
          // Cut guide positions
          // Vertical cut: between the two 4R photos (x = gap + SLOT_W_4R + gap/2)
          const vertCutX = gap + SLOT_W_4R + Math.floor(gap / 2);
          // Vertical cut height: covers only the 4R row
          const vertCutH = gap + SLOT_H_4R + gap;
          // Horizontal cut: between 4R row and 4-cut row (y = gap + SLOT_H_4R + gap)
          const horizCutY = gap + SLOT_H_4R + gap;
          return (
            <>
              <div
                style={{
                  padding: gap,
                  display: "flex",
                  flexDirection: "column",
                  gap: gap * 2,
                  width: comboW,
                }}
              >
                {/* Top: two 4R portrait slots */}
                <div style={{ display: "flex", gap }}>
                  {renderSlot(0, SLOT_W_4R, SLOT_H_4R)}
                  {renderSlot(1, SLOT_W_4R, SLOT_H_4R)}
                </div>
                {/* Bottom: 4 small horizontal slots */}
                <div style={{ display: "flex", gap }}>
                  {renderSlot(2, smallW, smallH)}
                  {renderSlot(3, smallW, smallH)}
                  {renderSlot(4, smallW, smallH)}
                  {renderSlot(5, smallW, smallH)}
                </div>
              </div>
              {/* Bottom logo area for combo */}
              <div
                style={{
                  height: LOGO_AREA_4R,
                  width: comboW,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {logoEnabled && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.18em",
                      color: logoColor,
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      textTransform: "uppercase",
                      opacity: 0.85,
                      userSelect: "none",
                    }}
                  >
                    SONA STUDIO
                  </span>
                )}
              </div>
              {/* ✂ Cut guide 1: vertical between two 4R photos */}
              <CutGuideLine
                orientation="vertical"
                position={vertCutX}
                length={vertCutH}
              />
              {/* ✂ Cut guide 2: horizontal between 4R row and 4-cut strip */}
              <CutGuideLine
                orientation="horizontal"
                position={horizCutY}
                length={comboW}
              />
              {/* ✂ Cut guide 3: horizontal above bottom logo area, centered in bottom margin */}
              <CutGuideLine
                orientation="horizontal"
                position={gap + SLOT_H_4R + gap * 2 + smallH + gap}
                length={comboW}
              />
            </>
          );
        })()}

      {/* ── Date stamp overlay */}
      {dateEnabled && <div style={dateStyle}>{DATE_STR}</div>}

      {/* ── Text overlays */}
      {textOverlays.map((t) => (
        <TextOverlayItem
          key={t.id}
          t={t}
          onUpdate={onUpdateText}
          onDelete={onDeleteText}
        />
      ))}

      {/* ── Sticker overlays */}
      {stickers.map((s) => (
        <StickerOverlayItem
          key={s.id}
          s={s}
          onUpdate={onUpdateSticker}
          onDelete={onDeleteSticker}
        />
      ))}

      {/* ── Single configurable logo (not shown for 4r which has built-in logos) */}
      {logoEnabled && layout === "4cut" && (
        <div style={getLogoStyle(logoPosition, logoColor)}>SONA STUDIO</div>
      )}
    </div>
  );
}

// ─── SlotButton component ─────────────────────────────────────────────────────

function SlotButton({
  idx,
  slot,
  isSelected,
  isSwapSource,
  isSwapTarget,
  w,
  h,
  onSelect,
  onUpload,
  onClear,
  onPan,
  onZoom,
  addPhotoLabel,
  filmDate,
  filmDateStr,
}: {
  idx: number;
  slot: SlotState;
  isSelected: boolean;
  isSwapSource: boolean;
  isSwapTarget: boolean;
  w: number;
  h: number;
  onSelect: (idx: number) => void;
  onUpload: (idx: number) => void;
  onClear: (idx: number) => void;
  onPan: (idx: number, panX: number, panY: number) => void;
  onZoom: (idx: number, zoom: number) => void;
  addPhotoLabel: string;
  filmDate?: boolean;
  filmDateStr?: string;
}) {
  const dragRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const pinchRef = useRef<{ dist: number; zoom: number } | null>(null);

  const visualZoom = slot.zoom * 1.1;
  const nw = slot.naturalW || 1;
  const nh = slot.naturalH || 1;
  const imgAr = nw / nh;
  const slotAr = w / h;
  const coverScale = imgAr > slotAr ? h / nh : w / nw;
  const displayW = nw * coverScale * visualZoom;
  const displayH = nh * coverScale * visualZoom;

  // Outline: swap source = amber, swap target hint = blue dashed, selected = gold
  let outlineStyle: React.CSSProperties = {};
  if (isSwapSource) {
    outlineStyle = {
      outline: "3px solid oklch(0.78 0.18 55)",
      outlineOffset: "-3px",
      boxShadow: "inset 0 0 0 3px oklch(0.78 0.18 55 / 0.3)",
    };
  } else if (isSwapTarget && slot.imageUrl) {
    outlineStyle = {
      outline: "2px dashed oklch(0.65 0.15 240)",
      outlineOffset: "-2px",
    };
  } else if (isSelected) {
    outlineStyle = {
      outline: "2px solid oklch(0.76 0.12 75)",
      outlineOffset: "-2px",
    };
  }

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        data-slot-index={idx}
        data-ocid={`canvas.slot.${idx + 1}`}
        className="relative overflow-hidden p-0 border-0"
        style={{
          width: w,
          height: h,
          flexShrink: 0,
          cursor: slot.imageUrl ? "grab" : "pointer",
          background: slot.imageUrl ? "transparent" : "oklch(0.20 0.007 265)",
          touchAction: "none",
          display: "block",
          ...outlineStyle,
        }}
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest(".slot-clear-btn")) return;
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          dragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            originX: slot.panX,
            originY: slot.panY,
            moved: false,
          };
        }}
        onPointerMove={(e) => {
          const d = dragRef.current;
          if (!d) return;
          const dx = e.clientX - d.startX;
          const dy = e.clientY - d.startY;
          if (Math.abs(dx) > 2 || Math.abs(dy) > 2) d.moved = true;
          if (!d.moved) return;
          onPan(idx, d.originX + dx, d.originY + dy);
        }}
        onTouchStart={(e) => {
          if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.hypot(dx, dy);
            pinchRef.current = { dist, zoom: slot.zoom };
          }
        }}
        onTouchMove={(e) => {
          if (e.touches.length === 2 && pinchRef.current) {
            e.preventDefault();
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.hypot(dx, dy);
            const scale = dist / pinchRef.current.dist;
            const newZoom = Math.min(
              5,
              Math.max(0.5, pinchRef.current.zoom * scale),
            );
            onZoom(idx, newZoom);
          }
        }}
        onTouchEnd={() => {
          pinchRef.current = null;
        }}
        onPointerUp={(e) => {
          const d = dragRef.current;
          if (d) {
            if (!d.moved) {
              if (!slot.imageUrl) onUpload(idx);
              else onSelect(idx);
            }
            dragRef.current = null;
          }
          e.currentTarget.releasePointerCapture(e.pointerId);
        }}
      >
        {slot.imageUrl ? (
          <img
            src={slot.imageUrl}
            alt={`슬롯 ${idx + 1}`}
            draggable={false}
            style={
              {
                position: "absolute",
                left: "50%",
                top: "50%",
                width: displayW,
                height: displayH,
                maxWidth: "none",
                maxHeight: "none",
                transformOrigin: "center center",
                transform: `translate(calc(-50% + ${slot.panX}px), calc(-50% + ${slot.panY}px)) rotate(${slot.rotation}deg) scaleX(${slot.flipH ? -1 : 1}) scaleY(${slot.flipV ? -1 : 1})`,
                imageRendering:
                  "high-quality" as React.CSSProperties["imageRendering"],
                filter: getFilterCSS(slot.filter, slot),
                userSelect: "none",
                pointerEvents: "none",
                WebkitTouchCallout: "none",
              } as React.CSSProperties
            }
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <ImagePlus
              className="text-muted-foreground"
              style={{ width: Math.min(w, h) * 0.15 }}
            />
            <span
              className="text-muted-foreground"
              style={{ fontSize: Math.min(w, h) * 0.07 }}
            >
              {addPhotoLabel}
            </span>
          </div>
        )}
        {slot.vignette > 0 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              zIndex: 2,
              background: `radial-gradient(ellipse at center, transparent ${100 - slot.vignette * 0.7}%, rgba(0,0,0,${slot.vignette * 0.008}) 100%)`,
            }}
          />
        )}
        {slot.shadow > 0 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              zIndex: 3,
              background: `linear-gradient(rgba(0,0,0,${slot.shadow * 0.003}), rgba(0,0,0,${slot.shadow * 0.003}))`,
              mixBlendMode: "multiply",
            }}
          />
        )}
      </button>
      {/* Film date stamp overlay */}
      {slot.imageUrl && filmDate && filmDateStr && (
        <div
          style={{
            position: "absolute",
            bottom: 6,
            right: 6,
            pointerEvents: "none",
            zIndex: 5,
          }}
        >
          <span
            style={{
              fontFamily: '"Courier New", Courier, monospace',
              fontStyle: "italic",
              fontWeight: "bold",
              fontSize: Math.max(8, Math.min(w, h) * 0.038),
              color: "rgba(253,232,200,0.85)",
              letterSpacing: "0.05em",
              lineHeight: 1.3,
              userSelect: "none",
            }}
          >
            {filmDateStr}
          </span>
        </div>
      )}
      {/* X button to clear slot - hidden during print/save */}
      {slot.imageUrl && (
        <button
          type="button"
          className="slot-clear-btn no-print absolute z-20 flex items-center justify-center rounded-full bg-black/70 text-white hover:bg-black/90 transition-opacity"
          style={{
            top: 4,
            right: 4,
            width: 22,
            height: 22,
            fontSize: 14,
            lineHeight: 1,
          }}
          onClick={(e) => {
            e.stopPropagation();
            onClear(idx);
          }}
          title="Remove photo"
          aria-label="Remove photo"
        >
          ×
        </button>
      )}
    </div>
  );
}

// ─── Text overlay item with pointer capture ───────────────────────────────────

function TextOverlayItem({
  t,
  onUpdate,
  onDelete,
}: {
  t: TextOverlay;
  onUpdate: (id: string, patch: Partial<TextOverlay>) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(t.text);
  const elRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    type: "move" | "resize" | "rotate";
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    originSize?: number;
    originRotation?: number;
    startAngle?: number;
    centerX?: number;
    centerY?: number;
  } | null>(null);

  const handlePointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (d.type === "move") {
      const parent = elRef.current?.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      onUpdate(t.id, {
        x: Math.max(0, Math.min(90, d.originX + (dx / rect.width) * 100)),
        y: Math.max(0, Math.min(90, d.originY + (dy / rect.height) * 100)),
      });
    } else if (d.type === "resize") {
      onUpdate(t.id, {
        fontSize: Math.max(8, Math.min(120, (d.originSize ?? 18) + dx / 2)),
      });
    } else if (d.type === "rotate") {
      const cur =
        Math.atan2(e.clientY - (d.centerY ?? 0), e.clientX - (d.centerX ?? 0)) *
        (180 / Math.PI);
      onUpdate(t.id, {
        rotation: (d.originRotation ?? 0) + cur - (d.startAngle ?? 0),
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    dragRef.current = null;
    try {
      elRef.current?.releasePointerCapture(e.pointerId);
    } catch {}
  };

  return (
    <div
      ref={elRef}
      className="group"
      style={{
        position: "absolute",
        left: `${t.x}%`,
        top: `${t.y}%`,
        zIndex: 20,
        cursor: "move",
        userSelect: "none",
        transform: `rotate(${t.rotation}deg)`,
        transformOrigin: "center center",
        touchAction: "none",
      }}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        elRef.current?.setPointerCapture(e.pointerId);
        dragRef.current = {
          type: "move",
          startX: e.clientX,
          startY: e.clientY,
          originX: t.x,
          originY: t.y,
        };
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Rotate handle – top center */}
      <div
        className="no-print absolute transition-opacity"
        style={{
          top: -22,
          left: "50%",
          transform: "translateX(-50%)",
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "white",
          border: "2px solid #6366f1",
          cursor: "crosshair",
          zIndex: 21,
          boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
        }}
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const el = elRef.current;
          if (!el) return;
          const rect = el.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          const startAngle =
            Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
          elRef.current?.setPointerCapture(e.pointerId);
          dragRef.current = {
            type: "rotate",
            startX: e.clientX,
            startY: e.clientY,
            originX: 0,
            originY: 0,
            originRotation: t.rotation,
            startAngle,
            centerX: cx,
            centerY: cy,
          };
        }}
      />
      {/* Connector line */}
      <div
        className="no-print absolute pointer-events-none"
        style={{
          top: -10,
          left: "50%",
          transform: "translateX(-50%)",
          width: 1,
          height: 10,
          background: "rgba(99,102,241,0.5)",
          zIndex: 20,
        }}
      />

      {/* Delete button */}
      <button
        type="button"
        className="no-print absolute opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          top: -12,
          right: -12,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#ef4444",
          color: "white",
          border: "none",
          cursor: "pointer",
          zIndex: 22,
          fontSize: 14,
          lineHeight: "20px",
          textAlign: "center",
          boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.stopPropagation();
          onDelete(t.id);
        }}
        title="삭제"
      >
        ×
      </button>

      {/* Text content */}
      {editing ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            alignItems: "flex-start",
          }}
        >
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <input
              ref={(el) => {
                if (el) setTimeout(() => el.focus(), 0);
              }}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => {
                onUpdate(t.id, { text: editValue });
                setEditing(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onUpdate(t.id, { text: editValue });
                  setEditing(false);
                }
                e.stopPropagation();
              }}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              style={{
                display: "inline-block",
                fontSize: t.fontSize,
                color: t.color,
                fontWeight: t.bold ? "bold" : "normal",
                fontStyle: t.italic ? "italic" : "normal",
                textDecoration: t.underline ? "underline" : "none",
                fontFamily: t.fontFamily || "sans-serif",
                whiteSpace: "nowrap",
                lineHeight: 1.2,
                padding: "2px 4px",
                background: "rgba(255,255,255,0.15)",
                border: "1px dashed rgba(99,102,241,0.8)",
                borderRadius: 2,
                outline: "none",
                minWidth: 40,
              }}
            />
            {/* Color picker swatch */}
            <label
              title="Text color"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              style={{
                position: "relative",
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: t.color,
                border: "2px solid rgba(255,255,255,0.8)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
                cursor: "pointer",
                flexShrink: 0,
                display: "inline-block",
              }}
            >
              <input
                type="color"
                value={t.color}
                onChange={(e) => {
                  onUpdate(t.id, { color: e.target.value });
                }}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                style={{
                  position: "absolute",
                  inset: 0,
                  opacity: 0,
                  width: "100%",
                  height: "100%",
                  cursor: "pointer",
                  border: "none",
                  padding: 0,
                }}
              />
            </label>
          </div>
        </div>
      ) : (
        // biome-ignore lint/a11y/useSemanticElements: text overlay click-to-edit needs inline display
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            setEditValue(t.text);
            setEditing(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              setEditValue(t.text);
              setEditing(true);
            }
          }}
          style={{
            display: "inline-block",
            fontSize: t.fontSize,
            color: t.color,
            fontWeight: t.bold ? "bold" : "normal",
            fontStyle: t.italic ? "italic" : "normal",
            textDecoration: t.underline ? "underline" : "none",
            fontFamily: t.fontFamily || "sans-serif",
            whiteSpace: "nowrap",
            textShadow: "0 1px 4px rgba(0,0,0,0.5)",
            lineHeight: 1.2,
            padding: "2px 4px",
            cursor: "text",
          }}
        >
          {t.text}
        </span>
      )}

      {/* Resize handle – bottom right */}
      <div
        className="no-print absolute"
        style={{
          bottom: -6,
          right: -6,
          width: 16,
          height: 16,
          background: "white",
          border: "2px solid #6366f1",
          borderRadius: 3,
          cursor: "se-resize",
          zIndex: 21,
          boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
        }}
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          elRef.current?.setPointerCapture(e.pointerId);
          dragRef.current = {
            type: "resize",
            startX: e.clientX,
            startY: e.clientY,
            originX: 0,
            originY: 0,
            originSize: t.fontSize,
          };
        }}
      />

      {/* Hover outline */}
      <div
        className="no-print absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{
          outline: "1.5px dashed rgba(99,102,241,0.6)",
          outlineOffset: 3,
          borderRadius: 2,
        }}
      />
    </div>
  );
}

// ─── Sticker overlay item with pointer capture ────────────────────────────────

function StickerOverlayItem({
  s,
  onUpdate,
  onDelete,
}: {
  s: StickerItem;
  onUpdate: (id: string, patch: Partial<StickerItem>) => void;
  onDelete: (id: string) => void;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    type: "move" | "resize" | "rotate";
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    originSize?: number;
    originRotation?: number;
    startAngle?: number;
    centerX?: number;
    centerY?: number;
  } | null>(null);

  const handlePointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (d.type === "move") {
      const parent = elRef.current?.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      onUpdate(s.id, {
        x: Math.max(0, Math.min(100, d.originX + (dx / rect.width) * 100)),
        y: Math.max(0, Math.min(100, d.originY + (dy / rect.height) * 100)),
      });
    } else if (d.type === "resize") {
      onUpdate(s.id, {
        size: Math.max(16, Math.min(120, (d.originSize ?? 32) + dx)),
      });
    } else if (d.type === "rotate") {
      const cur =
        Math.atan2(e.clientY - (d.centerY ?? 0), e.clientX - (d.centerX ?? 0)) *
        (180 / Math.PI);
      onUpdate(s.id, {
        rotation: (d.originRotation ?? 0) + cur - (d.startAngle ?? 0),
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    dragRef.current = null;
    try {
      elRef.current?.releasePointerCapture(e.pointerId);
    } catch {}
  };

  return (
    <div
      ref={elRef}
      className="group"
      style={{
        position: "absolute",
        left: `${s.x}%`,
        top: `${s.y}%`,
        zIndex: 20,
        cursor: "move",
        userSelect: "none",
        transform: `translate(-50%, -50%) rotate(${s.rotation}deg)`,
        transformOrigin: "center center",
        touchAction: "none",
      }}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        elRef.current?.setPointerCapture(e.pointerId);
        dragRef.current = {
          type: "move",
          startX: e.clientX,
          startY: e.clientY,
          originX: s.x,
          originY: s.y,
        };
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Rotate handle – top center */}
      <div
        className="no-print absolute transition-opacity"
        style={{
          top: -22,
          left: "50%",
          transform: "translateX(-50%)",
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "white",
          border: "2px solid #f59e0b",
          cursor: "crosshair",
          zIndex: 21,
          boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
        }}
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const el = elRef.current;
          if (!el) return;
          const rect = el.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          const startAngle =
            Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
          elRef.current?.setPointerCapture(e.pointerId);
          dragRef.current = {
            type: "rotate",
            startX: e.clientX,
            startY: e.clientY,
            originX: 0,
            originY: 0,
            originRotation: s.rotation,
            startAngle,
            centerX: cx,
            centerY: cy,
          };
        }}
      />
      {/* Connector */}
      <div
        className="no-print absolute pointer-events-none"
        style={{
          top: -10,
          left: "50%",
          transform: "translateX(-50%)",
          width: 1,
          height: 10,
          background: "rgba(245,158,11,0.5)",
          zIndex: 20,
        }}
      />

      {/* Delete button */}
      <button
        type="button"
        className="no-print absolute opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          top: -12,
          right: -12,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#ef4444",
          color: "white",
          border: "none",
          cursor: "pointer",
          zIndex: 22,
          fontSize: 14,
          lineHeight: "20px",
          textAlign: "center",
          boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.stopPropagation();
          onDelete(s.id);
        }}
        title="삭제"
      >
        ×
      </button>

      {/* Emoji */}
      <span
        style={{
          display: "inline-block",
          fontSize: s.size,
          lineHeight: 1,
          userSelect: "none",
        }}
      >
        {s.emoji}
      </span>

      {/* Resize handle – bottom right */}
      <div
        className="no-print absolute"
        style={{
          bottom: -6,
          right: -6,
          width: 16,
          height: 16,
          background: "white",
          border: "2px solid #f59e0b",
          borderRadius: 3,
          cursor: "se-resize",
          zIndex: 21,
          boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
        }}
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          elRef.current?.setPointerCapture(e.pointerId);
          dragRef.current = {
            type: "resize",
            startX: e.clientX,
            startY: e.clientY,
            originX: 0,
            originY: 0,
            originSize: s.size,
          };
        }}
      />

      {/* Hover outline */}
      <div
        className="no-print absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{
          outline: "1.5px dashed rgba(245,158,11,0.6)",
          outlineOffset: 3,
          borderRadius: 2,
        }}
      />
    </div>
  );
}
