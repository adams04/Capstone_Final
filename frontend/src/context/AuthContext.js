import React, { createContext, useState, useEffect, useContext } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Fetch fresh user data including profile image
          const response = await fetch('/api/auth/user-profile', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
          } else {
            // If fetch fails, fall back to localStorage
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
              setUser(JSON.parse(storedUser));
            }
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            setUser(JSON.parse(storedUser));
          }
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (userData, token) => {
    // Ensure we have all user data including profileImage
    const completeUserData = {
      ...userData,
      profileImage: userData.profileImage || null // Default to null if not provided
    };
    
    localStorage.setItem('user', JSON.stringify(completeUserData));
    localStorage.setItem('token', token);
    setUser(completeUserData);
  };

  const updateProfileImage = (imageUrl) => {
    const updatedUser = {
      ...user,
      profileImage: imageUrl
    };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      login, 
      logout,
      updateProfileImage // Add this method to update profile image
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);