import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Auth from './components/Auth';
import PlayerDashboard from './components/PlayerDashboard.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';


export default function App() {
  const [userRole, setUserRole] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);

  // Kontrola, zda uživatel už není přihlášen (např. po refreshi stránky)
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', session.user.email)
          .single();

        if (prof) {
          setProfileData(prof);
          setUserRole(prof.role || 'player');
        }
      }
      setLoadingSession(false);
    };

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', session.user.email)
          .single();

        if (prof) {
          setProfileData(prof);
          setUserRole(prof.role || 'player');
        }
      } else {
        setUserRole(null);
        setProfileData(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserRole(null);
    setProfileData(null);
  };

  if (loadingSession) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-slate-950 text-amber-100 font-serif">
        Načítám Zapomenutý svět...
      </div>
    );
  }

  if (userRole === 'admin') {
    return <AdminDashboard onLogout={handleLogout} />;
  }

  if (userRole === 'player') {
    return <PlayerDashboard profileData={profileData} onLogout={handleLogout} />;
  }

  return <Auth onLoginSuccess={(prof) => { setProfileData(prof); setUserRole(prof.role || 'player'); }} />;
}