/**
 * =============================================
 * usePermission — Rol Bazlı Yetki Kontrolü
 * =============================================
 * Belgeye göre (Frontend-Yetkilendirme-Yapisi.md):
 *   SuperAdmin > Admin > Manager > Standard > NurLesen
 *
 * Kullanım:
 *   const { canEdit, isAdmin, hasRole } = usePermission();
 */
import { useAuth } from './useAuth';

// Sadece izin kontrolü için pure helper (hook dışında da kullanılabilir)
export const hasRole = (rolle, allowedRoles) =>
  allowedRoles.includes(rolle);

export const isAdminRole = (rolle) =>
  ['SuperAdmin', 'Admin'].includes(rolle);

/** Kullanıcı yönetimi (Benutzer) yapabilir: SuperAdmin, Admin, Manager */
export const canManageUsersRole = (rolle) =>
  ['SuperAdmin', 'Admin', 'Manager'].includes(rolle);

export const canEditRole = (rolle) => rolle !== 'NurLesen';
export const canDeleteRole = (rolle) => rolle !== 'NurLesen';
export const canCreateRole = (rolle) => rolle !== 'NurLesen';

// React hook
export function usePermission() {
  const { user } = useAuth();
  const rolle = user?.rolle ?? '';

  return {
    rolle,
    /** Herhangi bir yetkili rol */
    isAuthenticated: !!user,
    /** SuperAdmin veya Admin */
    isAdmin: isAdminRole(rolle),
    /** SuperAdmin, Admin veya Manager — Benutzer CRUD */
    canManageUsers: canManageUsersRole(rolle),
    /** Sadece SuperAdmin */
    isSuperAdmin: rolle === 'SuperAdmin',
    /** NurLesen değilse düzenleyebilir */
    canEdit: canEditRole(rolle),
    /** NurLesen değilse silebilir */
    canDelete: canDeleteRole(rolle),
    /** NurLesen değilse oluşturabilir */
    canCreate: canCreateRole(rolle),
    /** Belirli roller için kontrol */
    hasRole: (allowedRoles) => hasRole(rolle, allowedRoles),
  };
}
