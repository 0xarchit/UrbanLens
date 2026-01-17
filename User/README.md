# City Issue Reporter - Mobile App

A React Native + Expo mobile application for citizens to report city infrastructure issues with AI-powered classification and real-time tracking.

## Features

### Authentication
- **Google OAuth only** via Supabase Auth
- Secure session management with auto-refresh
- No anonymous reporting (prevents spam)

### Anti-Fraud Protection
- **Mandatory GPS**: Camera access blocked until GPS is enabled on device
- **GPS Precision Lock**: Captures blocked until GPS accuracy < 10 meters
- **Live Camera Only**: No gallery access - photos must be captured in real-time
- **Location Verification**: Continuous GPS monitoring during capture session

### Issue Reporting
- Live camera capture with frame guides
- Real-time GPS accuracy indicator
- AI-powered classification visualization
- Status: VisionAgent → GeoAgent → PriorityAgent → RoutingAgent → NotificationAgent

### Issue Tracking
- View all your reported issues
- Filter by status (Reported, In Progress, Resolved)
- Detailed issue view with:
  - Original vs AI-annotated image toggle
  - Priority and status badges
  - Confidence score visualization
  - Location details
  - Status timeline

### Profile & Gamification
- Civic badges and contribution stats
- Report history stats
- Settings management

## Tech Stack

- **Framework**: React Native + Expo (SDK 54)
- **Language**: TypeScript
- **Auth**: Supabase + Google OAuth
- **Camera**: expo-camera
- **Location**: expo-location
- **Navigation**: @react-navigation/native
- **Styling**: Custom dark theme with glassmorphism

## Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI
- Expo Go app on your device (for testing)
- Google OAuth configured in Supabase

## Installation

```bash
cd User
npm install
```

## Configuration

1. Update Supabase credentials in `src/config/supabase.ts`:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_ANON_KEY`: Your Supabase anon key

2. Configure Google OAuth in Supabase Dashboard:
   - Enable Google provider
   - Add your OAuth client credentials

3. Update `app.json` with your bundle identifiers if needed

## Running the App

### Development
```bash
npx expo start
```

### iOS Simulator
```bash
npx expo start --ios
```

### Android Emulator
```bash
npx expo start --android
```

### Physical Device
Scan the QR code with Expo Go app

## Project Structure

```
src/
├── components/
│   ├── ui/
│   │   ├── Button.tsx       # Gradient button with variants
│   │   └── Card.tsx         # Glass/gradient card component
│   └── issues/
│       └── IssueCard.tsx    # Issue list item component
├── config/
│   └── supabase.ts          # Supabase client configuration
├── context/
│   └── AuthContext.tsx      # Auth state management
├── navigation/
│   └── AppNavigator.tsx     # Navigation structure
├── screens/
│   ├── auth/
│   │   └── LoginScreen.tsx  # Google OAuth login
│   ├── capture/
│   │   ├── CaptureScreen.tsx    # Camera with GPS enforcement
│   │   └── ProcessingScreen.tsx # AI agent progress
│   ├── home/
│   │   └── HomeScreen.tsx   # Dashboard
│   ├── issues/
│   │   ├── MyIssuesScreen.tsx   # Issue list
│   │   └── IssueDetailScreen.tsx # Issue details
│   └── profile/
│       └── ProfileScreen.tsx # User profile
├── services/
│   ├── issueService.ts      # API communication
│   └── locationService.ts   # GPS utilities
├── theme/
│   └── index.ts             # Colors, typography, spacing
└── types/
    └── index.ts             # TypeScript interfaces
```

## API Integration

The app connects to the Backend API at:
- Development: `http://10.0.2.2:8000` (Android emulator)
- Update `API_BASE_URL` in `src/config/supabase.ts` for other environments

## Backend Endpoints Used

- `POST /issues/stream` - Create issue with background processing
- `GET /issues` - List issues with pagination
- `GET /issues/{id}` - Get issue details
- `GET /flow/flow/{id}` - SSE stream for agent progress

## Building for Production

### EAS Build (Recommended)
```bash
npx eas build --platform all
```

### Local Build
```bash
npx expo run:android
npx expo run:ios
```

## License

Part of the Autonomous City Issue Resolution Agent project.
