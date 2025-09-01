import { useMemo, useCallback, useState } from 'react';

// Constants and validation patterns
export const BRAND_FIELD_LIMITS = {
  FB_NAME_MAX: 100,
  IG_USERNAME_MAX: 30,
  AVATAR_URL_MAX: 500,
};

export const BRAND_VALIDATION_PATTERNS = {
  URL_REGEX: /^https?:\/\/.+\..+$/,
  IG_USERNAME_REGEX: /^[a-zA-Z0-9._]{1,30}$/,
};

// Default brand object (frozen for performance)
export const emptyBrand = Object.freeze({
  id: null,
  fb_name: '',
  fb_avatar_url: '',
  ig_username: '',
  ig_avatar_url: '',
  verified: false,
  user_id: null,
  created_at: null,
  updated_at: null,
});

// Brand form fields structure
export const emptyBrandForm = Object.freeze({
  fb_name: '',
  fb_avatar_url: '',
  ig_username: '',
  ig_avatar_url: '',
  verified: false,
});

// Validation helpers
const isValidString = (val) => typeof val === 'string';
const isValidUrl = (url) => {
  if (!url || typeof url !== 'string') return true; // Empty is valid
  try {
    const urlObj = new URL(url);
    return BRAND_VALIDATION_PATTERNS.URL_REGEX.test(url);
  } catch {
    return false;
  }
};

const isValidIgUsername = (username) => {
  if (!username || typeof username !== 'string') return true; // Empty is valid
  return BRAND_VALIDATION_PATTERNS.IG_USERNAME_REGEX.test(username);
};

// Validation functions with consistent error messages
export const validateBrandField = {
  fb_name: (value) => {
    if (!value || !value.trim()) {
      return 'Facebook name is required';
    }
    if (value.length > BRAND_FIELD_LIMITS.FB_NAME_MAX) {
      return `Facebook name must be ${BRAND_FIELD_LIMITS.FB_NAME_MAX} characters or less`;
    }
    return null;
  },

  fb_avatar_url: (value) => {
    if (value && !isValidUrl(value)) {
      return 'Facebook avatar URL must be a valid URL';
    }
    if (value && value.length > BRAND_FIELD_LIMITS.AVATAR_URL_MAX) {
      return `Facebook avatar URL is too long`;
    }
    return null;
  },

  ig_username: (value) => {
    if (value && !isValidIgUsername(value)) {
      return 'Instagram username can only contain letters, numbers, periods, and underscores';
    }
    if (value && value.length > BRAND_FIELD_LIMITS.IG_USERNAME_MAX) {
      return `Instagram username must be ${BRAND_FIELD_LIMITS.IG_USERNAME_MAX} characters or less`;
    }
    return null;
  },

  ig_avatar_url: (value) => {
    if (value && !isValidUrl(value)) {
      return 'Instagram avatar URL must be a valid URL';
    }
    if (value && value.length > BRAND_FIELD_LIMITS.AVATAR_URL_MAX) {
      return `Instagram avatar URL is too long`;
    }
    return null;
  },

  verified: (value) => null, // Boolean field, always valid
};

// Comprehensive form validation
export function validateBrandForm(form) {
  const errors = {};
  let hasErrors = false;

  // Validate each field
  Object.keys(validateBrandField).forEach(field => {
    const error = validateBrandField[field](form[field]);
    if (error) {
      errors[field] = error;
      hasErrors = true;
    }
  });

  // Cross-field validation
  const hasFbName = form.fb_name && form.fb_name.trim();
  const hasIgUsername = form.ig_username && form.ig_username.trim();
  
  if (!hasFbName && !hasIgUsername) {
    const message = 'Either Facebook name or Instagram username is required';
    errors.fb_name = errors.fb_name || message;
    errors.ig_username = errors.ig_username || message;
    hasErrors = true;
  }

  return {
    isValid: !hasErrors,
    errors,
  };
}

