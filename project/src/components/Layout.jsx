import React from 'react';
import { Layout as AntLayout } from 'antd';
import AppHeader from './AppHeader';
import AppSidebar from './AppSidebar';

const { Content } = AntLayout;

const Layout = ({ children }) => {
  return (
    <AntLayout className="min-h-screen">
      <AppHeader />
      <AntLayout>
        <AppSidebar />
        <Content className="p-6 bg-gray-50">
          {children}
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default Layout;