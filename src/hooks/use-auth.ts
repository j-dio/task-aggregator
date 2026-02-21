"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types";
import type { User } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

/**
 * Client-side hook for accessing current user and profile state.
 * Subscribes to Supabase auth state changes for real-time updates.
 */
export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (data) {
      setProfile({
        id: data.id,
        displayName: data.display_name,
        universityId: data.university_id,
        uvecIcalUrl: data.uvec_ical_url,
        googleConnected: data.google_connected,
        notificationEnabled: data.notification_enabled,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      });
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();

    // Get initial session
    async function getInitialSession() {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      setUser(currentUser);

      if (currentUser) {
        await fetchProfile(currentUser.id);
      }

      setIsLoading(false);
    }

    void getInitialSession();

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (
        currentUser &&
        (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")
      ) {
        await fetchProfile(currentUser.id);
      }

      if (event === "SIGNED_OUT") {
        setProfile(null);
      }

      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  return {
    user,
    profile,
    isLoading,
    isAuthenticated: !!user,
  };
}
