import { HashRouter, Routes, Route } from "react-router-dom";
import { Chat } from "./pages/Chat";
import { Knowledge } from "./pages/Knowledge";
import { Assistants } from "./pages/Assistants";
import { Plugins } from "./pages/Plugins";
import {
  SettingsLayout,
  GeneralSettings,
  ModelsSettings,
  ShortcutsSettings,
  DataSettings,
  AboutSettings,
} from "./pages/settings";
import { Layout } from "./components/layout/Layout";

function App() {
  return (
    // 使用 HashRouter 而非 BrowserRouter
    // 原因：Electron 生产环境使用 file:// 协议加载，BrowserRouter 会导致深链 404
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* 主页面 */}
          <Route index element={<Chat />} />
          <Route path="knowledge" element={<Knowledge />} />
          <Route path="assistants" element={<Assistants />} />
          <Route path="plugins" element={<Plugins />} />

          {/* 设置页面（嵌套路由） */}
          <Route path="settings" element={<SettingsLayout />}>
            <Route index element={<GeneralSettings />} />
            <Route path="models" element={<ModelsSettings />} />
            <Route path="shortcuts" element={<ShortcutsSettings />} />
            <Route path="data" element={<DataSettings />} />
            <Route path="about" element={<AboutSettings />} />
          </Route>
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;
