// Public paths that don't require authentication
export const PUBLIC_PATHS = [
  '/',
  '/blog',
  '/sign-in',
  '/sign-up',
  '/reset-password',
  '/unauthorized',
  '/api/search',
  '/api/search/suggestions'
] as const;

type ProtectedPath = {
  path: string;
  roles: readonly string[];
};

// Protected paths that require specific roles
export const PROTECTED_PATHS: Record<string, ProtectedPath> = {
  ADMIN: {
    path: '/admin',
    roles: ['super_admin', 'admin']
  },
  ADMIN_ROLES: {
    path: '/admin/roles',
    roles: ['super_admin', 'admin']
  },
  CMS: {
    path: '/cms',
    roles: ['super_admin', 'admin', 'editor', 'author']
  },
  EDITOR: {
    path: '/editor',
    roles: ['super_admin', 'admin', 'editor']
  },
  AUTHOR: {
    path: '/author',
    roles: ['super_admin', 'admin', 'editor', 'author']
  },
  SUBSCRIBER: {
    path: '/protected',
    roles: ['super_admin', 'admin', 'editor', 'author','subscriber']
  }
} as const;

// API paths that require authentication
export const PROTECTED_API_PATHS = {
  USERS: {
    path: '/api/users',
    roles: ['super_admin', 'admin']
  },
  ROLES: {
    path: '/api/roles',
    roles: ['super_admin']
  },
  POSTS: {
    path: '/api/posts',
    roles: ['super_admin', 'admin', 'editor', 'author']
  },
  CATEGORIES: {
    path: '/api/categories',
    roles: ['super_admin', 'admin', 'editor']
  },
  TAGS: {
    path: '/api/tags',
    roles: ['super_admin', 'admin', 'editor']
  }
} as const;
