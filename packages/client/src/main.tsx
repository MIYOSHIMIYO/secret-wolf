import React from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./pages/App";
import Title from "./pages/Title";
import Menu from "./pages/Menu";
import Lobby from "./pages/Lobby";
import Input from "./pages/Input";
import Reveal from "./pages/Reveal";
import Discuss from "./pages/Discuss";
import Vote from "./pages/Vote";
import Judge from "./pages/Judge";
import Result from "./pages/Result";
import Nick from "./pages/Nick";
import Rules from "./routes/Rules";
import AutoWait from "./pages/AutoWait";
import RoomCreate from "./pages/RoomCreate";
import ModeSelect from "./pages/ModeSelect";
import Topics from "./pages/Topics";
import About from "./pages/About";
import Terms from "./pages/Terms";
import Payment from "./pages/Payment";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancel from "./pages/PaymentCancel";
import Legal from "./pages/Legal";
import ValidationTest from "./pages/ValidationTest";
import CustomTopicCreation from "./pages/CustomTopicCreation";
import CustomRoomCreate from "./pages/CustomRoomCreate";
import CustomLobby from "./pages/CustomLobby";
import { AppTrackingTransparencyService } from "./plugins/AppTrackingTransparency";
import { initializePWA } from "./utils/pwa";
import "./styles.css";
import "./styles/viewport-scale.css";


const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Title /> },
      { path: "menu", element: <Menu /> },
      { path: "room-create", element: <RoomCreate /> },
      { path: "lobby/:id", element: <Lobby /> },
      { path: "mode-select", element: <ModeSelect /> },
      { path: "auto", element: <AutoWait /> },
      { path: "auto-wait", element: <AutoWait /> },
      { path: "custom", element: <CustomTopicCreation /> },
      { path: "custom-room-create", element: <CustomRoomCreate /> },
      { path: "custom-lobby/:id", element: <CustomLobby /> },
      { path: "input", element: <Input /> },
      { path: "reveal", element: <Reveal /> },
      { path: "discuss", element: <Discuss /> },
      { path: "vote", element: <Vote /> },
      { path: "judge", element: <Judge /> },
      { path: "result", element: <Result /> },
      { path: "nick", element: <Nick /> },
      { path: "rules", element: <Rules /> },
      { path: "about", element: <About /> },
      { path: "terms", element: <Terms /> },
      { path: "topics", element: <Topics /> },
      { path: "payment", element: <Payment /> },
      { path: "payment-success", element: <PaymentSuccess /> },
      { path: "payment-cancel", element: <PaymentCancel /> },
      { path: "legal", element: <Legal /> },
      { path: "validation-test", element: <ValidationTest /> },
    ],
  },
]);
// アプリを即座に起動（初期化は非同期で実行）
const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error('[Main] Root element not found');
  throw new Error('Root element not found');
}

// アプリを即座にレンダリング
createRoot(rootElement).render(<RouterProvider router={router} />);

// 初期化は非同期で実行（アプリの起動をブロックしない）
setTimeout(async () => {
  try {
    console.log('[Main] Starting service initialization...');
    const results = await Promise.allSettled([
      AppTrackingTransparencyService.requestTrackingPermission(),
      initializePWA()
    ]);
    
    results.forEach((result, index) => {
      const serviceNames = ['AppTrackingTransparency', 'PWA'];
      if (result.status === 'rejected') {
        console.error(`[Main] Service ${serviceNames[index]} initialization failed:`, result.reason);
      } else {
        console.log(`[Main] Service ${serviceNames[index]} initialized successfully`);
      }
    });
  } catch (error) {
    console.error('[Main] Service initialization error:', error);
  }
}, 100); // 100ms後に初期化を開始 