import { useEffect, useState } from 'react';

interface Session {
  id: string;
  userId: string;
  openingCash: number;
  isActive: boolean;
}

export const useSession = (userId: string | undefined) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    loadSession();
  }, [userId]);

  const loadSession = async () => {
    if (!userId) return;

    try {
      const activeSession = await window.api.sessions.getActive(userId);
      setSession(activeSession);
    } catch (error) {
      console.error('Failed to load session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startSession = async (openingCash: number): Promise<boolean> => {
    if (!userId) return false;

    try {
      const newSession = await window.api.sessions.start(userId, openingCash);
      setSession(newSession);
      return true;
    } catch (error) {
      console.error('Failed to start session:', error);
      return false;
    }
  };

  const endSession = async (closingCash: number): Promise<boolean> => {
    if (!session) return false;

    try {
      await window.api.sessions.end(session.id, closingCash);
      setSession(null);
      return true;
    } catch (error) {
      console.error('Failed to end session:', error);
      return false;
    }
  };

  return {
    session,
    isLoading,
    startSession,
    endSession,
    reloadSession: loadSession,
  };
};
