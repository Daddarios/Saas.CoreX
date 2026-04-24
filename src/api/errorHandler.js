/**
 * =============================================
 * STANDARDIZED API ERROR HANDLER
 * =============================================
 * Tüm API hatalarını normalize etmek ve
 * fieldErrors'ı otomatik extract etmek için
 * ortak error handler sınıfı ve fonksiyonu.
 */

// -----------------------------------------------------------------
// 1. ApiError Sınıfı — Tüm API hatalarını modellemek için
// -----------------------------------------------------------------
export class ApiError extends Error {
  constructor(status, message, fieldErrors = {}, originalError = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.message = message;
    this.fieldErrors = fieldErrors; // { fieldName: "error message" } veya { fieldName: ["error1", "error2"] }
    this.originalError = originalError;
  }

  /**
   * Belirli bir field için hata var mı?
   */
  hasFieldError(fieldName) {
    return fieldName in this.fieldErrors;
  }

  /**
   * Belirli field'in hatasını al (string veya array)
   */
  getFieldError(fieldName) {
    const error = this.fieldErrors[fieldName];
    if (!error) return null;
    // Array ise ilk hata, string ise direkt döndür
    return Array.isArray(error) ? error[0] : error;
  }

  /**
   * Dile göre lokalize edilmiş hata mesajı
   * @param {function} t - useLanguage() hook'tan gelen çeviri fonksiyonu
   * @returns {string} Lokalize hata mesajı
   */
  getLocalizedMessage(t) {
    // Eğer backend'den gelen custom mesaj varsa onu kullan
    if (this.message && !this.isGenericMessage()) {
      return this.message;
    }
    
    // Status koduna göre çevirili mesaj döndür
    const errorKeys = {
      400: 'errors.badRequest',   // Geçersiz İstek
      401: 'errors.unauthorized', // Kimlik Doğrulaması Gerekli
      403: 'errors.forbidden',    // Erişim Reddedildi
      404: 'errors.notFound',     // Kaynak Bulunamadı
      409: 'errors.conflict',     // Çakışma: Kaynak Zaten Mevcut
      422: 'errors.validationError', // Validasyon Hatası
      500: 'errors.serverError',  // Sunucu Hatası
      503: 'errors.serviceUnavailable', // Hizmet Geçici Olarak Kullanılamıyor
      0: 'errors.networkError',   // Ağ Hatası
    };
    
    const key = errorKeys[this.status];
    if (key) {
      return t(key);
    }
    
    // Fallback: orijinal mesaj
    return this.message || t('errors.unknownError');
  }

  /**
   * Mesajın generic/sabit mi, yoksa backend'den mi geldiğini kontrol et
   */
  isGenericMessage() {
    const genericMessages = [
      'Geçersiz istek',
      'Kimlik doğrulama gerekli',
      'Erişim reddedildi',
      'Kaynak bulunamadı',
      'Çakışma: Kaynak zaten mevcut',
      'Validasyon hatası',
      'Sunucu hatası',
      'Hizmet geçici olarak kullanılamıyor',
      'Ağ hatası: Sunucuya bağlanılamadı',
    ];
    return genericMessages.includes(this.message);
  }

  /**
   * Global error mesajı (fieldErrors değil)
   */
  isValidationError() {
    return this.status === 400 || this.status === 422;
  }

  isUnauthorized() {
    return this.status === 401;
  }

  isForbidden() {
    return this.status === 403;
  }

  isNotFound() {
    return this.status === 404;
  }

  isServerError() {
    return this.status >= 500;
  }
}

// -----------------------------------------------------------------
// 2. parseApiError() — Axios error'unu ApiError'a dönüştür
// -----------------------------------------------------------------
export const parseApiError = (axiosError) => {
  // Network error (no response)
  if (!axiosError.response) {
    return new ApiError(
      0,
      axiosError.message || 'Ağ hatası: Sunucuya bağlanılamadı',
      {},
      axiosError
    );
  }

  const { status, data } = axiosError.response;
  const url = axiosError.config?.url;

  // Konsola detaylı log
  console.error(`[${status}] ${url}:`, JSON.stringify(data, null, 2));

  // Backend'den gelen hatayı normalize et
  let message = '';
  let fieldErrors = {};

  // 1. Message alanını bul (farklı formatlar)
  if (data?.message) {
    message = data.message;
  } else if (data?.nachricht) {
    message = data.nachricht;
  } else if (data?.title) {
    message = data.title;
  }

  // 2. Field-specific errors'ı extract et
  // Backend formatları: data.errors, data.fehler, data.fieldErrors, vb.
  const errorMap = data?.errors || data?.fehler || data?.fieldErrors || {};

  if (typeof errorMap === 'object' && errorMap !== null) {
    fieldErrors = errorMap;
  }

  // 3. Eğer field errors var ama global message yoksa, ilk field hatasını kullan
  if (!message && Object.keys(fieldErrors).length > 0) {
    const firstError = Object.values(fieldErrors).flat()[0];
    message = firstError || 'Validasyon hatası';
  }

  // 4. Fallback: Hiçbir mesaj yoksa status koduna göre generic hata
  if (!message) {
    const statusMessages = {
      400: 'Geçersiz istek',
      401: 'Kimlik doğrulama gerekli',
      403: 'Erişim reddedildi',
      404: 'Kaynak bulunamadı',
      409: 'Çakışma: Kaynak zaten mevcut',
      422: 'Validasyon hatası',
      500: 'Sunucu hatası',
      503: 'Hizmet geçici olarak kullanılamıyor',
    };
    message = statusMessages[status] || `Sunucu hatası (${status})`;
  }

  return new ApiError(status, message, fieldErrors, axiosError);
};

// -----------------------------------------------------------------
// 3. Axios error response interceptor'da kullanılacak normalize
// -----------------------------------------------------------------
export const normalizeErrorForLogging = (error) => {
  const data = error.response?.data;

  if (data) {
    // Nachricht/title'ı message'a mapla
    if (!data.message) {
      if (data.nachricht) {
        data.message = data.nachricht;
      } else if (data.title) {
        data.message = data.title;
      }
    }

    // Validation errors'ı message'a da ekle (logging için)
    const validationErrors = data.errors || data.fehler;
    if (!data.message && validationErrors && typeof validationErrors === 'object') {
      const messages = Object.values(validationErrors).flat();
      if (messages.length > 0) {
        data.message = messages.join('; ');
      }
    }

    if (!data.message) {
      data.message = `Sunucu hatası (${error.response.status})`;
    }
  }

  return error;
};

// -----------------------------------------------------------------
// 4. Try-catch içinde kullanılacak helper
// -----------------------------------------------------------------
export const handleApiError = (error) => {
  if (error.response) {
    // Axios error
    return parseApiError(error);
  }
  // Diğer error'lar
  return new ApiError(0, error.message || 'Bilinmeyen hata', {}, error);
};
