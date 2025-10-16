import GraphemeSplitter from "grapheme-splitter";
import { z } from "zod";

// Modes and phases
export type Mode = "NONE" | "LOVE" | "OGIRI" | "DECLARATION";
export type Phase = "LOBBY" | "MODE_SELECT" | "TOPIC_CREATION" | "READY" | "INPUT" | "REVEAL" | "DISCUSS" | "VOTE" | "JUDGE" | "RESULT";

export type Player = {
  id: string;
  nick: string; // display name (with suffix)
  iconId: number;
  connected: boolean;
};

export type Votes = Record<string, string | "NONE">;

export type RoundState = {
  prompt: string;
  submissions: Record<string, string>;
  revealedOwnerId?: string;
  revealedText?: string;
  votes: Votes;
  tally?: { topIds: string[]; counts: Record<string, number>; noneCount: number };
  lastRevealedOwnerId?: string;
  // 追加: サーバ配布のお題
  promptText?: string;
  promptId?: number;
  // 追加: REVEALで確定した公開テキスト（DISCUSS以降でも参照）
  secretText?: string;
  // 追加: 公開された秘密の持ち主
  secretOwner?: string;
  // 追加: DISCUSSメタ
  discuss?: {
    startedAt: number;
    endsAt: number;
    participantsAtStart: number;
    votesToEnd: Record<string, true>;
  };
  // 追加: チャット履歴
  chat?: Array<{
    id: string;
    playerId: string;
    message: string;
    timestamp: number;
  }>;
  // 追加: 議論終了投票
  discussEndVotes?: Record<string, boolean>;
  // 追加: REVEALフェーズでの確認完了
  revealConfirmations?: Record<string, boolean>;
};

export type RevealSchedule = {
  text: string;
  startAt: number;
  at1: number;
  at2: number;
  at3: number;
  endsAt: number;
};

export type RoomState = {
  roomId: string;
  mode: Mode;
  players: Player[];
  hostId?: string;
  phase: Phase;
  endsAt: number;
  round: RoundState;
  reveal?: RevealSchedule;
  roundId?: string;
  phaseSeq?: number;
  modeStamps?: Record<string, number>; // モードスタンプの集計
  playerVotes?: Record<string, Record<string, number>>; // プレイヤー個別の投票数
  isCustomMode?: boolean; // カスタムモードかどうか
  customTopics?: string[]; // カスタムお題リスト
  iconInUse?: number[]; // 使用中のアイコンID（配列形式）
  lastActivityAt?: number; // 最後のアクティビティ時刻
  createdAt?: number; // ルーム作成時刻
  isInitialized?: boolean; // ルームが初期化済みかどうか
};

export type BannerPlace = "TITLE" | "MENU" | "LOBBY" | "MODE_SELECT" | "READY" | "INPUT" | "DISCUSS" | "RESULT";

export const LIMITS = {
  secretMaxGraphemes: 20,
  nickMaxGraphemes: 8,
  chatMax: 120,
  reconnectWindowMs: 30000,
  modeSelectSec: 30,
  inputSec: 60,
  revealMs: 8000,
  discussPerPlayerSec: 15,
  voteSec: 15,
  judgeMs: 2000,
} as const;

export function graphemeLength(text: string): number {
  const splitter = new GraphemeSplitter();
  // NFC normalization then count grapheme clusters
  const nfc = text.normalize("NFC");
  return splitter.countGraphemes(nfc);
}

// Zod schemas matching docs
const roomIdZ = z.string().regex(/^[A-Z0-9]{6}$/);
export const ModeZ = z.enum(["NONE", "LOVE", "OGIRI", "DECLARATION", "STRANGER"]);
export const PhaseZ = z.enum(["LOBBY", "MODE_SELECT", "TOPIC_CREATION", "READY", "INPUT", "REVEAL", "DISCUSS", "VOTE", "JUDGE", "RESULT"]);

const Nick = z.string().min(1).max(64); // graphemeLength<=8 is enforced outside
const Text20 = z.string().min(1).max(200); // graphemeLength<=20/NFC external
const Chat120 = z.string().min(1).max(600); // graphemeLength<=120/NFC external

// Client -> Server
export const C_join = z.object({ t: z.literal("join"), p: z.object({ roomId: roomIdZ, nick: Nick, installId: z.string().min(8) }) });
export const C_auto = z.object({ t: z.literal("auto"), p: z.object({ mode: ModeZ, nick: Nick, installId: z.string().min(8) }) });
export const C_start = z.object({ t: z.literal("start"), p: z.object({}) });
export const C_modeStamp = z.object({ t: z.literal("modeStamp"), p: z.object({ mode: ModeZ }) });
export const C_selectMode = z.object({ t: z.literal("selectMode"), p: z.object({ mode: ModeZ }) });
export const C_submitSecret = z.object({ t: z.literal("submitSecret"), p: z.object({ text: Text20 }) });
export const C_endDiscuss = z.object({ t: z.literal("endDiscuss"), p: z.object({}) });
export const C_vote = z.object({ t: z.literal("vote"), p: z.object({ targetId: z.union([z.literal("NONE"), z.string().min(1)]) }) });
export const C_chat = z.object({ t: z.literal("chat"), p: z.object({ text: Chat120 }) });
export const C_rematch = z.object({ t: z.literal("rematch"), p: z.object({}) });
export const C_endGame = z.object({ t: z.literal("endGame"), p: z.object({}) });
export const C_exitGame = z.object({ t: z.literal("exitGame"), p: z.object({}) });
export const C_leave = z.object({ t: z.literal("leave"), p: z.object({}) });
export const C_disband = z.object({ t: z.literal("disband"), p: z.object({}) });
export const C_ping = z.object({ t: z.literal("ping"), p: z.number() });
export const C_pageHidden = z.object({ t: z.literal("pageHidden"), p: z.object({ timestamp: z.number(), reason: z.string() }) });
export const C_pageVisible = z.object({ t: z.literal("pageVisible"), p: z.object({ timestamp: z.number(), reason: z.string() }) });
export const C_appBackground = z.object({ t: z.literal("appBackground"), p: z.object({ timestamp: z.number() }) });
export const C_appForeground = z.object({ t: z.literal("appForeground"), p: z.object({ timestamp: z.number() }) });
export const C_phaseChange = z.object({ t: z.literal("phaseChange"), p: z.object({ phase: z.string() }) });
export const C2S = z.discriminatedUnion("t", [C_join, C_auto, C_start, C_modeStamp, C_selectMode, C_submitSecret, C_endDiscuss, C_vote, C_chat, C_rematch, C_endGame, C_exitGame, C_leave, C_disband, C_ping, C_pageHidden, C_pageVisible, C_appBackground, C_appForeground, C_phaseChange]);

