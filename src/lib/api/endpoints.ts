export const API_ENDPOINTS = {
  home: "/",

  auth: {
    tokenRefresh: "/api/auth/token/refresh/",
    logout: "/api/auth/logout/",
    otpRequest: "/api/auth/otp/request/",
    otpVerify: "/api/auth/otp/verify/",
    register: "/api/auth/register/",
    profile: "/api/auth/profile/",
    passwordResetRequest: "/api/auth/password-reset/request/",
    passwordResetVerify: "/api/auth/password-reset/verify/",
    emailVerifyRequest: "/api/auth/email/verify-request/",
    emailVerifyConfirm: "/api/auth/email/verify-confirm/",
    sellerApply: "/api/auth/seller/apply/",
    sellerStatus: "/api/auth/seller/status/",
    sellerDashboard: "/api/auth/seller/dashboard/",
    sellerStore: "/api/auth/seller/store/",
  },

  rbac: {
    myPermissions: "/api/rbac/my-permissions/",
    checkPermission: "/api/rbac/check-permission/",
    roles: "/api/rbac/roles/",
    permissions: "/api/rbac/permissions/",
    userRoles: "/api/rbac/user-roles/",
  },

  content: {
    homepage: "/api/content/homepage/",
    pages: "/api/content/pages/",
    banners: "/api/content/banners/",
    announcements: "/api/content/announcements/",
    navigation: "/api/content/navigation/",
    faqs: "/api/content/faqs/",
  },

  products: {
    categories: "/api/products/categories/",
    brands: "/api/products/brands/",
    products: "/api/products/products/",
    wishlist: "/api/products/wishlist/",
    recentlyViewed: "/api/products/recently-viewed/",
  },

  orders: {
    cart: "/api/orders/cart/",
    cartAdd: "/api/orders/cart/add/",
    cartClear: "/api/orders/cart/clear/",
    cartItem: (itemId: number | string) => `/api/orders/cart/items/${itemId}/`,
    orders: "/api/orders/orders/",
    checkout: "/api/orders/orders/checkout/",
    orderCancel: (orderId: number | string) =>
      `/api/orders/orders/${orderId}/cancel/`,
  },

  analytics: {
    dashboard: "/api/analytics/dashboard/",
    timeseries: "/api/analytics/timeseries/",
    breakdown: "/api/analytics/breakdown/",
    alerts: "/api/analytics/alerts/",
    export: "/api/analytics/export/",
  },

  observability: {
    health: "/api/observability/health/",
    stats: "/api/observability/stats/",
    requestLogs: "/api/observability/request-logs/",
    errorLogs: "/api/observability/error-logs/",
    auditLogs: "/api/observability/audit-logs/",
    alerts: "/api/observability/alerts/",
  },
} as const;
