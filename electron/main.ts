import path from "node:path";
import { app, BrowserWindow, dialog, Tray, Menu, nativeImage } from "electron";
import { registerIpcHandlers } from "./ipc";
import { initDatabase, closeDatabase } from "./db";

// 开发服务器端口 - 与 vite.config.ts 保持一致
const DEV_SERVER_PORT = 3000;

// 开发环境使用 Vite 开发服务器，生产环境加载打包后的文件
const isDev = process.env.NODE_ENV !== "production";
const rendererUrl = isDev ? `http://localhost:${DEV_SERVER_PORT}` : undefined;

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 16 },
    show: false,
  });

  // 窗口准备好后再显示，避免白屏
  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  // 加载页面
  if (rendererUrl) {
    void mainWindow.loadURL(rendererUrl);
    // 开发环境打开 DevTools
    mainWindow.webContents.openDevTools();
  } else {
    void mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  // 关闭窗口时隐藏到托盘而不是退出
  mainWindow.on("close", (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function createTray() {
  // 创建托盘图标（使用默认图标，后续可替换为自定义图标）
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "显示窗口",
      click: () => {
        mainWindow?.show();
      },
    },
    {
      label: "新建会话",
      click: () => {
        mainWindow?.show();
        mainWindow?.webContents.send("new-conversation");
      },
    },
    { type: "separator" },
    {
      label: "检查更新",
      click: () => {
        // TODO: 实现检查更新
      },
    },
    {
      label: "设置",
      click: () => {
        mainWindow?.show();
        mainWindow?.webContents.send("open-settings");
      },
    },
    { type: "separator" },
    {
      label: "退出",
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip("PrismaX-Desktop");
  tray.setContextMenu(contextMenu);

  // 点击托盘图标显示/隐藏窗口
  tray.on("click", () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow?.show();
    }
  });
}

// 扩展 app 类型以支持 isQuitting 属性
declare module "electron" {
  interface App {
    isQuitting?: boolean;
  }
}

app.whenReady().then(() => {
  try {
    // 初始化数据库（必须在注册 IPC handlers 前完成）
    initDatabase();

    // 注册 IPC handlers
    registerIpcHandlers();

    createMainWindow();
    createTray();
  } catch (error) {
    const message = error instanceof Error ? error.message : "主进程初始化失败（未知错误）";
    dialog.showErrorBox(
      "PrismaX-Desktop 启动失败",
      `${message}\n\n如果是 better-sqlite3 ABI 不匹配，请执行：pnpm rebuild:native`,
    );
    app.quit();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    } else {
      mainWindow?.show();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// 退出前清理
app.on("before-quit", () => {
  app.isQuitting = true;
  // 关闭数据库连接
  closeDatabase();
});