// Server -> Client
export const PlayerZ = z.object({ 
  id: z.string(), 
  nick: z.string(), 
  iconId: z.number().int(), 
  connected: z.boolean(),
  left: z.boolean().optional(),
  disconnectedAt: z.number().optional()
});
export const RevealZ = z.object({ text: z.string(), startAt: z.number(), at1: z.number(), at2: z.number(), at3: z.number(), endsAt: z.number() });
export const RoomStateZ = z.object({
  roomId: roomIdZ,
  mode: ModeZ,
  players: z.array(PlayerZ),
  hostId: z.string().optional(),
  phase: PhaseZ,
  endsAt: z.number(),
  round: z.object({
    prompt: z.string(),
    submissions: z.record(z.string(), z.string()),
    revealedOwnerId: z.string().optional(),
    revealedText: z.string().optional(),
    votes: z.record(z.string(), z.union([z.literal("NONE"), z.string()])),
    tally: z.object({ topIds: z.array(z.string()), counts: z.record(z.string(), z.number().int().nonnegative()), noneCount: z.number().int().nonnegative() }).optional(),
    lastRevealedOwnerId: z.string().optional(),
    promptText: z.string().optional(),
    promptId: z.number().int().optional(),
    secretText: z.string().optional(),
    secretOwner: z.string().optional(),
    discuss: z.object({
      startedAt: z.number(),
      endsAt: z.number(),
      participantsAtStart: z.number().int().nonnegative(),
      votesToEnd: z.record(z.string(), z.literal(true)),
    }).optional(),
    chat: z.array(z.object({
      id: z.string(),
      playerId: z.string(),
      message: z.string(),
      timestamp: z.number(),
    })).optional(),
    discussEndVotes: z.record(z.string(), z.boolean()).optional(),
    revealConfirmations: z.record(z.string(), z.boolean()).optional(),
  }),
  reveal: RevealZ.optional(),
  roundId: z.string().optional(),
  phaseSeq: z.number().int().optional(),
  modeStamps: z.record(z.string(), z.number().int().nonnegative()).optional(),
  isCustomMode: z.boolean().optional(),
  customTopics: z.array(z.string()).optional(),
  isInitialized: z.boolean().optional(),
});
export const S_state = z.object({ t: z.literal("state"), p: RoomStateZ });
export const S_phase = z.object({ t: z.literal("phase"), p: z.object({ phase: PhaseZ, endsAt: z.number(), roundId: z.string(), phaseSeq: z.number().int().positive() }) });
export const S_chat = z.object({ t: z.literal("chat"), p: z.object({ id: z.string(), senderId: z.string(), nick: z.string(), iconId: z.number().int(), text: z.string(), ts: z.number(), shadow: z.boolean().optional() }) });
export const S_modeStamp = z.object({ t: z.literal("modeStamp"), p: z.object({ playerId: z.string(), playerNick: z.string(), mode: ModeZ, modeStamps: z.record(z.string(), z.number().int().nonnegative()) }) });
export const S_rematch = z.object({ t: z.literal("rematch"), p: z.object({ choice: z.literal("rematch") }) });
export const S_endGame = z.object({ t: z.literal("endGame"), p: z.object({ choice: z.literal("end") }) });
export const S_abort = z.object({ t: z.literal("abort"), p: z.object({ reason: z.enum(["not_enough_players", "disbanded", "disband_timeout", "host_left", "host_disconnected", "end", "players_lt_3", "player_disconnected", "game_ended"]) }) });
export const S_disband = z.object({ t: z.literal("disband"), p: z.object({ by: z.string() }) });
export const S_warn = z.object({ t: z.literal("warn"), p: z.object({ code: z.enum(["INVALID_OP", "NOT_IN_PHASE", "ROOM_NOT_FOUND", "BAD_ROOM_ID", "NICK_REQUIRED", "ALREADY_SUBMITTED", "SELF_VOTE_FORBIDDEN", "NOT_HOST", "CHAT_DISABLED", "RATE_LIMIT", "TARGET_NOT_FOUND", "ROOM_CLOSED", "ROOM_FULL"]), msg: z.string().optional() }) });
export const S_pong = z.object({ t: z.literal("pong"), p: z.number() });
export const S2C = z.discriminatedUnion("t", [S_state, S_phase, S_chat, S_modeStamp, S_rematch, S_endGame, S_abort, S_disband, S_warn, S_pong]); 