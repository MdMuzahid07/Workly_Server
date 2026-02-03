import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

import config from "../config/index.js";

/**
 * Passport Google OAuth Strategy
 */
if (config.google_client_id && config.google_client_secret) {
  passport.use(
    "google",
    new GoogleStrategy(
      {
        clientID: config.google_client_id as string,
        clientSecret: config.google_client_secret as string,
        callbackURL: `${config.backend_url}/api/v1/auth/google/callback`,
        scope: ["profile", "email"],
        proxy: true, // Important for correct callback URL in production (https)
      },
      async (
        _accessToken: string,
        _refreshToken: string,
        profile: any, // Profile type from passport-google-oauth20
        done: (error: any, user?: any, info?: any) => void,
      ) => {
        try {
          // Extract profile data
          const googleProfile = {
            googleId: profile.id,
            email: profile.emails?.[0]?.value || "",
            name: profile.displayName,
            avatar: profile.photos?.[0]?.value,
          };

          return done(null, googleProfile);
        } catch (error) {
          return done(error as Error, undefined);
        }
      },
    ),
  );
} else {
  console.warn(
    "⚠️  Google OAuth strategy not registered: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set",
  );
}

export default passport;