// Data sanitization functions
export function sanitizeBrandInput(input = {}) {
  return {
    fb_name: isValidString(input.fb_name) ? input.fb_name.trim() : '',
    fb_avatar_url: isValidString(input.fb_avatar_url) ? input.fb_avatar_url.trim() : '',
    ig_username: isValidString(input.ig_username) 
      ? input.ig_username.trim().replace(/^@/, '').toLowerCase() 
      : '',
    ig_avatar_url: isValidString(input.ig_avatar_url) ? input.ig_avatar_url.trim() : '',
    verified: Boolean(input.verified),
  };
}

// Ensure complete brand shape for database operations
export function ensureBrandShape(brand) {
  if (!brand || typeof brand !== 'object') {
    return { ...emptyBrand };
  }

  const sanitized = sanitizeBrandInput(brand);
  
  return {
    id: brand.id || null,
    ...sanitized,
    user_id: brand.user_id || null,
    created_at: brand.created_at || null,
    updated_at: brand.updated_at || null,
  };
}

// Brand display helpers
export function getBrandDisplayName(brand) {
  if (!brand) return 'Unknown Brand';
  
  const fbName = brand.fb_name?.trim();
  const igUsername = brand.ig_username?.trim();
  
  if (fbName) return fbName;
  if (igUsername) return `@${igUsername}`;
  return 'Unnamed Brand';
}

export function getBrandAvatarUrl(brand, platform = 'facebook') {
  if (!brand) return '';
  
  if (platform === 'instagram') {
    return brand.ig_avatar_url || brand.fb_avatar_url || '';
  }
  
  return brand.fb_avatar_url || brand.ig_avatar_url || '';
}

export function getBrandSecondaryText(brand) {
  if (!brand) return '';
  
  const fbName = brand.fb_name?.trim();
  const igUsername = brand.ig_username?.trim();
  
  // If we have both, show the opposite of what's primary
  if (fbName && igUsername) {
    return `@${igUsername}`;
  }
  
  // Show whichever one we have
  return igUsername ? `@${igUsername}` : fbName || '';
}

// React hook for brand form management
export function useBrandForm(initialBrand = null) {
  const [form, setForm] = useState(() => {
    if (initialBrand) {
      return sanitizeBrandInput(initialBrand);
    }
    return { ...emptyBrandForm };
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Reset form to initial state
  const resetForm = useCallback((newBrand = null) => {
    if (newBrand) {
      setForm(sanitizeBrandInput(newBrand));
    } else {
      setForm({ ...emptyBrandForm });
    }
    setErrors({});
    setTouched({});
  }, []);

  // Update single field with validation
  const updateField = useCallback((field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    
    // Validate field if it's been touched
    if (touched[field]) {
      const fieldError = validateBrandField[field]?.(value);
      setErrors(prev => ({
        ...prev,
        [field]: fieldError,
      }));
    }
  }, [touched]);

  // Mark field as touched (for validation timing)
  const touchField = useCallback((field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    
    // Validate field when touched
    const fieldError = validateBrandField[field]?.(form[field]);
    setErrors(prev => ({
      ...prev,
      [field]: fieldError,
    }));
  }, [form]);

  // Validate entire form
  const validateForm = useCallback(() => {
    const validation = validateBrandForm(form);
    setErrors(validation.errors);
    
    // Mark all fields as touched
    setTouched({
      fb_name: true,
      fb_avatar_url: true,
      ig_username: true,
      ig_avatar_url: true,
      verified: true,
    });
    
    return validation;
  }, [form]);

  // Get sanitized form data ready for submission
  const getFormData = useCallback(() => {
    return sanitizeBrandInput(form);
  }, [form]);

  // Memoized validation state
  const validation = useMemo(() => {
    return validateBrandForm(form);
  }, [form]);

  return {
    form,
    errors,
    touched,
    isValid: validation.isValid,
    resetForm,
    updateField,
    touchField,
    validateForm,
    getFormData,
  };
}

// Hook for memoized brand normalization
export function useNormalizedBrand(brand) {
  return useMemo(() => ensureBrandShape(brand), [brand]);
}