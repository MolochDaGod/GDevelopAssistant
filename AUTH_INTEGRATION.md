# Auth Gateway Integration

## Overview
This application now integrates with the Grudge Auth Gateway deployed at `https://auth-gateway-flax.vercel.app` for user authentication.

## How It Works

### 1. Authentication Flow
```
User visits app
    ↓
AuthGuard checks localStorage for token
    ↓
No token? → Redirect to auth-gateway-flax.vercel.app
    ↓
User logs in/registers
    ↓
Auth gateway saves token to localStorage:
  - grudge_auth_token
  - grudge_user_id
  - grudge_username
    ↓
Redirect back to app with token
    ↓
User authenticated ✅
```

### 2. Files Modified/Created

#### New Files
- `client/src/lib/auth.ts` - Authentication utilities
- `client/src/components/AuthGuard.tsx` - Authentication guard component
- `client/index.html` - Vite entry point

#### Modified Files
- `client/src/App.tsx` - Wrapped with AuthGuard
- `client/src/components/app-sidebar.tsx` - Added logout button, shows username

### 3. Key Functions

#### `checkAuth()`
Checks if user has valid token, redirects to login if not.

#### `logout()`
Clears tokens and redirects to login page.

#### `apiCall(endpoint, options)`
Makes authenticated API calls with Bearer token.

#### `getAuthData()`
Gets current auth data without redirecting.

## Usage

### In Components
```tsx
import { getAuthData, logout } from '@/lib/auth';

function MyComponent() {
  const auth = getAuthData();
  
  return (
    <div>
      <p>Welcome, {auth?.username}!</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Making API Calls
```tsx
import { apiCall } from '@/lib/auth';

// Automatically includes Bearer token
const data = await apiCall('user/profile');
```

## Backend API Endpoints

The following protected endpoints are now available:

### User Profile
- `GET /api/user/profile` - Get current user's profile with game data
  - Returns: user info, game profile, stats, wallet balances
  - Authentication: Required
  
- `PATCH /api/user/profile` - Update user profile
  - Body: `{ displayName?, firstName?, lastName? }`
  - Authentication: Required

### Characters
- `GET /api/user/characters` - Get user's owned characters
  - Authentication: Required

### Stats
- `GET /api/user/stats` - Get user's game statistics
  - Returns: level, xp, games played, wins, win rate
  - Authentication: Required

### Example Usage
```typescript
import { apiCall } from '@/lib/auth';

// Get user profile
const profile = await apiCall('user/profile');
console.log(profile.user.username); // "player123"
console.log(profile.profile.level); // 5

// Update profile
await apiCall('user/profile', {
  method: 'PATCH',
  body: JSON.stringify({ displayName: 'NewName' })
});
```

## Testing

1. **Clear localStorage** to test fresh login flow
2. **Visit the app** - should redirect to auth-gateway-flax.vercel.app
3. **Login or create account** at auth gateway
4. **Get redirected back** with token
5. **Check sidebar** - should show username and logout button

## Development

### Local Development
```bash
npm run dev
```

The app will run on `http://localhost:5173` (default Vite port).

### Production Build
```bash
npm run build
```

Builds to `dist/public` as configured in `vite.config.ts`.

## Environment Variables

No environment variables needed for auth gateway integration - the URL is hardcoded to production:
- `https://auth-gateway-flax.vercel.app`

If you need to test with a local auth gateway, update the `AUTH_GATEWAY` constant in `client/src/lib/auth.ts`.

## Token Storage

Tokens are stored in `localStorage`:
- `grudge_auth_token` - 64-character hex authentication token
- `grudge_user_id` - UUID of the user
- `grudge_username` - Display name of the user

## Security Notes

1. **HTTPS Only** - Auth gateway uses HTTPS (Vercel)
2. **Token Expiration** - Tokens expire after 7 days (30 days for guests)
3. **Logout** - Always clear tokens on logout
4. **API Calls** - Always include Bearer token in Authorization header

## Troubleshooting

### Token Not Persisting
- Check browser localStorage settings
- Make sure no other code is clearing localStorage

### Infinite Redirect Loop
- Verify token is being set after login
- Check browser console for errors

### 401 Unauthorized
- Token may have expired
- Try logging out and back in

## Next Steps

1. ✅ Auth integration completed
2. ✅ Logout functionality added
3. ✅ Backend API endpoints to verify tokens
4. ✅ User profile API with auth data
5. ✅ Protected routes based on user permissions
6. ⏳ Enhanced profile page UI (in progress)
7. ⏳ Deploy to production

## Related Documentation

- [Auth Gateway Integration Guide](https://github.com/yourusername/Warlord-Crafting-Suite/auth-gateway/INTEGRATION_GRUDGEWARLORDS.md)
- [Database Schema](https://github.com/yourusername/Warlord-Crafting-Suite/auth-gateway/DATABASE_SCHEMA.md)
- [Deployment Summary](https://github.com/yourusername/Warlord-Crafting-Suite/auth-gateway/DEPLOYMENT_SUMMARY.md)
