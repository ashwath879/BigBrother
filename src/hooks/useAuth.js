import { useCallback, useEffect, useMemo, useState } from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth } from "../firebase";

const provider = new GoogleAuthProvider();
provider.addScope("profile");
provider.addScope("email");

export function useAuth() {
  const [user, setUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setIsAuthReady(true);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  }, []);

  const signOutUser = useCallback(async () => {
    await signOut(auth);
  }, []);

  return useMemo(
    () => ({
      user,
      isAuthReady,
      signInWithGoogle,
      signOutUser,
    }),
    [isAuthReady, signInWithGoogle, signOutUser, user]
  );
}
