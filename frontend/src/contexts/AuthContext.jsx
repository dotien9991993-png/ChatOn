import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Load profile from profiles table; auto-create for Google OAuth users
  const loadProfile = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, tenant_id, display_name, role')
        .eq('id', userId)
        .single();

      if (!error && data) {
        setProfile(data);
        return;
      }

      // Profile not found — check if this is a Google OAuth user that needs setup
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser?.app_metadata?.provider === 'google' || currentUser?.app_metadata?.providers?.includes('google')) {
        // Google user without profile — auto-create tenant + profile
        const fullName = currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User';
        const slugBase = (currentUser.email?.split('@')[0] || 'shop').replace(/[^a-z0-9]/gi, '-').toLowerCase();

        // Create tenant
        const { data: tenant, error: tErr } = await supabase
          .from('tenants')
          .insert({
            name: fullName,
            slug: slugBase + '-' + Date.now().toString(36),
          })
          .select()
          .single();

        if (tErr) {
          console.error('[Auth] Failed to create tenant for Google user:', tErr.message);
          return;
        }

        // Create profile
        const { data: newProfile, error: pErr } = await supabase
          .from('profiles')
          .insert({
            id: currentUser.id,
            tenant_id: tenant.id,
            display_name: fullName,
            role: 'owner',
          })
          .select('id, tenant_id, display_name, role')
          .single();

        if (pErr) {
          console.error('[Auth] Failed to create profile for Google user:', pErr.message);
          return;
        }

        setProfile(newProfile);
      } else {
        console.error('[Auth] Failed to load profile:', error?.message);
      }
    } catch (err) {
      console.error('[Auth] Profile load error:', err.message);
    }
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        loadProfile(s.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setUser(s?.user ?? null);

      if (event === 'SIGNED_IN' && s?.user) {
        loadProfile(s.user.id);
        setSessionExpired(false);
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
      } else if (event === 'TOKEN_REFRESHED' && s?.user) {
        // Token refreshed successfully
        setSessionExpired(false);
      } else if (event === 'USER_UPDATED' && s?.user) {
        loadProfile(s.user.id);
      } else if (!s && !loading) {
        // Session lost
        setProfile(null);
        if (user) {
          // Was logged in, now session gone = expired
          setSessionExpired(true);
        }
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    setSessionExpired(false);
    return data;
  }

  async function signUp(email, password, metadata = {}) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
    setSessionExpired(false);
  }

  async function resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  }

  async function updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }

  async function resendConfirmation(email) {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });
    if (error) throw error;
  }

  const value = {
    user,
    profile,
    session,
    tenantId: profile?.tenant_id,
    loading,
    sessionExpired,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    resendConfirmation,
    accessToken: session?.access_token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
