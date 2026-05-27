/**
 * Shared Type Definitions for the Million-Dollar Vendor Onboarding Application
 */

export interface Product {
  id: string;
  imageUrl?: string;
  imageUrls?: string[]; // Multiple pictures supported
  imageOption?: 'upload' | 'ai';
  name: string;
  price: number;
  weight: number;
  description: string;
  createdAt: string;
}

export interface Vendor {
  id: string; // Document ID / Auth UID or unique session key
  serialCode: string; // e.g. VEN-XXXX-XXXX
  authUid?: string; // Firebase Auth UID if logged in via Google
  firstName: string;
  lastName: string;
  businessName: string;
  email: string;
  phone: string;
  preferredDomain: string;
  logoUrl?: string; // Data URL or external link
  bannerUrl?: string; // Data URL or external link
  bannerOption?: 'upload' | 'ai';
  progress: number; // Percentage: 0 - 100
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  lastActive: string; // ISO String to calculate 30-day expiration
}

export type OnboardingStep =
  // Phase 1 steps
  | 'intro'
  | 'contact'
  | 'domain'
  | 'logo'
  | 'banner'
  // Phase 2 steps (Product Cataloging loop)
  | 'product_image'
  | 'product_name'
  | 'product_pricing'
  | 'product_weight'
  | 'product_desc'
  | 'product_list';

export interface AppState {
  currentView: 'welcome' | 'onboarding' | 'admin' | 'success';
  activeVendorId: string | null;
  activeVendorData: Vendor | null;
  activeStep: OnboardingStep;
  activeProductId: string | null; // Product currently being added
  activeProductData: Partial<Product>;
}
