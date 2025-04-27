import React, { createContext, useState, useEffect, useContext } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Language = "en" | "zh";
type Translations = {
  [key: string]: { en: string; zh: string };
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, any>) => string;
}

const translations: Translations = {
  title: { en: "Sticker Chart", zh: "贴纸榜" },
  viewAllStickers: { en: "View All Stickers", zh: "查看所有贴纸" },
  achievements: { en: "Achievements", zh: "成就" },
  newAchievementType: { en: "New Achievement Type", zh: "新建成就类型" },
  changeCode: { en: "Change Code", zh: "更改密码" },
  noEventTypes: { en: "No achievement types yet.", zh: "暂无成就类型。" },
  addNewEventType: { en: "Add New Achievement Type", zh: "添加新成就类型" },
  namePlaceholder: { en: "Name (max 20 chars, any visible)", zh: "名称（最多20个字符，任意可见）" },
  selectIcon: { en: "Select Icon", zh: "选择图标" },
  selectColor: { en: "Select Icon Color", zh: "选择图标颜色" },
  selectAvailability: { en: "Select Max Times per Day (0 means no limits)", zh: "选择每日最大次数（0表示不受限制）" },
  cancel: { en: "Cancel", zh: "取消" },
  confirm: { en: "Confirm", zh: "确认" },
  add: { en: "Add", zh: "添加" },
  calendarViewAll: { en: "All Stickers", zh: "所有贴纸" },
  achievementDetails: { en: "Achievement Details", zh: "成就详情" },
  achievement: { en: "Achievement", zh: "成就" },
  date: { en: "Date", zh: "日期" },
  gotAt: { en: "Got At", zh: "获得时间" },
  for: { en: "For", zh: "缘由" },
  noAchievement: { en: "No achievement on", zh: "无成就于" },
  noDateSelected: { en: "No date selected", zh: "未选择日期" },
  codePlaceholder: { en: "4-digit code", zh: "4位密码" },
  notePlaceholder: { en: "Add a reason (optional)", zh: "添加缘由（可选）" },
  takePhoto: { en: "Take Photo", zh: "拍摄照片" },
  uploadPhoto: { en: "Upload Photo", zh: "上传照片" },
  verify: { en: "Verify", zh: "认证" },
  editIconColor: { en: "Edit Icon and Color", zh: "编辑图标和颜色" },
  save: { en: "Save", zh: "保存" },
  permissionDeniedGallery: { en: "Permission Denied: Please grant gallery access to upload photos.", zh: "权限拒绝：请授予图库访问权限以上传照片。" },
  permissionDeniedCamera: { en: "Permission Denied: Please grant camera access to take photos.", zh: "权限拒绝：请授予相机访问权限以拍摄照片。" },
  errorInitCalendar: { en: "Failed to initialize calendar.", zh: "无法初始化日历。" },
  errorMarkEvent: { en: "Failed to Give a Sticker", zh: "无法给予贴纸" },
  errorProcessImage: { en: "Failed to process image.", zh: "无法处理图像。" },
  errorIncorrectCode: { en: "Incorrect verification code.", zh: "认证密码不正确。" },
  errorUpdateIconColor: { en: "Failed to update icon and color.", zh: "无法更新图标和颜色。" },
  filters: { en: "Filters", zh: "筛选" },
  filterEvents: { en: "Filter Events", zh: "筛选成就" },
  selectFilters: { en: "Select Filters", zh: "选择筛选" },
  done: { en: "Done", zh: "完成" },
  type: { en: "Type", zh: "类型" },
  achievementsOn: { en: "Achievements on", zh: "成就于" },
  noEventsFor: { en: "No achievements for", zh: "无成就于" },
  changeVerificationCode: { en: "Change User Code", zh: "更改用户密码" },
  enterOldCode: { en: "Enter old 4-digit code", zh: "输入旧的4位密码" },
  enterNewCode: { en: "Enter new 4-digit code", zh: "输入新的4位密码" },
  confirmNewCode: { en: "Confirm new 4-digit code", zh: "确认新的4位密码" },
  errorIncorrectOldCode: { en: "Incorrect old code.", zh: "旧密码不正确。" },
  errorInvalidNewCode: { en: "New code must be 4 digits.", zh: "新密码必须为4位数字。" },
  errorCodesDoNotMatch: { en: "New codes do not match.", zh: "新密码不匹配。" },
  errorUpdateCode: { en: "Failed to update code.", zh: "无法更新密码。" },
  successUpdateCode: { en: "Verification code updated.", zh: "认证密码已更新。" },
  enterVerificationCode: { en: "Enter Your Password", zh: "输入你的密码" },
  errorAddEventType: { en: "Failed to add achievement type", zh: "添加成就类型失败" },
  setAdminCode: { en: "Set Admin Password", zh: "设置管理员密码" },
  errorInvalidCode: { en: "Please enter a 4-digit code", zh: "请输入4位数字密码" },
  errorCodeMismatch: { en: "Codes do not match", zh: "密码不匹配" },
  errorSaveCode: { en: "Failed to save code", zh: "保存密码失败" },
  userProfile: { en: "User Profile", zh: "用户资料" },
  changeIcon: { en: "Change Icon", zh: "更改图标" },
  switchUser: { en: "Switch User", zh: "切换用户" },
  changePassword: { en: "Change Password", zh: "修改密码" },
  createUser: { en: "Create User", zh: "新建用户" },
  editUser: { en: "Edit User", zh: "编辑用户" },
  errorPermissionDenied: { en: "Permission denied", zh: "权限被拒绝" },
  errorUpdateIcon: { en: "Failed to update icon", zh: "更新图标失败" },
  errorInvalidUserInput: { en: "Invalid input", zh: "无效输入" },
  errorCreateUser: { en: "Failed to create user", zh: "创建用户失败" },
  errorUpdateUser: { en: "Failed to update user", zh: "更新用户失败" },
  userNamePlaceholder: { en: "Enter user name", zh: "输入用户名" },
  errorAdminOnly: { en: "Admin only", zh: "仅限管理员" },
  exitApp: { en: "Exit App", zh: "退出应用" },
  errorCloseDatabase: { en: "Failed to close database", zh: "关闭数据库失败" },
  login: { en: "Login", zh: "登录" },
  deleteUser: { en: "Delete User", zh: "删除用户" },
  resetPassword: { en: "Reset Password", zh: "重置密码" },
  cannotDeleteUser: { en: "Cannot delete user with associated event types", zh: "无法删除拥有关联事件类型的用户" },
  modifyPassword: { en: "Modify Password", zh: "修改密码" },
  selectImagePermission: { en: "Permission to access photos required", zh: "需要访问照片的权限" },
  invalidPassword: { en: "Invalid password", zh: "密码无效" },
  userList: { en: "User List", zh: "用户列表" },
  errorInitialize: { en: "Failed to initialize app", zh: "初始化应用失败" },
  adminOnly: { en: "This action is for admins only", zh: "此操作仅限管理员" },
  errorEmptyUsername: { en: "Username cannot be empty", zh: "用户名不能为空" },
  errorResetPassword: { en: "Failed to reset password", zh: "重置密码失败" },
  errorDeleteUser: { en: "Failed to delete user", zh: "删除用户失败" },
  errorSetPassword: { en: "Failed to set password", zh: "设置密码失败" },
  setAdminPassword: { en: "Set Admin Password", zh: "设置管理员密码" },
  verifyAdminForEdit: { en: "Enter Your Password to Edit User", zh: "输入您的密码以编辑用户" },
  verifyAdminForAddEventType: { en: "Enter Your Password to Add Event Type", zh: "输入您的密码以添加事件类型" },
  selectUserToEdit: { en: "Select User to Edit", zh: "选择要编辑的用户" },
  errorEmptyEventTypeName: { en: "Event type name cannot be empty", zh: "事件类型名称不能为空" },
  successAddEventType: { en: "Event type added successfully", zh: "事件类型添加成功" },
  selectOwner: { en: "Select Owner", zh: "选择拥有者" },
  noOrdinaryUsers: { en: "No ordinary users available", zh: "没有可用的普通用户" },
  errorNoOwnerSelected: { en: "Please select an owner", zh: "请选择一个拥有者" },
  selectOwnerSubtitle: { en: "Select an ordinary user to own this event type", zh: "选择一个普通用户作为此事件类型的拥有者" },
  selectUserRolePrompt: {
    en: "Select the user's role: Admin has full access, User has limited access",
    zh: "选择用户角色：管理员拥有全部权限，用户拥有有限权限"
  },
  initialPassword: { en: "Initial Password", zh: "初始密码" },
  passwordPlaceholder: { en: "Enter 4-digit password (default: 0000)", zh: "输入4位密码（默认：0000）" },
  errorInvalidPassword: { en: "Password must be a 4-digit number", zh: "密码必须为4位数字" },
  successCreateUser: { en: "User created successfully", zh: "用户创建成功" },
  askSticker: { en: "Ask for a Sticker", zh: "要一个贴纸" },
  createdBy: { en: "Created By", zh: "创建者" },
  isVerified: { en: "Verified", zh: "已认证" },
  yes: { en: "Yes", zh: "是" },
  no: { en: "No", zh: "否" },
  delete: { en: "Delete", zh: "删除" },
  verifyDelete: { en: "Verify to Delete Event", zh: "认证以删除事件" },
  verifyEvent: { en: "Verify Event", zh: "认证事件" },
  eventDeleted: { en: "Event deleted successfully", zh: "事件删除成功" },
  eventVerified: { en: "Event verified successfully", zh: "事件认证成功" },
  errorDeleteEvent: { en: "Failed to delete event", zh: "删除事件失败" },
  errorVerifyEvent: { en: "Failed to verify event", zh: "认证事件失败" },
  noCurrentUser: { en: "No current user", zh: "无当前用户" },
  verified: { en: "Verified", zh: "已认证" },
  verifyDeleteEvent: { en: "Verify to Delete Event", zh: "认证以删除事件" },
  unknown: { en: "Unknown", zh: "未知" },
  creators: { en: "Creators", zh: "创建者" },
  verificationStatus: { en: "Verification Status", zh: "认证状态" },
  all: { en: "All", zh: "全部" },
  unverified: { en: "Unverified", zh: "未认证" },
  allTypes: { en: "All Types", zh: "所有类型" },
  allCreators: { en: "All Creators", zh: "所有创建者" },
  none: { en: "None", zh: "无" },
  errorInit: { en: "Failed to initialize", zh: "初始化失败" },
  faceValue: { en: "Face Value", zh: "面值" },
  giveSticker:{ en: "Give a Sticker", zh: "给一个贴纸"},
  maxAchievements: {
    en: "Maximum achievements for one day: {availability}",
    zh: "每日可得最大成就数: {availability}",
  },
  unlimited: { en: "Unlimited", zh: "无限制"},
  verifiedAt: { en: "Verified At", zh: "认证时间" },
  verifiedBy: { en: "Verified By", zh: "认证人" },
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

  const t = (key: string, params: Record<string, any> = {}): string => {
    let translation = translations[key]?.[language] || key;
    Object.keys(params).forEach((param) => {
      translation = translation.replace(`{${param}}`, params[param]);
    });
    return translation;
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