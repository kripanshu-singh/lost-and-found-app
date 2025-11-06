# Lost and Found Application - Complete Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Features](#core-features)
4. [Technical Stack](#technical-stack)
5. [Project Structure](#project-structure)
6. [Authentication System](#authentication-system)
7. [Item Management](#item-management)
8. [Search and Filtering](#search-and-filtering)
9. [Claims System](#claims-system)
10. [User Profile Management](#user-profile-management)
11. [Theme System](#theme-system)
12. [Push Notifications](#push-notifications)
13. [API Integration](#api-integration)
14. [State Management](#state-management)
15. [UI Components](#ui-components)
16. [Build and Deployment](#build-and-deployment)
17. [Development Guide](#development-guide)

---

## Overview

**Lost and Found** is a comprehensive React Native mobile application built with Expo that helps users report, search, and claim lost items within a campus environment. The app facilitates the process of reuniting lost items with their owners through a streamlined reporting and claiming workflow.

### Key Capabilities

- **Report Lost Items**: Users can report items they've found with photos, descriptions, location, and category
- **Search & Filter**: Advanced search functionality with multiple filters (category, status, date range, sorting)
- **Claim Items**: Users can claim items they've lost with a verification workflow
- **User Management**: Complete profile management with photo updates
- **Alert System**: Create alerts for specific items users are looking for
- **Theme Support**: Light, dark, and system-based theme modes
- **Push Notifications**: FCM integration for real-time updates

---

## Architecture

### Application Architecture

```
┌───────────────────────────────────────────────────┐
│                   Mobile App (Expo)               │
├───────────────────────────────────────────────────┤
│                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │  Auth Layer  │  │ State Mgmt   │  │  Theme   │ │
│  │  (Context)   │  │  (Context)   │  │ Provider │ │
│  └──────────────┘  └──────────────┘  └──────────┘ │
│                                                   │
│  ┌─────────────────────────────────────────────┐  │
│  │           Navigation (Expo Router)          │  │
│  │  - Tab Navigation                           │  │
│  │  - Stack Navigation                         │  │
│  └─────────────────────────────────────────────┘  │
│                                                   │
│  ┌─────────────────────────────────────────────┐  │
│  │              Screen Components              │  │
│  │  - Auth Screens                             │  │
│  │  - Home/Landing                             │  │
│  │  - Item Management                          │  │
│  │  - Profile & Settings                       │  │
│  └─────────────────────────────────────────────┘  │
│                                                   │
│  ┌─────────────────────────────────────────────┐  │
│  │              API Client Layer               │  │
│  │  - HTTP Client (Axios)                      │  │
│  │  - Token Management                         │  │
│  │  - Error Handling                           │  │
│  └─────────────────────────────────────────────┘  │
│                                                   │
│  ┌─────────────────────────────────────────────┐  │
│  │          Secure Storage (Expo)              │  │
│  │  - Session Tokens                           │  │
│  │  - Theme Preference                         │  │
│  └─────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────┐
│              Backend REST API                    │
│(https://lost-and-found-app-612814543741.asia-south1.run.app)
└──────────────────────────────────────────────────┘
```

### Design Patterns

1. **Context API Pattern**: Used for global state management (Auth, Theme)
2. **Provider Pattern**: Wraps the app tree to provide shared functionality
3. **Repository Pattern**: API layer abstracts data access
4. **Component Composition**: Reusable UI components
5. **Hook-based Architecture**: Custom hooks for shared logic

---

## Core Features

### 1. Authentication & Authorization

- Email/password registration with optional profile photo
- Secure login with JWT tokens (access + refresh)
- Automatic token refresh on expiry
- Secure session persistence using Expo SecureStore
- Protected route navigation

### 2. Item Reporting

- Report found items with:
  - Item name and description
  - Multiple photos (up to 5)
  - Category selection (9 categories)
  - Location (with autocomplete suggestions)
  - GPS coordinates via map picker
  - Date found
- Edit and delete reported items
- View all items reported by current user

### 3. Search & Discovery

- Real-time search with debouncing
- Advanced filtering:
  - Category (single or multiple)
  - Status (Available, Claimed, Pending Verification)
  - Date range (Today, This Week, This Month, Custom)
  - Sorting (Date, Name, Category)
- Pagination support
- Recently reported items feed
- Category-based browsing

### 4. Claims Management

- Submit claim for lost items
- Withdraw pending claims
- Multi-status claim workflow:
  - **Pending**: Initial claim submitted
  - **Approved**: Verified by staff, ready for pickup
  - **Rejected**: Claim denied
- Item status tracking:
  - **Available**: Item can be claimed
  - **Pending Verification**: Claims under review
  - **Claimed**: Item verified and picked up
- Visual indicators for claim status
- Drop-off location instructions

### 5. User Profile

- View and edit profile information
- Update profile photo from gallery
- Dashboard with statistics:
  - Items reported
  - Items claimed
  - Active alerts
- View reported items history
- Manage alerts
- Theme preference management
- Logout functionality

### 6. Alerts System

- Create custom alerts for specific items
- Specify:
  - Item category
  - Keywords
  - Location preferences
- Active/Inactive status
- Get notified when matching items are reported

---

## Technical Stack

### Frontend

- **Framework**: React Native 0.81.4
- **Runtime**: Expo SDK 54
- **Language**: TypeScript 5.9.2
- **Routing**: Expo Router 6.0
- **Styling**:
  - StyleSheet API
  - NativeWind 4.2 (Tailwind CSS)
- **State Management**: React Context API + Hooks
- **HTTP Client**: Axios 1.12.2
- **Image Handling**: Expo Image 3.0
- **Maps**: React Native Maps 1.20.1
- **Notifications**: Expo Notifications 0.32

### Storage

- **Secure Storage**: Expo SecureStore (for tokens and preferences)
- **Session Management**: JWT access + refresh tokens

### Development Tools

- **TypeScript**: Static typing
- **ESLint**: Code linting
- **Metro Bundler**: JavaScript bundler
- **EAS Build**: Build and deployment

### UI/UX Libraries

- **Icons**: @expo/vector-icons (Ionicons)
- **Date Picker**: @react-native-community/datetimepicker
- **Image Picker**: expo-image-picker
- **Location**: expo-location
- **Safe Area**: react-native-safe-area-context
- **Gestures**: react-native-gesture-handler

---

## Project Structure

```
lost-and-found-app/
├── app/                          # Application screens (Expo Router)
│   ├── _layout.tsx               # Root layout with providers
│   ├── index.tsx                 # Welcome/landing page
│   ├── global.css                # Global Tailwind styles
│   ├── theme.tsx                 # Theme configuration export
│   └── screens/
│       ├── auth/
│       │   ├── Login.tsx         # Login screen
│       │   └── Register.tsx      # Registration screen
│       └── home/
│           ├── _layout.tsx       # Tab navigation layout
│           ├── Landing.tsx       # Home dashboard
│           ├── ReportLostItem.tsx # Report item form
│           ├── SearchItems.tsx   # Search & filter screen
│           ├── ItemDetail.tsx    # Item details with claim
│           ├── UpdateItem.tsx    # Edit reported item
│           ├── MyReportedItems.tsx # User's items list
│           ├── Profile.tsx       # User profile
│           ├── EditProfile.tsx   # Edit user profile
│           ├── CreateAlert.tsx   # Create alert form
│           ├── Alerts.tsx        # Manage alerts
│           └── components/
│               ├── LostItemCard.tsx # Item card component
│               └── StatCard.tsx     # Statistics card
│
├── src/
│   ├── api/                      # API integration layer
│   │   ├── httpClient.ts         # Axios instance & interceptors
│   │   ├── auth.ts               # Auth endpoints
│   │   ├── items.ts              # Items endpoints
│   │   ├── alerts.ts             # Alerts endpoints
│   │   ├── users.ts              # User profile endpoints
│   │   └── session.ts            # Session storage helpers
│   │
│   ├── auth/
│   │   └── AuthProvider.tsx      # Authentication context
│   │
│   ├── notifications/
│   │   └── pushToken.ts          # FCM token registration
│   │
│   └── theme.tsx                 # Theme provider & hooks
│
├── assets/                       # Static assets
│   └── images/
│       ├── icon.png
│       ├── logo.svg
│       ├── app-icon.png
│       ├── android-icon-foreground.png
│       ├── android-icon-background.png
│       └── android-icon-monochrome.png
│
├── scripts/
│   └── generate-icons.js         # Icon generation script
│
├── app.json                      # Expo configuration
├── eas.json                      # EAS Build configuration
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript configuration
├── tailwind.config.js            # Tailwind CSS config
└── babel.config.js               # Babel configuration
```

---

## Authentication System

### Overview

The app uses a JWT-based authentication system with access and refresh tokens. Sessions are securely stored using Expo SecureStore and persist across app restarts.

### Authentication Flow

```
┌─────────────┐
│   Login     │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ POST /api/auth/login│
│  - email            │
│  - password         │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Response:          │
│  - accessToken      │
│  - refreshToken     │
│  - userId           │
│  - name, email      │
│  - profilePhoto     │
└──────┬──────────────┘
       │
       ▼
┌──────────────────────┐
│ Save to SecureStore  │
│ Set HTTP headers     │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Navigate to Home     │
└──────────────────────┘
```

### Components

#### AuthProvider (`src/auth/AuthProvider.tsx`)

Central authentication context that manages:

- Session state (login/logout)
- Token refresh logic
- Route protection
- FCM token synchronization
- Session hydration on app start

**Key Methods:**

```typescript
interface AuthContextValue {
  session: AuthSession | null;
  isHydrating: boolean;
  setSession(session: AuthSession): Promise<void>;
  clearSession(): Promise<void>;
  logout(): Promise<void>;
  refreshSession(): Promise<AuthSession | null>;
}
```

#### Session Storage (`src/api/session.ts`)

Manages secure persistence of authentication data:

- `saveSession()`: Persist session to SecureStore
- `loadSession()`: Retrieve session on app start
- `clearSession()`: Remove session data

#### HTTP Client (`src/api/httpClient.ts`)

Axios instance with:

- Automatic access token injection
- 401 response interception
- Automatic token refresh
- Request retry on token refresh

### Registration

```typescript
// POST /api/auth/register
interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  profilePhotoUri?: string | null; // Optional profile photo
}
```

Form includes:

- Full name
- Email (validated)
- Password (with visibility toggle)
- Optional profile photo (image picker)

### Login

```typescript
// POST /api/auth/login
interface LoginPayload {
  email: string;
  password: string;
}
```

Features:

- Email/password validation
- Automatic session creation
- Fallback to `/api/users/me` for profile data
- Error handling with user-friendly messages

### Token Refresh

Automatic refresh when access token expires:

```typescript
// POST /api/auth/refresh
interface RefreshPayload {
  refreshToken: string;
}
```

The `httpClient` intercepts 401 responses and attempts refresh before retrying the original request.

### Logout

```typescript
// POST /api/auth/logout
interface LogoutPayload {
  refreshToken: string;
}
```

Clears:

- Local session storage
- HTTP auth headers
- FCM token from backend
- Redirects to login

---

## Item Management

### Item Data Model

```typescript
interface LostItemSummary {
  id: number;
  itemName: string;
  description: string | null;
  locationFound: string | null;
  latitude: number | null;
  longitude: number | null;
  images: string[];
  dateFound: string | null;
  status: ItemStatus;
  category: ItemCategory;
  postedByUserId?: number;
  claimedByUserId?: number | null;
}

interface LostItemDetail extends LostItemSummary {
  postedBy?: ItemPersonReference | null;
  approvedClaimer?: ItemPersonReference | null;
  claims?: ItemClaimRecord[];
}

type ItemStatus =
  | "AVAILABLE"
  | "CLAIMED"
  | "PENDING_VERIFICATION"
  | "RESOLVED"
  | "ARCHIVED";

type ItemCategory =
  | "PHONE"
  | "WALLET"
  | "KEYS"
  | "BAG"
  | "ELECTRONIC"
  | "CLOTHING"
  | "STATIONERY"
  | "DOCUMENT"
  | "OTHER";
```

### Reporting an Item

**Screen**: `app/screens/home/ReportLostItem.tsx`

**Endpoint**: `POST /api/items/report`

**Form Fields:**

1. **Item Name** (required): Text input for item title
2. **Description** (optional): Multi-line description
3. **Location Found** (required):
   - Text input with autocomplete
   - Campus location suggestions
   - Map picker for coordinates
4. **Date Found** (required): Date picker (defaults to today)
5. **Category** (required): 9 predefined categories
6. **Photos** (optional, max 5):
   - Pick from gallery
   - Capture with camera
   - Preview and remove

**Validation:**

- Item name must not be empty
- Category must be selected
- Location text required (coordinates optional)
- Date cannot be in the future
- Maximum 5 photos

**Payload:**

```typescript
interface ReportLostItemPayload {
  itemName: string;
  description?: string;
  locationFound?: string;
  latitude?: number;
  longitude?: number;
  dateFound?: string; // ISO 8601
  category: ItemCategory;
  images?: string[]; // Base64 or file URIs
}
```

### Updating an Item

**Screen**: `app/screens/home/UpdateItem.tsx`

**Endpoint**: `PATCH /api/items/{id}`

Features:

- Pre-populate form with existing data
- Edit all fields (name, description, location, date, category)
- Add/remove photos
- Delete item (with confirmation)

### Viewing Item Details

**Screen**: `app/screens/home/ItemDetail.tsx`

Displays:

- Image carousel with full-screen preview
- Item status badge
- Category and date found
- Location with "Open in Maps" link
- Description (expandable)
- Reporter information
- Approved claimer (if any)
- Claim status notices
- Action buttons based on ownership and status

### My Reported Items

**Screen**: `app/screens/home/MyReportedItems.tsx`

**Endpoint**: `GET /api/items/my-reported-items`

Features:

- List of all items reported by current user
- Status indicators
- Quick navigation to item details
- Edit/delete actions

---

## Search and Filtering

### Overview

Advanced search system with multiple filters, sorting, and pagination.

**Screen**: `app/screens/home/SearchItems.tsx`

**Endpoint**: `GET /api/items/search`

### Search Capabilities

#### 1. **Text Search**

- Debounced search input (350ms delay)
- Searches across:
  - Item name
  - Description
  - Location

#### 2. **Category Filter**

- All categories (default)
- Single or multiple category selection
- 9 predefined categories

#### 3. **Status Filter**

- Any status (default)
- Available
- Claimed
- Pending Verification

#### 4. **Date Range Filter**

Options:

- **Any time** (default)
- **Today**: Items from current day
- **This week**: Last 7 days
- **This month**: Last 30 days
- **Custom**: User-defined date range

#### 5. **Sorting**

Options:

- **Date**: Newest/Oldest first
- **Name**: A-Z / Z-A
- **Category**: A-Z / Z-A

### Filter Modal

Full-screen modal with:

- Category chips (multi-select)
- Status radio buttons
- Date range picker
- Active filter indicators
- Reset all filters
- Apply filters

### Query Parameters

```typescript
interface FetchLostItemsParams {
  page?: number;
  size?: number;
  searchTerm?: string;
  category?: ItemCategory[];
  status?: ItemStatus;
  dateRange?: string; // "today", "7d", "30d", or custom range
  sortBy?: string; // "dateFound", "itemName", "category"
  sortOrder?: "asc" | "desc";
}
```

### Pagination

- Page size: 10 items
- Infinite scroll support
- Load more on reaching end
- Pull-to-refresh

### Recently Reported

**Endpoint**: `GET /api/items/recently-reported`

Displays on Landing screen:

- Latest 5 reported items
- Quick access to item details

---

## Claims System

### Claim Workflow

```
┌──────────────────┐
│ Item Available   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ User Claims Item │
│ POST /api/items/ │
│   {id}/claim     │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────┐
│ Status: PENDING          │
│ Notify: Visit drop-off   │
│         with proof       │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Staff Verification       │
│ (Backend Process)        │
└────────┬─────────────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌─────┐   ┌─────────┐
│APPR │   │REJECTED │
│OVED │   └─────────┘
└──┬──┘
   │
   ▼
┌──────────────────┐
│ Item Status:     │
│ CLAIMED          │
│ User notified    │
│ for pickup       │
└──────────────────┘
```

### Claim Statuses

```typescript
type ItemClaimStatus =
  | "PENDING" // Initial claim submitted
  | "APPROVED" // Verified, ready for pickup
  | "REJECTED" // Claim denied
  | "UNDER_REVIEW" // Alternative pending status
  | "VERIFIED" // Alternative approved status
  | "APPROVED_FOR_PICKUP"; // Explicit pickup ready
```

### Claiming an Item

**Endpoint**: `POST /api/items/{id}/claim`

**Requirements:**

- User must be logged in
- User cannot claim their own items
- Item must be AVAILABLE or PENDING_VERIFICATION
- User has not already claimed the item

**Process:**

1. User clicks "Claim this item" button
2. POST request sent to backend
3. Claim record created with PENDING status
4. User shown success message with drop-off instructions
5. UI updates to show "Claim submitted" state

**UI Indicators:**

- "Claim submitted" notice with pending icon
- Instructions to visit drop-off location
- "Withdraw claim" button available

### Withdrawing a Claim

**Endpoint**: `DELETE /api/items/unclaim/{claimId}`

**Requirements:**

- User must own the claim
- Claim must be in PENDING status

**Process:**

1. User clicks "Withdraw claim"
2. DELETE request with claim ID
3. Backend removes claim record
4. Item returns to AVAILABLE status
5. UI updates to allow new claim

### Item Status Changes

**Item Statuses:**

```typescript
type ItemStatus =
  | "AVAILABLE" // Can be claimed
  | "PENDING_VERIFICATION" // Has pending claims
  | "CLAIMED" // Verified and picked up
  | "RESOLVED" // Issue resolved
  | "ARCHIVED"; // No longer active
```

**Status Transitions:**

- AVAILABLE → PENDING_VERIFICATION (when claim submitted)
- PENDING_VERIFICATION → CLAIMED (when claim approved)
- PENDING_VERIFICATION → AVAILABLE (when all claims withdrawn/rejected)
- CLAIMED → RESOLVED (manual backend action)

### Claims Data Model

```typescript
interface ItemClaimRecord {
  id: number;
  itemId: number;
  status: ItemClaimStatus;
  createdAt?: string;
  claimer?: ItemPersonReference;
}

interface ItemPersonReference {
  id: number;
  name: string;
  profilePhoto?: string | null;
}
```

### UI Components

#### Claim Button States

1. **Available** (green): "Claim this item"
2. **Pending** (blue): "Claim submitted" (disabled)
3. **Approved** (green with checkmark): "Claim approved" (disabled)
4. **Claimed** (gray): "Item already claimed" (disabled)
5. **Not Available** (gray): "Not available" (disabled)

#### Status Notices

- **Pending Notice**: Blue background, time icon, verification instructions
- **Approved Notice**: Green background, shield icon, pickup instructions
- **Claimed Notice**: Green background, shield icon, "Item has been claimed"
- **Info Notice**: Blue background for pending verification items

---

## User Profile Management

### Profile Screen

**Screen**: `app/screens/home/Profile.tsx`

**Displays:**

- User avatar (or initials)
- Name and email
- Statistics dashboard:
  - Items reported
  - Items claimed
  - Active alerts
- Recently reported items (preview)
- Active alerts (preview)
- Action buttons:
  - Update profile
  - Log out

### Editing Profile

**Screen**: `app/screens/home/EditProfile.tsx`

**Endpoint**: `PATCH /api/users/me`

**Editable Fields:**

- **Full Name**: Text input with clear button
- **Profile Photo**:
  - Tap avatar to open gallery
  - Shows current photo or initials
  - "Use current photo" reset button
  - Camera badge indicator

**Payload:**

```typescript
interface UpdateUserProfilePayload {
  name?: string;
  profilePhotoUri?: string; // New photo from gallery
}
```

**Features:**

- Real-time preview of changes
- Save changes button (enabled only when changes made)
- Cancel button to discard changes
- Updates local session on success
- Form validation (name required)

### User Statistics

**Endpoint**: `GET /api/users/kpis`

```typescript
interface UserKpis {
  itemsReported: number;
  itemsClaimed: number;
  activeAlerts: number;
}
```

Displayed as cards with:

- Icon badges
- Numeric values
- Descriptive labels
- Themed backgrounds

### Profile Navigation

- Access from bottom tab navigation
- Menu accessible from landing screen
- Edit profile from profile screen

---

## Theme System

### Overview

The app supports three theme modes with persistent preference storage.

**Implementation**: `src/theme.tsx`

### Theme Modes

1. **System** (default): Follows device appearance
2. **Light**: Fixed light mode
3. **Dark**: Fixed dark mode

### Theme Provider

```typescript
export type ThemePreference = "system" | "light" | "dark";

interface ThemeValue {
  palette: Palette;
  scheme: "light" | "dark";
  preference: ThemePreference;
  setPreference: (value: ThemePreference) => void;
}
```

### Color Palettes

#### Light Palette

```typescript
{
  primary: "#4A90E2",
  primaryStrong: "#3F51B5",
  primarySoft: "#E3F1FE",
  accent: "#F5A623",
  background: "#F5F5F5",
  surface: "#FFFFFF",
  text: "#333333",
  textSecondary: "#4F4F4F",
  border: "#E0E0E0",
  danger: "#FF3B30",
}
```

#### Dark Palette

```typescript
{
  primary: "#9BBFF4",
  primaryStrong: "#7992FF",
  primarySoft: "#192642",
  accent: "#FFCB6B",
  background: "#0C111A",
  surface: "#141B26",
  text: "#F5F7FA",
  textSecondary: "#C8D0DA",
  border: "#1F2933",
  danger: "#FF453A",
}
```

### Persistence

Theme preference stored in Expo SecureStore:

```typescript
const THEME_PREFERENCE_KEY = "lostFound.themePreference";
```

- Loads on app start
- Defaults to "system" if not set
- Persists across app restarts

### Usage in Components

```typescript
import { useAppTheme } from "../../../src/theme";

function MyComponent() {
  const { palette, scheme, preference, setPreference } = useAppTheme();

  const styles = useMemo(
    () => createStyles(palette, scheme),
    [palette, scheme]
  );

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <Text style={{ color: palette.text }}>Hello</Text>
    </View>
  );
}
```

### Theme Selector

**Location**: Landing screen menu

Features:

- Radio button selection
- System, Light, Dark options
- Descriptions for each mode
- Icons indicating current selection
- Immediate visual update

---

## Push Notifications

### Firebase Cloud Messaging (FCM)

**Implementation**: `src/notifications/pushToken.ts`

### Token Registration

```typescript
export async function registerForPushNotifications(): Promise<string | null>;
```

**Process:**

1. Request notification permissions
2. Configure notification channel (Android)
3. Get device push token from Expo
4. Return FCM token string

**Platform-specific:**

- **Android**: Creates notification channel with custom settings
  - Channel ID: "default"
  - Importance: High
  - Sound and vibration enabled
  - Lights color: #2563EB
- **iOS**: Uses default notification settings

### Token Synchronization

**Managed by**: `AuthProvider`

**Endpoint**: `POST /api/users/update-fcm-token`

```typescript
interface UpdateFcmTokenRequest {
  fcmToken: string | null;
}
```

**Lifecycle:**

1. User logs in → Register FCM token
2. Get token from device
3. Compare with stored token
4. If different, update backend
5. Store token reference in memory

**Edge Cases:**

- Token registration failure: Clears backend token
- Already synced: Skips update
- Session cleared: Removes token from backend

### Notification Permissions

**iOS**: Requests permission on first FCM registration
**Android**: Requires runtime permissions handling

---

## API Integration

### HTTP Client Configuration

**File**: `src/api/httpClient.ts`

```typescript
const httpClient = axios.create({
  baseURL: Constants.expoConfig?.extra?.apiBaseUrl || "http://localhost:8080",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});
```

### Base URL

Configured in `app.json`:

```json
{
  "expo": {
    "extra": {
      "apiBaseUrl": "https://lost-and-found-app-612814543741.asia-south1.run.app"
    }
  }
}
```

### Request Interceptors

**Access Token Injection:**

```typescript
httpClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});
```

### Response Interceptors

**401 Handling & Token Refresh:**

```typescript
httpClient.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshed = await tokenRefreshHandler?.();
      if (refreshed) {
        setAccessToken(refreshed.accessToken);
        originalRequest.headers['Authorization'] = `Bearer ${refreshed.accessToken}`;
        return httpClient(originalRequest);
      }
    }

    throw new ApiError(...);
  }
);
```

### Error Handling

```typescript
export class ApiError extends Error {
  status?: number;
  data?: unknown;
  cause?: unknown;

  constructor(
    message: string,
    options?: {
      status?: number;
      data?: unknown;
      cause?: unknown;
    },
  );
}
```

### API Modules

#### 1. **Auth API** (`src/api/auth.ts`)

- `registerUser(payload: RegisterPayload)`
- `loginUser(payload: LoginPayload)`
- `refreshTokens(payload: RefreshPayload)`
- `logoutUser(payload: LogoutPayload)`

#### 2. **Items API** (`src/api/items.ts`)

- `reportLostItem(payload: ReportLostItemPayload)`
- `fetchLostItems(params: FetchLostItemsParams)`
- `fetchLostItemById(id: number)`
- `updateLostItem(id: number, payload: UpdateLostItemPayload)`
- `deleteLostItem(id: number)`
- `claimLostItem(id: number)`
- `unclaimLostItem(claimId: number)`
- `fetchMyReportedItems()`
- `fetchRecentlyReported()`

#### 3. **Users API** (`src/api/users.ts`)

- `getCurrentUser()`
- `updateCurrentUserProfile(payload: UpdateUserProfilePayload)`
- `updateUserFcmToken(fcmToken: string | null)`
- `fetchUserKpis()`

#### 4. **Alerts API** (`src/api/alerts.ts`)

- `createAlert(payload: CreateAlertPayload)`
- `fetchMyAlerts()`
- `updateAlert(id: number, payload: UpdateAlertPayload)`
- `deleteAlert(id: number)`

---

## State Management

### Context Providers

#### 1. **ThemeProvider**

```typescript
<ThemeProvider>
  {children}
</ThemeProvider>
```

- Manages theme state (light/dark/system)
- Persists preference to SecureStore
- Provides palette and scheme to all components

#### 2. **AuthProvider**

```typescript
<AuthProvider>
  {children}
</AuthProvider>
```

- Manages authentication state
- Handles session persistence
- Provides login/logout/refresh methods
- Syncs FCM tokens
- Route protection logic

### Provider Hierarchy

```tsx
// app/_layout.tsx
<ThemeProvider>
  <AuthProvider>
    <Stack>{/* Screens */}</Stack>
  </AuthProvider>
</ThemeProvider>
```

### Local Component State

Most screens use React hooks for local state:

- `useState` for form inputs and UI state
- `useEffect` for data fetching
- `useCallback` for memoized functions
- `useMemo` for computed values
- `useRef` for mutable refs (abort controllers, etc.)

### Form State Pattern

Example from ReportLostItem:

```typescript
const [itemName, setItemName] = useState("");
const [description, setDescription] = useState("");
const [locationFound, setLocationFound] = useState("");
const [dateFound, setDateFound] = useState<Date | null>(today);
const [category, setCategory] = useState<ItemCategory | null>(null);
const [images, setImages] = useState<string[]>([]);
const [errorMessage, setErrorMessage] = useState<string | null>(null);
const [isSubmitting, setIsSubmitting] = useState(false);
```

---

## UI Components

### Reusable Components

#### 1. **LostItemCard** (`app/screens/home/components/LostItemCard.tsx`)

Displays item summary with:

- Item image
- Name and category
- Location and date
- Status badge
- Tap to view details

Props:

```typescript
interface LostItemCardProps {
  item: LostItemSummary;
  palette: Palette;
  scheme: "light" | "dark";
  onPress: () => void;
}
```

#### 2. **StatCard** (`app/screens/home/components/StatCard.tsx`)

Displays statistics with icon and value

Props:

```typescript
interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
  palette: Palette;
  scheme: "light" | "dark";
}
```

### Common UI Patterns

#### Loading States

```typescript
{isLoading ? (
  <ActivityIndicator size="large" color={palette.primary} />
) : (
  <Content />
)}
```

#### Error States

```typescript
{errorMessage && (
  <View style={styles.errorBanner}>
    <Ionicons name="warning-outline" size={18} color={palette.danger} />
    <Text style={styles.errorText}>{errorMessage}</Text>
  </View>
)}
```

#### Empty States

```typescript
{items.length === 0 && (
  <View style={styles.emptyState}>
    <Ionicons name="search-outline" size={64} color={palette.textSecondary} />
    <Text style={styles.emptyTitle}>No items found</Text>
    <Text style={styles.emptyDescription}>Try adjusting your filters</Text>
  </View>
)}
```

### Navigation Components

#### Bottom Tab Navigation

```typescript
// app/screens/home/_layout.tsx
<Tabs
  screenOptions={{
    tabBarActiveTintColor: palette.primary,
    tabBarInactiveTintColor: palette.textSecondary,
    headerShown: false,
  }}
>
  <Tabs.Screen
    name="Landing"
    options={{
      title: "Home",
      tabBarIcon: ({ color, size }) => (
        <Ionicons name="home-outline" size={size} color={color} />
      ),
    }}
  />
  {/* Other tabs */}
</Tabs>
```

### Form Components

#### Text Input Pattern

```typescript
<View style={styles.inputWrapper}>
  <Ionicons name="mail-outline" size={18} color={iconColor} />
  <TextInput
    value={email}
    onChangeText={setEmail}
    placeholder="Email"
    placeholderTextColor={placeholderColor}
    style={styles.input}
    keyboardType="email-address"
    autoCapitalize="none"
    autoComplete="email"
  />
</View>
```

#### Image Picker Pattern

```typescript
const handlePickImage = async () => {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (permission.status !== "granted") {
    Alert.alert("Permission needed", "Allow photo access");
    return;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });

  if (!result.canceled && result.assets?.[0]?.uri) {
    setImageUri(result.assets[0].uri);
  }
};
```

#### Date Picker Pattern

```typescript
// Android
const showDatePicker = () => {
  DateTimePickerAndroid.open({
    value: dateFound || new Date(),
    mode: 'date',
    maximumDate: new Date(),
    onChange: (event, date) => {
      if (event.type === 'set' && date) {
        setDateFound(date);
      }
    },
  });
};

// iOS
<DateTimePicker
  value={iosDateDraft}
  mode="date"
  display="spinner"
  maximumDate={new Date()}
  onChange={(event, date) => {
    if (date) setIosDateDraft(date);
  }}
/>
```

---

## Build and Deployment

### Development Setup

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android
```

### Building for Production

#### Prerequisites

1. Install EAS CLI:

```bash
npm install -g eas-cli
```

2. Login to Expo:

```bash
eas login
```

3. Configure EAS (first time):

```bash
eas build:configure
```

#### Build Commands

**Android APK:**

```bash
eas build --platform android --profile production
```

**Android Development Build:**

```bash
eas build --platform android --profile development
```

**iOS:**

```bash
eas build --platform ios --profile production
```

**Both Platforms:**

```bash
eas build --platform all --profile production
```

### EAS Configuration

**File**: `eas.json`

```json
{
  "cli": {
    "version": ">= 16.23.1",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

### App Configuration

**File**: `app.json`

Key settings:

```json
{
  "expo": {
    "name": "Lost and Found",
    "slug": "lost-and-found-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/app-icon.png",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "me.kripanshu.lostandfoundapp"
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#E6F4FE",
        "foregroundImage": "./assets/images/android-icon-foreground.png",
        "backgroundImage": "./assets/images/android-icon-background.png",
        "monochromeImage": "./assets/images/android-icon-monochrome.png"
      },
      "package": "me.kripanshu.lostandfoundapp"
    }
  }
}
```

### Icon Generation

Generate Android adaptive icons and iOS icons:

```bash
npm run gen:icons
```

This script (`scripts/generate-icons.js`):

1. Reads `assets/images/icon.png`
2. Generates Android foreground (transparent, padded)
3. Generates Android background (solid color #E6F4FE)
4. Generates Android monochrome (black silhouette)
5. Generates iOS icon (1024×1024 with background)

### Environment Variables

Configure API base URL in `app.json`:

```json
{
  "expo": {
    "extra": {
      "apiBaseUrl": "https://lost-and-found-app-612814543741.asia-south1.run.app"
    }
  }
}
```

Access in code:

```typescript
import Constants from "expo-constants";

const apiBaseUrl = Constants.expoConfig?.extra?.apiBaseUrl;
```

### Google Services (Android)

Place `google-services.json` in project root for FCM:

```json
{
  "expo": {
    "android": {
      "googleServicesFile": "./google-services.json"
    }
  }
}
```

---

## Development Guide

### Code Style

#### TypeScript

- Use explicit types for function parameters
- Define interfaces for complex objects
- Use type guards when necessary
- Prefer `interface` over `type` for object shapes

#### React Patterns

- Functional components with hooks
- Extract complex logic into custom hooks
- Use `useCallback` for event handlers
- Use `useMemo` for expensive computations
- Use `useRef` for mutable values

#### Naming Conventions

- Components: PascalCase (`LoginScreen`, `LostItemCard`)
- Functions: camelCase (`handleLogin`, `fetchUserData`)
- Constants: UPPER_SNAKE_CASE (`MAX_IMAGE_SIZE`)
- Types/Interfaces: PascalCase (`UserProfile`, `ApiResponse`)

### File Organization

```
ComponentName/
├── ComponentName.tsx        # Main component
├── ComponentName.styles.ts  # Styles (if separated)
├── types.ts                 # Type definitions
└── utils.ts                 # Helper functions
```

### Error Handling

#### API Errors

```typescript
try {
  const response = await apiCall();
} catch (error) {
  const message =
    error instanceof ApiError ? error.message : "An unexpected error occurred";
  setErrorMessage(message);
}
```

#### User-Facing Messages

- Be specific but friendly
- Provide actionable steps
- Avoid technical jargon
- Use consistent tone

### Performance Optimization

#### Image Handling

- Use `expo-image` for better caching
- Compress images before upload (quality: 0.7)
- Limit image dimensions
- Use thumbnails in lists

#### List Rendering

```typescript
<FlatList
  data={items}
  keyExtractor={(item) => String(item.id)}
  renderItem={renderItem}
  getItemLayout={(data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  windowSize={5}
/>
```

#### Debouncing

```typescript
import { useMemo, useState, useEffect } from "react";

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```

### Testing

#### Manual Testing Checklist

- [ ] Registration flow
- [ ] Login/logout
- [ ] Report item with photos
- [ ] Search and filter
- [ ] Claim/unclaim item
- [ ] Edit profile
- [ ] Theme switching
- [ ] Pull-to-refresh
- [ ] Offline handling
- [ ] Image picker permissions

### Debugging

#### Logging

```typescript
console.log("[ComponentName] Event", { data });
```

#### React DevTools

- Install React DevTools browser extension
- Connect via Expo dev menu

#### Network Debugging

- Use Expo Network Inspector
- Check request/response in browser DevTools

### Common Issues

#### 1. **Token Expired**

Solution: Token refresh should be automatic via interceptor

#### 2. **Images Not Loading**

- Check URL format
- Verify backend CORS settings
- Check network connectivity

#### 3. **Navigation Not Working**

- Ensure route exists in `app/` directory
- Check for navigation guards in AuthProvider
- Verify expo-router configuration

#### 4. **Android Build Fails**

- Check `google-services.json` is present
- Verify Android SDK is up to date
- Clear Metro bundler cache: `npx expo start -c`

### Best Practices

1. **Always handle loading states**
2. **Show user-friendly error messages**
3. **Validate input before submission**
4. **Use pull-to-refresh for data updates**
5. **Implement proper cleanup in useEffect**
6. **Memoize styles based on theme**
7. **Cancel pending requests on unmount**
8. **Use TypeScript strictly (no `any`)**
9. **Test on both iOS and Android**
10. **Handle edge cases (empty data, errors)**

---

## API Endpoints Reference

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user

### Items

- `POST /api/items/report` - Report new item
- `GET /api/items/search` - Search items with filters
- `GET /api/items/{id}` - Get item details
- `PATCH /api/items/{id}` - Update item
- `DELETE /api/items/{id}` - Delete item
- `POST /api/items/{id}/claim` - Claim item
- `DELETE /api/items/unclaim/{claimId}` - Unclaim item
- `GET /api/items/my-reported-items` - Get user's items
- `GET /api/items/recently-reported` - Get recent items

### Users

- `GET /api/users/me` - Get current user
- `PATCH /api/users/me` - Update profile
- `POST /api/users/update-fcm-token` - Update FCM token
- `GET /api/users/kpis` - Get user statistics

### Alerts

- `POST /api/alerts` - Create alert
- `GET /api/alerts/my-alerts` - Get user alerts
- `PATCH /api/alerts/{id}` - Update alert
- `DELETE /api/alerts/{id}` - Delete alert

---

## Conclusion

This Lost and Found application provides a comprehensive solution for managing lost items within a campus environment. The architecture is designed for scalability, maintainability, and excellent user experience across both iOS and Android platforms.

### Key Strengths

- Clean, typed codebase with TypeScript
- Secure authentication with JWT
- Rich search and filtering capabilities
- Intuitive claim management workflow
- Theme support for accessibility
- Push notifications for engagement
- Responsive, adaptive UI design

### Future Enhancements

- Real-time chat between reporter and claimer
- In-app notifications timeline
- Advanced analytics dashboard
- Export reported items to CSV
- Bulk operations on items
- Admin panel for staff verification
- QR code scanning for item identification
- Multi-language support

---

**Version**: 1.0.0  
**Last Updated**: October 2025  
**Maintained by**: Kripanshu Singh
