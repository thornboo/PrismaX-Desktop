export * as desktopSchema from "./desktop/schema";
export * as webSchema from "./web/schema";

export type {
  DesktopAgentMemory,
  DesktopArchivalMemory,
  DesktopAssistant,
  DesktopConversation,
  DesktopFolder,
  DesktopMessage,
  DesktopNewAgentMemory,
  DesktopNewArchivalMemory,
  DesktopNewAssistant,
  DesktopNewConversation,
  DesktopNewFolder,
  DesktopNewMessage,
} from "./desktop/schema";

export type {
  WebAiProvider,
  WebConversation,
  WebMessage,
  WebNewAiProvider,
  WebNewConversation,
  WebNewMessage,
  WebNewUser,
  WebNewUserAiSetting,
  WebUser,
  WebUserAiSetting,
} from "./web/schema";
