import React, { createContext, useState, useEffect, useContext } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Language = "en" | "zh";
type Translations = {
  [key: string]: { en: string; zh: string };
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Translations = {
  switchToChinese: { en: "Switch to Chinese", zh: "切换到中文" },
  switchToEnglish: { en: "Switch to English", zh: "切换到英文" },
  title: { en: "Sticker Chart", zh: "贴纸榜" },
  viewAllStickers: { en: "View All Stickers", zh: "查看所有贴纸" },
  achievements: { en: "Achievements", zh: "成就" },
  newAchievementType: { en: "New Achievement Type", zh: "新建成就类型" },
  changeCode: { en: "Change Code", zh: "更改密钥" },
  noEventTypes: { en: "No achievement types yet.", zh: "暂无成就类型。" },
  addNewEventType: { en: "Add New Achievement Type", zh: "添加新成就类型" },
  namePlaceholder: { en: "Name (max 20 chars, any visible)", zh: "名称（最多20个字符，任意可见）" },
  selectIcon: { en: "Select Icon", zh: "选择图标" },
  selectColor: { en: "Select Icon Color", zh: "选择图标颜色" },
  selectAvailability: { en: "Select Max Times per Day (0 means no limits)", zh: "选择每日最大次数（0表示不受限制）" },
  cancel: { en: "Cancel", zh: "取消" },
  add: { en: "Add", zh: "添加" },
  calendarViewAll: { en: "All Stickers", zh: "所有贴纸" },
  achievementDetails: { en: "Achievement Details", zh: "成就详情" },
  achievement: { en: "Achievement", zh: "成就" },
  date: { en: "Date", zh: "日期" },
  gotAt: { en: "Got At", zh: "获得时间" },
  for: { en: "For", zh: "缘由" },
  noAchievement: { en: "No achievement on", zh: "无成就于" },
  noDateSelected: { en: "No date selected", zh: "未选择日期" },
  giveSticker: { en: "Give a Sticker", zh: "给一个贴纸" },
  codePlaceholder: { en: "4-digit code", zh: "4位密钥" },
  notePlaceholder: { en: "Add a reason (optional)", zh: "添加缘由（可选）" },
  takePhoto: { en: "Take Photo", zh: "拍摄照片" },
  uploadPhoto: { en: "Upload Photo", zh: "上传照片" },
  verify: { en: "Verify", zh: "验证" },
  editIconColor: { en: "Edit Icon and Color", zh: "编辑图标和颜色" },
  save: { en: "Save", zh: "保存" },
  permissionDeniedGallery: { en: "Permission Denied: Please grant gallery access to upload photos.", zh: "权限拒绝：请授予图库访问权限以上传照片。" },
  permissionDeniedCamera: { en: "Permission Denied: Please grant camera access to take photos.", zh: "权限拒绝：请授予相机访问权限以拍摄照片。" },
  errorInitCalendar: { en: "Failed to initialize calendar.", zh: "无法初始化日历。" },
  errorMarkEvent: { en: "Failed to Give a Sticker", zh: "无法给予贴纸" },
  errorProcessImage: { en: "Failed to process image.", zh: "无法处理图像。" },
  errorIncorrectCode: { en: "Incorrect verification code.", zh: "验证密钥不正确。" },
  errorUpdateIconColor: { en: "Failed to update icon and color.", zh: "无法更新图标和颜色。" },
  filters: { en: "Filters", zh: "筛选" },
  filterEvents: { en: "Filter Events", zh: "筛选成就" },
  selectFilters: { en: "Select Filters", zh: "选择筛选" },
  done: { en: "Done", zh: "完成" },
  type: { en: "Type", zh: "类型" },
  achievementsOn: { en: "Achievements on", zh: "成就于" },
  noEventsFor: { en: "No achievements for", zh: "无成就于" },
  changeVerificationCode: { en: "Change Verification Code", zh: "更改验证密钥" },
  enterOldCode: { en: "Enter old 4-digit code", zh: "输入旧的4位密钥" },
  enterNewCode: { en: "Enter new 4-digit code", zh: "输入新的4位密钥" },
  confirmNewCode: { en: "Confirm new 4-digit code", zh: "确认新的4位密钥" },
  errorIncorrectOldCode: { en: "Incorrect old code.", zh: "旧密钥不正确。" },
  errorInvalidNewCode: { en: "New code must be 4 digits.", zh: "新密钥必须为4位数字。" },
  errorCodesDoNotMatch: { en: "New codes do not match.", zh: "新密钥不匹配。" },
  errorUpdateCode: { en: "Failed to update code.", zh: "无法更新密钥。" },
  successUpdateCode: { en: "Verification code updated.", zh: "验证密钥已更新。" },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>("en");

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem("appLanguage");
        if (savedLanguage === "en" || savedLanguage === "zh") {
          setLanguage(savedLanguage);
        }
      } catch (error) {
        console.error("Error loading language:", error);
      }
    };
    loadLanguage();
  }, []);

  const handleSetLanguage = async (lang: Language) => {
    setLanguage(lang);
    try {
      await AsyncStorage.setItem("appLanguage", lang);
    } catch (error) {
      console.error("Error saving language:", error);
    }
  };

  const t = (key: string): string => {
    return translations[key]?.[language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};