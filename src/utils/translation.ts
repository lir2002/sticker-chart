import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSystemLanguage } from "../utils/langUtils";

type Language = "en" | "zh" | "auto";
type Translations = {
  [key: string]: { en: string; zh: string };
};

export const translations: Translations = {
  title: { en: "Sticker Chart", zh: "贴纸榜" },
  viewAllStickers: { en: "View All Stickers", zh: "查看所有贴纸" },
  achievements: { en: "Achievements", zh: "成就" },
  newAchievementType: { en: "New Achievement Type", zh: "新建成就类型" },
  changeCode: { en: "Change Code", zh: "更改密码" },
  noEventTypes: { en: "No achievement types yet.", zh: "暂无成就类型。" },
  addNewEventType: { en: "Add New Achievement Type", zh: "添加新成就类型" },
  namePlaceholder: {
    en: "Name (max 20 chars, any visible)",
    zh: "名称（最多20个字符，任意可见）",
  },
  selectIcon: { en: "Select Icon", zh: "选择图标" },
  selectColor: { en: "Select Icon Color", zh: "选择图标颜色" },
  selectAvailability: {
    en: "Select Max Times per Day (0 means no limits)",
    zh: "选择每日最大次数（0表示不受限制）",
  },
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
  permissionDeniedGallery: {
    en: "Permission Denied: Please grant gallery access to upload photos.",
    zh: "权限拒绝：请授予图库访问权限以上传照片。",
  },
  permissionDeniedCamera: {
    en: "Permission Denied: Please grant camera access to take photos.",
    zh: "权限拒绝：请授予相机访问权限以拍摄照片。",
  },
  errorInitCalendar: {
    en: "Failed to initialize calendar.",
    zh: "无法初始化日历。",
  },
  errorMarkEvent: { en: "Failed to Give a Sticker", zh: "无法给予贴纸" },
  errorProcessImage: { en: "Failed to process image.", zh: "无法处理图像。" },
  errorIncorrectCode: {
    en: "Incorrect verification code.",
    zh: "认证密码不正确。",
  },
  errorUpdateIconColor: {
    en: "Failed to update icon and color.",
    zh: "无法更新图标和颜色。",
  },
  filters: { en: "Filters", zh: "筛选" },
  filterEvents: { en: "Filter Achievements", zh: "筛选成就" },
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
  errorInvalidNewCode: {
    en: "New code must be 4 digits.",
    zh: "新密码必须为4位数字。",
  },
  errorCodesDoNotMatch: { en: "New codes do not match.", zh: "新密码不匹配。" },
  errorUpdateCode: { en: "Failed to update code.", zh: "无法更新密码。" },
  successUpdateCode: {
    en: "Verification code updated.",
    zh: "认证密码已更新。",
  },
  enterVerificationCode: { en: "Enter Your Password", zh: "输入你的密码" },
  errorAddEventType: {
    en: "Failed to add achievement type",
    zh: "添加成就类型失败",
  },
  setAdminCode: { en: "Set Admin Password", zh: "设置管理员密码" },
  errorInvalidCode: {
    en: "Please enter a 4-digit code",
    zh: "请输入4位数字密码",
  },
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
  exitApp: { en: "Exit App", zh: "退出应用" },
  errorCloseDatabase: { en: "Failed to close database", zh: "关闭数据库失败" },
  login: { en: "Login", zh: "登录" },
  deleteUser: { en: "Delete User", zh: "删除用户" },
  resetPassword: { en: "Reset Password", zh: "重置密码" },
  cannotDeleteUser: {
    en: "Cannot delete user with associated achievement types",
    zh: "无法删除拥有关联成就类型的用户",
  },
  modifyPassword: { en: "Modify Password", zh: "修改密码" },
  selectImagePermission: {
    en: "Permission to access photos required",
    zh: "需要访问照片的权限",
  },
  invalidPassword: { en: "Invalid password", zh: "密码无效" },
  userList: { en: "User List", zh: "用户列表" },
  errorInitialize: { en: "Failed to initialize app", zh: "初始化应用失败" },
  adminOnly: { en: "This action is for admins only", zh: "此操作仅限管理员" },
  errorEmptyUsername: { en: "Username cannot be empty", zh: "用户名不能为空" },
  errorResetPassword: { en: "Failed to reset password", zh: "重置密码失败" },
  errorDeleteUser: { en: "Failed to delete user", zh: "删除用户失败" },
  errorSetPassword: { en: "Failed to set password", zh: "设置密码失败" },
  setAdminPassword: { en: "Set Admin Password", zh: "设置管理员密码" },
  verifyAdminForEdit: {
    en: "Enter Your Password to Edit User",
    zh: "输入您的密码以编辑用户",
  },
  verifyAdminForAddEventType: {
    en: "Enter Your Password to Add Achievement Type",
    zh: "输入您的密码以添加成就类型",
  },
  selectUserToEdit: { en: "Select User to Edit", zh: "选择要编辑的用户" },
  errorEmptyEventTypeName: {
    en: "Achievement type name cannot be empty",
    zh: "成就类型名称不能为空",
  },
  successAddEventType: {
    en: "Achievement type added successfully",
    zh: "成就类型添加成功",
  },
  selectOwner: { en: "Select Owner", zh: "选择拥有者" },
  noOrdinaryUsers: {
    en: "No ordinary users available",
    zh: "没有可用的普通用户",
  },
  errorNoOwnerSelected: {
    en: "Please select an owner",
    zh: "请选择一个拥有者",
  },
  selectOwnerSubtitle: {
    en: "Select an ordinary user to own this achievement type",
    zh: "选择一个普通用户作为此成就类型的拥有者",
  },
  selectUserRolePrompt: {
    en: "Select the user's role: Admin has full access, User has limited access",
    zh: "选择用户角色：管理员拥有全部权限，用户拥有有限权限",
  },
  initialPassword: { en: "Initial Password", zh: "初始密码" },
  passwordPlaceholder: {
    en: "Enter 4-digit password (default: 0000)",
    zh: "输入4位密码（默认：0000）",
  },
  errorInvalidPassword: {
    en: "Password must be a 4-digit number",
    zh: "密码必须为4位数字",
  },
  successCreateUser: { en: "User created successfully", zh: "用户创建成功" },
  askSticker: { en: "Ask for a Sticker", zh: "要一个贴纸" },
  createdBy: { en: "Created By", zh: "创建者" },
  isVerified: { en: "Verified", zh: "已认证" },
  yes: { en: "Yes", zh: "是" },
  no: { en: "No", zh: "否" },
  delete: { en: "Delete", zh: "删除" },
  verifyEvent: { en: "Verify Achievement", zh: "认证成就" },
  eventDeleted: { en: "Achievement deleted successfully", zh: "成就删除成功" },
  eventVerified: {
    en: "Achievement verified successfully",
    zh: "成就认证成功",
  },
  errorDeleteEvent: { en: "Failed to delete achievement", zh: "删除成就失败" },
  errorVerifyEvent: { en: "Failed to verify achievement", zh: "认证成就失败" },
  noCurrentUser: { en: "No current user", zh: "无当前用户" },
  verified: { en: "Verified", zh: "已认证" },
  verifyDeleteEvent: {
    en: "Verify to Delete",
    zh: "认证以删除成就",
  },
  unknown: { en: "Unknown", zh: "未知" },
  owner: { en: "Owner", zh: "所有人" },
  owners: { en: "Owners", zh: "所有者" },
  verificationStatus: { en: "Verification Status", zh: "认证状态" },
  all: { en: "All", zh: "全部" },
  unverified: { en: "Unverified", zh: "未认证" },
  allTypes: { en: "All Types", zh: "全部类型" },
  allOwners: { en: "All Owners", zh: "全部所有者" },
  none: { en: "None", zh: "无" },
  errorInit: { en: "Failed to initialize", zh: "初始化失败" },
  faceValue: { en: "Face Value", zh: "面值" },
  giveSticker: { en: "Give a Sticker", zh: "给一个贴纸" },
  maxAchievements: {
    en: "Maximum achievements per day: {availability}",
    zh: "每日可得最大成就数: {availability}",
  },
  unlimited: { en: "Unlimited", zh: "无限制" },
  verifiedAt: { en: "Verified At", zh: "认证时间" },
  verifiedBy: { en: "Verified By", zh: "认证人" },
  passwordReset: { en: "Reset Password", zh: "重置密码" },
  success: { en: "Success", zh: "成功" },
  backupData: { en: "Backup Data", zh: "备份数据" },
  restoreData: { en: "Restore Data", zh: "恢复数据" },
  backup: { en: "Backup", zh: "备份" },
  backupComplete: { en: "Backup completed at: ", zh: "备份完成，路径： " },
  errorBackup: { en: "Failed to backup data", zh: "备份数据失败" },
  restore: { en: "Restore", zh: "恢复" },
  restoreComplete: { en: "Data restored successfully", zh: "数据恢复成功" },
  errorRestore: { en: "Failed to restore data", zh: "恢复数据失败" },
  selectBackupFile: {
    en: "Please select a backup file",
    zh: "请选择一个备份文件",
  },
  noBackupFiles: { en: "No backup files found", zh: "未找到备份文件" },
  errorLoadBackups: {
    en: "Failed to load backup files",
    zh: "加载备份文件失败",
  },
  errorSelectDirectory: {
    en: "Failed to select directory",
    zh: "选择目录失败",
  },
  deleteBackups: { en: "Delete Backups", zh: "删除备份" },
  selectBackups: { en: "Select backups to delete", zh: "选择要删除的备份" },
  confirmDelete: { en: "Confirm Delete", zh: "确认删除" },
  noBackups: { en: "No backups found", zh: "未找到备份" },
  restartApp: {
    en: "Please restart the app to load the restored data",
    zh: "请重启应用以加载恢复的数据",
  },
  info: { en: "Information", zh: "信息" },
  deleteSuccess: { en: "Selected backups deleted", zh: "已删除选中的备份" },
  deleteError: { en: "Failed to delete backups", zh: "删除备份失败" },
  upload: { en: "Upload", zh: "上传" },
  uploadBackup: { en: "Upload Backup", zh: "上传备份" },
  selectBackup: { en: "Select a backup", zh: "选择一个备份" },
  uploadError: { en: "Failed to upload backup", zh: "上传备份失败" },
  download: { en: "Download", zh: "下载" },
  downloadBackup: { en: "Download Backup", zh: "下载备份" },
  downloadComplete: {
    en: "Backup downloaded successfully",
    zh: "备份下载成功",
  },
  errorDownload: { en: "Failed to download backup", zh: "下载备份失败" },
  selectZipFile: {
    en: "Select a .zip file from cloud storage",
    zh: "从云存储中选择一个 .zip 文件",
  },
  pickFile: { en: "Pick File", zh: "选择文件" },
  filePickCanceled: { en: "File selection canceled", zh: "文件选择已取消" },
  error: { en: "Error", zh: "错误" },
  unknownError: { en: "Unknown error occurred", zh: "发生未知错误" },
  contactInfo: { en: "Contact Info", zh: "联系方式" },
  emailPlaceholder: { en: "Enter email", zh: "输入邮箱" },
  phonePlaceholder: { en: "Enter phone", zh: "输入电话" },
  edit: { en: "Edit", zh: "编辑" },
  contactUpdated: { en: "Contact info updated", zh: "联系方式已更新" },
  errorUpdateContact: {
    en: "Failed to update contact info",
    zh: "更新联系方式失败",
  },
  assets: { en: "Assets", zh: "资产" },
  credit: { en: "Credit", zh: "信用" },
  noWalletData: { en: "No wallet data available", zh: "无钱包数据" },
  transactionHistory: { en: "Transaction History", zh: "交易记录" },
  noTransactions: { en: "No transactions found", zh: "未找到交易记录" },
  reason: { en: "Reason", zh: "原因" },
  amount: { en: "Amount", zh: "金额" },
  counterparty: { en: "Counterparty", zh: "交易对象" },
  timestamp: { en: "Timestamp", zh: "时间" },
  balance: { en: "Balance", zh: "余额" },
  transactionReasonAdminVerify: {
    en: "Verified achievement '{eventType}' created at {markedAt}",
    zh: "验证了创建于 {markedAt} 的 '{eventType}' 成就",
  },
  transactionReasonOwnerReward: {
    en: "Received verification for achievement '{eventType}' created at {markedAt}",
    zh: "获得创建于 {markedAt} 的 '{eventType}' 成就的验证奖励",
  },
  insufficientCredit: {
    en: "Insufficient credit to verify the achievement.",
    zh: "点数不足，无法验证该成就。",
  },
  eventTypeNotFound: {
    en: "Achievement type not found.",
    zh: "未找到成就类型。",
  },
  ownerWalletNotFound: {
    en: "Achievement type owner's wallet not found.",
    zh: "成就类型所有者的钱包未找到。",
  },
  eventNotFound: {
    en: "Achievement not found.",
    zh: "未找到成就。",
  },
  verifyConfirmation: {
    en: "Verification will consume {faceValue} asset(s). Do you want to continue?",
    zh: "验证将消耗{faceValue}个币。是否继续？",
  },
  transactionReasonVerify: {
    en: "Verified achievement '{eventType}' created at {createdAt}",
    zh: "验证了于{createdAt}创建的「{eventType}」成就",
  },
  transactionReasonReceive: {
    en: "Received verification for achievement '{eventType}' created at {createdAt}",
    zh: "获得于{createdAt}创建的「{eventType}」成就的验证",
  },
  achievementTypes: { en: "Achievement Types", zh: "成就类型" },
  claimDailyAllowance: { en: "Claim Daily Allowance", zh: "领取津贴" },
  dailyAllowance: { en: "Daily Allowance", zh: "每日津贴" },
  dailyAllowanceClaimed: {
    en: "Daily allowance claimed successfully",
    zh: "每日津贴领取成功",
  },
  errorClaimDaily: {
    en: "Failed to claim daily allowance",
    zh: "领取每日津贴失败",
  },
  errorLoadData: { en: "Failed to load data", zh: "加载数据失败" },
  confirmCodePlaceholder: { en: "Confirm 4-digit code", zh: "请确定4位数密码" },
  setCode: { en: "Set Admin Password", zh: "设置管理员密码" },
  eventTypeOptions: { en: "Achievement Type Options", zh: "成就类型选项" },
  update: { en: "Update", zh: "更新" },
  updateEventType: { en: "Update Achievement Type", zh: "更新成就类型" },
  successUpdateEventType: {
    en: "Achievement type updated successfully",
    zh: "成就类型更新成功",
  },
  successDeleteEventType: {
    en: "Achievement type deleted successfully",
    zh: "成就类型删除成功",
  },
  errorUpdateEventType: {
    en: "Failed to update achievement type",
    zh: "更新成就类型失败",
  },
  errorDeleteEventType: {
    en: "Failed to delete achievement type",
    zh: "删除成就类型失败",
  },
  errorCheckEvents: {
    en: "Failed to check associated achievements",
    zh: "检查关联成就失败",
  },
  cannotDeleteEventTypeWithEvents: {
    en: "Cannot delete achievement type with associated achievements",
    zh: "无法删除有关联成就的成就类型",
  },
  verifyAdminForDeleteEventType: {
    en: "Enter Admin Password to Delete",
    zh: "输入管理员密码以删除",
  },
  verifyAdminForUpdateEventType: {
    en: "Enter Admin Password to Update",
    zh: "输入管理员密码以更新",
  },
  expirationDate: { en: "Expiration Date", zh: "到期日期" },
  noExpiration: { en: "No Expiration", zh: "无到期日期" },
  selectDate: { en: "Select Date", zh: "选择日期" },
  clear: { en: "Clear", zh: "清除" },
  errorExpirationDateBeforeToday: {
    en: "Expiration date cannot be before today",
    zh: "到期日期不能早于今天",
  },
  activityNotStarted: { en: "Activity has not started", zh: "活动尚未开始" },
  activityEnded: { en: "Activity has ended", zh: "活动已结束" },
  filterTypes: { en: "Filter", zh: "过滤" },
  noMatchingAchievements: {
    en: "No matching achievements",
    zh: "没有匹配的成就",
  },
  clearFilter: { en: "Clear filter", zh: "清除过滤" },
  selectUsers: { en: "Select users", zh: "选择用户" },
  noUsers: { en: "No users available", zh: "没有可用用户" },
  close: { en: "Close", zh: "关闭" },
  filterUsers: { en: "Filter Users", zh: "过滤用户" },
  filterIcons: { en: "Filter Icons", zh: "过滤图标（英文）" },
  nextStep: { en: "Next >>", zh: "下一步 >>" },
  prevStep: { en: "<< Back", zh: "<< 上一步" },
  selectImageAndCameraPermission: {
    en: "Camera and gallery permissions are required.",
    zh: "需要相机和图库权限。",
  },
  cameraPermission: {
    en: "Camera permission is required.",
    zh: "需要相机权限。",
  },
  selectImageSource: { en: "Select an image source", zh: "选择图片来源" },
  chooseFromGallery: { en: "Choose from Gallery", zh: "从图库选择" },
  iconUpdated: { en: "Profile icon updated successfully", zh: "头像更新成功" },
  tools: { en: "Tools", zh: "工具" },
  services: { en: "Services", zh: "服务" },
  createItem: { en: "Create Item", zh: "创建商品" },
  updateItem: { en: "Update Item", zh: "更新商品" },
  price: { en: "Price", zh: "价格" },
  quantity: { en: "Quantity", zh: "数量" },
  manageProducts: { en: "Manage Items", zh: "管理商品" },
  browseStore: { en: "Browse Store", zh: "逛商店" },
  publish: { en: "Publish", zh: "发布" },
  status: { en: "Status", zh: "状态" },
  published: { en: "Published", zh: "已发布" },
  unpublished: { en: "Unpublished", zh: "未发布" },
  searchProducts: { en: "Search products", zh: "搜索商品" },
  sortBy: { en: "Sort by", zh: "排序方式" },
  nameAsc: { en: "Name (A-Z)", zh: "名称 (A-Z)" },
  nameDesc: { en: "Name (Z-A)", zh: "名称 (Z-A)" },
  priceAsc: { en: "Price (Low to High)", zh: "价格 (低到高)" },
  priceDesc: { en: "Price (High to Low)", zh: "价格 (高到低)" },
  createdAsc: { en: "Created (Oldest First)", zh: "创建时间 (最早优先)" },
  createdDesc: { en: "Created (Newest First)", zh: "创建时间 (最新优先)" },
  creator: { en: "Creator", zh: "创建者" },
  allCreators: { en: "All Creators", zh: "所有创建者" },
  noProducts: { en: "No products found", zh: "未找到商品" },
  errorFetchProducts: { en: "Failed to fetch products", zh: "获取商品失败" },
  preview: { en: "Preview", zh: "预览" },
  previewProduct: { en: "Preview Item", zh: "预览商品" },
  noDescription: { en: "No description", zh: "无描述" },
  noImages: { en: "No images", zh: "无图片" },
  buy: { en: "Buy", zh: "购买" },
  buyNotImplemented: {
    en: "Buy functionality not implemented yet",
    zh: "购买功能尚未实现",
  },
  closeImage: { en: "Close image", zh: "关闭图片" },
  imageLoadFailed: { en: "Failed to load image", zh: "图片加载失败" },
  fullScreenProductImage: {
    en: "Product image {index}",
    zh: "商品图片 {index}",
  },
  errorDeleteImage: {
    en: "Failed to delete image",
    zh: "删除图片失败",
  },
  errorCleanupImages: {
    en: "Failed to clean up unsaved images",
    zh: "清理未保存图片失败",
  },
  unsavedChanges: {
    en: "Unsaved Changes",
    zh: "未保存的更改",
  },
  saveBeforeExit: {
    en: "Do you want to save your changes before exiting?",
    zh: "您想在退出前保存更改吗？",
  },
  discard: { en: "Discard", zh: "丢弃" },
  addImage: { en: "Add Image", zh: "添加图片" },
  productNamePlaceholder: { en: "Enter product name", zh: "输入商品名称" },
  productDescriptionPlaceholder: {
    en: "Enter product description",
    zh: "输入商品描述",
  },
  errorEmptyName: {
    en: "Product name cannot be empty",
    zh: "商品名称不能为空",
  },
  errorNameTooLong: {
    en: "Product name must not exceed 20 characters",
    zh: "商品名称不得超过20个字符",
  },
  errorDescriptionTooLong: {
    en: "Description must not exceed 200 characters",
    zh: "描述不得超过200个字符",
  },
  errorInvalidPrice: {
    en: "Price must be between 1 and 100",
    zh: "价格必须在1到100之间",
  },
  errorInvalidQuantity: {
    en: "Quantity must be a non-negative number",
    zh: "数量必须是非负数",
  },
  errorZeroQuantityForPublish: {
    en: "Quantity must be greater than 0 to publish",
    zh: "发布时数量必须大于0",
  },
  errorSaveProduct: { en: "Failed to save product", zh: "保存商品失败" },
  errorFetchProduct: { en: "Failed to fetch product", zh: "获取商品失败" },
  quantityExceedsAvailable: {
    en: "Quantity exceeds available stock",
    zh: "数量超过可用库存",
  },
  maxImagesReached: { en: "Maximum 4 images allowed", zh: "最多允许4张图片" },
  imageSizeExceeds200KB: {
    en: "Image size must not exceed 200KB",
    zh: "图片大小不得超过200KB",
  },
  notLoggedIn: {
    en: "You must be logged in first",
    zh: "您必须先登录",
  },
  successCreateProduct: {
    en: "Product created successfully",
    zh: "商品创建成功",
  },
  successUpdateProduct: {
    en: "Product updated successfully",
    zh: "商品更新成功",
  },
  productDetails: { en: "Product Details", zh: "商品详情" },
  confirmDeleteMessage: {
    en: "Are you sure you want to delete '{productName}'?",
    zh: "您确定要删除[{productName}]吗？",
  },
  deleteSuccessful: { en: "Product deleted successfully", zh: "产品删除成功" },
  deleteFailed: { en: "Failed to delete product", zh: "删除产品失败" },

  verifyCode: { en: "Verify Your Code", zh: "验证您的代码" },
  confirmPurchase: { en: "Confirm Purchase", zh: "确认购买" },
  confirmPurchaseMessage: {
    en: "You will pay ${total} for {quantity} x {productName}",
    zh: "您将为{quantity}个{productName}支付${total}",
  },
  invalidProduct: { en: "Invalid product", zh: "无效商品" },
  productNotFound: { en: "Product not found", zh: "找不到商品" },
  cannotPurchaseOwnProduct: {
    en: "Cannot purchase your own product",
    zh: "不能购买自己的产品",
  },
  creatorWalletNotFound: {
    en: "Creator's wallet not found",
    zh: "找不到创建者的钱包",
  },
  purchaseFailed: { en: "Purchase failed", zh: "购买失败" },
  purchaseSuccessful: {
    en: "Successfully purchased {productName}",
    zh: "成功购买{productName}",
  },
  myOrders: { en: "My Orders", zh: "我的订单" },
  searchOrders: { en: "Search Orders", zh: "搜索订单" },
  productNameAsc: { en: "Product Name (A-Z)", zh: "商品名称（A-Z）" },
  productNameDesc: { en: "Product Name (Z-A)", zh: "商品名称（Z-A）" },
  fulfilledAtAsc: {
    en: "Fulfilled Date (Oldest First)",
    zh: "履约日期（最早优先）",
  },
  fulfilledAtDesc: {
    en: "Fulfilled Date (Newest First)",
    zh: "履约日期（最新优先）",
  },
  allOrders: { en: "All Orders", zh: "全部订单" },
  fulfilled: { en: "Fulfilled", zh: "已履约" },
  unfulfilled: { en: "Unfulfilled", zh: "未履约" },
  allFulfillers: { en: "All Fulfillers", zh: "所有履约人" },
  noOrders: { en: "No orders found", zh: "未找到订单" },
  fulfilledBy: { en: "Fulfilled By", zh: "履约人" },
  canceledBy: { en: "Canceled By", zh: "取消人" },
  unknownProduct: { en: "Unknown Product", zh: "未知商品" },
  orderDetails: { en: "Order Details", zh: "订单详情" },
  orderNumber: { en: "Order Number", zh: "订单编号" },
  canceled: { en: "Canceled", zh: "已取消" },
  total: { en: "Total", zh: "总计" },
  createdAt: { en: "Created At", zh: "创建时间" },
  fulfilledAt: { en: "Fulfilled At", zh: "履约时间" },
  canceledAt: { en: "Canceled At", zh: "取消时间" },
  description: { en: "Description", zh: "描述" },
  fulfill: { en: "Fulfill", zh: "履约" },
  orderFulfilled: { en: "Order has been fulfilled", zh: "订单已履约" },
  orderCanceled: {
    en: "Order has been canceled, and amount is refunded",
    zh: "订单已取消，金额已退回",
  },
  errorFetchOrder: { en: "Failed to fetch order", zh: "无法获取订单" },
  orderNotFound: { en: "Order not found", zh: "订单未找到" },
  errorFulfillOrder: { en: "Failed to fulfill order", zh: "无法履约订单" },
  errorCancelOrder: { en: "Failed to cancel order", zh: "无法取消订单" },
  unauthorizedCancel: {
    en: "You are not authorized to cancel this order",
    zh: "您无权取消此订单",
  },
  buyerWalletNotFound: { en: "Buyer wallet not found", zh: "买家钱包未找到" },
  refundFor: {
    en: "Refund for {quantity} x {productName}. Product ID: {productId}, Unit price: {unitPrice}. Order Number: {oid}",
    zh: "退款为 {quantity} x {productName}。商品编号：{productId}，单价：{unitPrice}，订单号：{oid}",
  },
  deductionForRefund: {
    en: "Deduction for refund {quantity} x {productName}. Product ID: {productId}, Unit price: {unitPrice}. Order Number: {oid}",
    zh: "退款扣除 {quantity} x {productName}。商品编号：{productId}，单价：{unitPrice}，订单号：{oid}",
  },
  manageOrders: { en: "Manage Orders", zh: "管理订单" },
  confirmCancelTitle: {
    en: "Confirm Cancellation",
    zh: "确认取消",
  },
  confirmCancelMessage: {
    en: "Are you sure you want to cancel this order? The amount: {amount} will be refunded.",
    zh: "您确定要取消此订单吗？金额: {amount}将会退还。",
  },
  productNumber: { en: "Product ID", zh: "商品编号" },
  purchased: {
    en: "Purchased {quantity} x {productName}. Product ID: {productId}, Unit price: {unitPrice}. Order Number: {oid}",
    zh: "购得 {quantity} x {productName}。商品编号：{productId}，单价：{unitPrice}，订单号：{oid}",
  },
  sold: {
    en: "Sold {quantity} x {productName}. Product ID: {productId}, Unit price: {unitPrice}. Order Number: {oid}",
    zh: "卖出 {quantity} x {productName}。商品编号：{productId}，单价：{unitPrice}，订单号：{oid}",
  },
};

let currentLanguage: Language = "en"; // Default language

// Initialize language from AsyncStorage
export const initLanguage = async () => {
  try {
    const savedLanguage = await AsyncStorage.getItem("appLanguage");
    if (
      savedLanguage === "en" ||
      savedLanguage === "zh" ||
      savedLanguage === "auto"
    ) {
      currentLanguage = savedLanguage;
    }
  } catch (error) {
    console.error("Error loading language:", error);
  }
};

// Set language and save to AsyncStorage
export const setLanguage = async (lang: Language) => {
  currentLanguage = lang;
  try {
    await AsyncStorage.setItem("appLanguage", lang);
  } catch (error) {
    console.error("Error saving language:", error);
  }
};

// Get the effective language
export const getEffectiveLanguage = (): "en" | "zh" => {
  return currentLanguage === "auto" ? getSystemLanguage() : currentLanguage;
};

// Translation function
export const t = (key: string, params: Record<string, any> = {}): string => {
  const effectiveLanguage = getEffectiveLanguage();
  let translation = translations[key]?.[effectiveLanguage] || key;
  Object.keys(params).forEach((param) => {
    translation = translation.replace(`{${param}}`, params[param]);
  });
  return translation;
};

// Initialize language on app start
initLanguage();
