import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const [currentOrg, setCurrentOrg] = useState(null);
  const [userRole, setUserRole] = useState('member');
  const [user, setUser] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  
  useEffect(() => {
    setCurrentOrg({ _id: 'demo-org', name: 'Grace Community Church' });
    setUser({ _id: 'demo-user', name: 'John Doe', email: 'john@example.com' });
    setOrganizations([
      { _id: 'demo-org', name: 'Grace Community Church' },
      { _id: 'demo-org-2', name: 'Faith Baptist Church' }
    ]);
  }, []);

  const value = {
    currentOrg,
    setCurrentOrg,
    userRole,
    setUserRole,
    user,
    setUser,
    organizations,
    setOrganizations,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};