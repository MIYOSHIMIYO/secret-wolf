import { Link, useNavigate } from "react-router-dom";
import { useAppStore } from "@/state/store";
import { useReportStore, checkAndResetDaily } from "@/state/reportStore";
import { useEffect, useState } from "react";
import { syncReportStatus } from "@/lib/reportApi";
import Screen from "@/components/Screen";
import HeaderBar from "@/components/HeaderBar";
import Panel from "@/components/Panel";
import { PrimaryBtn } from "@/components/Buttons";
import { resetRoomState } from "@/lib/roomUtils";

// 画像のインポート
import friendsImage from "@/assets/menulogo/friends_play2.png";
import unknownImage from "@/assets/menulogo/strangers_play2.png";
import supportImage from "@/assets/menulogo/enjoy_support2.png";
import aboutImage from "@/assets/menulogo/seisan_face2.png";
import nicknameImage from "@/assets/menulogo/set_nickname2.png";
import rulesImage from "@/assets/menulogo/check_rules2.png";

export default function Menu() {
  const reset = useAppStore((s) => s.reset);
  const nav = useNavigate();
  const { isLocked, lockUntil } = useReportStore();
  const [showLockDialog, setShowLockDialog] = useState(false);

  // 日次リセットチェックと通報ステータス同期
  useEffect(() => {
    try {
      checkAndResetDaily();
      // 通報ステータス同期は非同期で実行し、エラーを無視
      syncReportStatus().catch((error) => {
        console.warn("通報ステータス同期をスキップしました:", error);
      });
    } catch (error) {
      console.error("初期化エラー:", error);
    }
  }, []);

  // はじめるボタンクリック時の処理
  const handleStart = async (type: string) => {
    // ロック状態チェック
    if (isLocked) {
      setShowLockDialog(true);
      return;
    }

    try {
      // ルーム状態をリセット（非同期でソケットクローズを待機）
      await resetRoomState();
      console.log("[Menu] ルーム状態をリセット完了");

            if (type === "custom") {
              // カスタムモードの場合は専用のルーム作成シーンに遷移
              nav("/custom-room-create");
            } else {
              // 知り合いと遊ぶの場合はルーム作成画面に遷移
              nav("/room-create");
            }
    } catch (error) {
      console.error("[Menu] 状態リセットエラー:", error);
      // エラーが発生してもゲーム開始を試行
      reset();
      if (type === "custom") {
        nav("/custom-room-create");
      } else {
        nav("/room-create");
      }
    }
  };

  // ロック解除時刻のフォーマット
  const formatLockUntil = (timestamp: number | null) => {
    if (!timestamp) return "";

    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${year}/${month}/${day} ${hours}:${minutes}`;
  };

  return (
    <Screen innerClassName="xl:px-10" fullBleed={true} maxWidth={9999}>
      <div className="h-full overflow-y-auto xl:overflow-visible px-2 sm:px-3 md:px-4 xl:px-0 pt-2 sm:pt-3 md:pt-4 xl:pt-0 pb-2 flex flex-col">
        <HeaderBar title="メニュー" center />

        {/* メインゲームオプション（画像ベース） */}
        <div className="menu-scale flex flex-col px-scale-1 sm:px-2 md:px-3 xl:px-6 pt-scale-0 sm:pt-1 md:pt-2 xl:pt-8 xl:transform-none xl:mx-auto xl:w-full xl:max-w-none xl:space-y-8 pb-20 sm:pb-24 md:pb-28 xl:pb-8">
          {/* タブレット・モバイル用2列レイアウト */}
          <div className="xl:hidden">
            {/* 上部：カスタムして遊ぶ（紫）と知り合いと遊ぶ（青） */}
            <div className="flex mb-scale-1 sm:mb-2 md:mb-2">
              {/* 左列：カスタムして遊ぶ（紫）- 40% */}
              <div className="w-[40%] pr-scale-4 sm:pr-6 md:pr-7 pt-scale-1 sm:pt-2 md:pt-2">
                <button
                  onClick={() => handleStart("custom")}
                  className="w-full h-auto active:scale-[0.98] transition-transform"
                >
                  <img
                    src={unknownImage}
                    alt="カスタムして遊ぶ"
                    className="w-full md:w-[95%] mx-0 md:mx-auto h-auto rounded-scale-2xl shadow-lg max-h-[180px] sm:max-h-[220px] md:max-h-[300px] object-contain"
                  />
                </button>
              </div>

              {/* 右列：知り合いと遊ぶ（青）- 60% */}
              <div className="w-[60%] pl-scale-4 sm:pl-6 md:pl-7 pt-scale-0 sm:pt-0 md:pt-0">
                <button
                  onClick={() => handleStart("friends")}
                  className="w-full h-auto active:scale-[0.98] transition-transform"
                >
                  <img
                    src={friendsImage}
                    alt="知り合いと遊ぶ"
                    className="w-full md:w-[100%] mx-0 md:mx-auto h-auto rounded-scale-2xl shadow-lg max-h-[220px] sm:max-h-[250px] md:max-h-[320px] lg:max-h-[350px] xl:max-h-[380px] object-contain"
                  />
                </button>
              </div>
            </div>

            {/* 中部：応援（60）と作者について（40） */}
            <div className="flex mb-scale-1 sm:mb-2 md:mb-2">
              {/* 左列：応援 60% */}
              <div className="w-[60%] pr-scale-4 sm:pr-6 md:pr-7 pt-scale-0 sm:pt-0 md:pt-0">
                <Link to="/payment" className="block w-full">
                  <img
                    src={supportImage}
                    alt="楽しめたら応援"
                    className="w-full md:w-[70%] mx-0 md:mx-auto h-auto rounded-scale-2xl shadow-lg active:scale-[0.98] transition-transform"
                  />
                </Link>
              </div>

              {/* 右列：作者について 40% */}
              <div className="w-[40%] pl-scale-4 sm:pl-6 md:pl-7 pt-scale-1 sm:pt-2 md:pt-2">
                <Link to="/about" className="block w-full">
                  <img
                    src={aboutImage}
                    alt="作者について"
                    className="w-full md:w-[75%] mx-0 md:mx-auto h-auto rounded-scale-2xl shadow-lg active:scale-[0.98] transition-transform"
                  />
                </Link>
              </div>
            </div>

            {/* 下部：ニックネーム（40）とルール（60） */}
            <div className="flex -mt-scale-4 sm:-mt-6 md:-mt-6 mb-scale-4 sm:mb-6 md:mb-7">
              {/* 左列：ニックネーム 40% */}
              <div className="w-[40%] pr-scale-4 sm:pr-6 md:pr-7 pt-scale-0 sm:pt-0 md:pt-0">
                <Link to="/nick" className="block w-full">
                  <img
                    src={nicknameImage}
                    alt="ニックネームを決めないと"
                    className="w-full md:w-[75%] mx-0 md:mx-auto h-auto rounded-scale-2xl shadow-lg active:scale-[0.98] transition-transform"
                  />
                </Link>
              </div>

              {/* 右列：ルール 60% */}
              <div className="w-[60%] pl-scale-4 sm:pl-6 md:pl-7 pt-scale-0 sm:pt-0 md:pt-0">
                <Link to="/rules" className="block w-full">
                  <img
                    src={rulesImage}
                    alt="ルールを確認だ"
                    className="w-full md:w-[70%] mx-0 md:mx-auto h-auto rounded-scale-2xl shadow-lg active:scale-[0.98] transition-transform"
                  />
                </Link>
              </div>
            </div>
          </div>

          {/* デスクトップ用3×2グリッドレイアウト */}
          <div className="hidden xl:grid xl:grid-cols-3 xl:gap-6 xl:items-center">
            {/* 1列目：カスタムして遊ぶ */}
            <div className="w-full">
              <button
                onClick={() => handleStart("custom")}
                className="w-full h-auto active:scale-[0.98] transition-transform"
              >
                <img
                  src={unknownImage}
                  alt="カスタムして遊ぶ"
                  className="w-full h-auto rounded-scale-2xl shadow-lg xl:max-h-[350px] object-contain"
                />
              </button>
            </div>

            {/* 2列目：知り合いと遊ぶ */}
            <div className="w-full">
              <button
                onClick={() => handleStart("friends")}
                className="w-full h-auto active:scale-[0.98] transition-transform"
              >
                <img
                  src={friendsImage}
                  alt="知り合いと遊ぶ"
                  className="w-[100%] sm:w-[100%] md:w-full h-auto rounded-scale-2xl shadow-lg max-h-[220px] sm:max-h-[250px] md:max-h-[320px] lg:max-h-[350px] xl:max-h-[380px] object-contain mx-auto"
                />
              </button>
            </div>

            {/* 3列目：応援 */}
            <div className="w-full">
              <Link to="/payment" className="block w-full">
                <img
                  src={supportImage}
                  alt="楽しめたら応援"
                  className="w-full h-auto rounded-scale-2xl shadow-lg active:scale-[0.98] transition-transform xl:max-h-[200px] object-contain"
                />
              </Link>
            </div>

            {/* 4列目：作者について */}
            <div className="w-full">
              <Link to="/about" className="block w-full">
                <img
                  src={aboutImage}
                  alt="作者について"
                  className="w-full h-auto rounded-scale-2xl shadow-lg active:scale-[0.98] transition-transform xl:max-h-[200px] object-contain"
                />
              </Link>
            </div>

            {/* 5列目：ニックネーム */}
            <div className="w-full">
              <Link to="/nick" className="block w-full">
                <img
                  src={nicknameImage}
                  alt="ニックネームを決めないと"
                  className="w-full h-auto rounded-scale-2xl shadow-lg active:scale-[0.98] transition-transform xl:max-h-[200px] object-contain"
                />
              </Link>
            </div>

            {/* 6列目：ルール */}
            <div className="w-full">
              <Link to="/rules" className="block w-full">
                <img
                  src={rulesImage}
                  alt="ルールを確認だ"
                  className="w-full h-auto rounded-scale-2xl shadow-lg active:scale-[0.98] transition-transform xl:max-h-[200px] object-contain"
                />
              </Link>
            </div>
          </div>
          {/* 利用規約ボタン（下段の直下に配置） */}
          <div className="px-scale-1 sm:px-2 md:px-3 xl:px-6 mt-scale-1 sm:mt-2 md:mt-2 xl:mt-6">
            <Link to="/terms" className="block w-full">
              <div className="h-scale-6 sm:h-7 md:h-8 xl:h-14 xl:h-16 rounded-scale-xl sm:rounded-xl md:rounded-xl xl:rounded-2xl xl:rounded-2xl text-gray-100 font-semibold text-center flex items-center justify-center active:scale-[0.98] transition-transform shadow-lg px-scale-2 sm:px-2 md:px-3 xl:px-5 xl:px-6"
                   style={{ background: "linear-gradient(135deg, rgba(31,41,55,.9), rgba(75,85,99,.8), rgba(31,41,55,.9))" }}>
                <div className="text-scale-xs sm:text-[12px] md:text-[13px] xl:text-sm xl:text-base leading-tight">利用規約</div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* ロックダイアログ */}
      {showLockDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-2xl p-6 max-w-sm mx-4 ring-1 ring-white/10 shadow-2xl">
            <div className="text-center space-y-4">
              <div className="text-white text-lg font-medium">
                プレイ制限中
              </div>
              <div className="text-white/70 text-sm leading-relaxed">
                通報ポイントが上限（65ポイント）に達しました。本日のプレイはできません。
              </div>
              <div className="text-white/60 text-xs space-y-1">
                <div>通報ポイント：{isLocked ? "65+" : "0"} / 65</div>
                {lockUntil && (
                  <div>解除予定：{formatLockUntil(lockUntil)}（JST）</div>
                )}
              </div>
              <button
                onClick={() => setShowLockDialog(false)}
                className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-xl font-semibold transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </Screen>
  );
}
