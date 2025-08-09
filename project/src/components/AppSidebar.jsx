import React from 'react';
import { Layout, Menu } from 'antd';
import { 
  DashboardOutlined, 
  UserOutlined, 
  HomeOutlined, 
  TagOutlined, 
  SettingOutlined 
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const { Sider } = Layout;

const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { userRole } = useApp();

  // Check permissions
  const canWrite = ['admin', 'owner', 'member'].includes(userRole);
  const canManageSettings = ['admin', 'owner'].includes(userRole);

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/people',
      icon: <UserOutlined />,
      label: 'People',
    },
    {
      key: '/households',
      icon: <HomeOutlined />,
      label: 'Households',
    },
    {
      key: '/tags',
      icon: <TagOutlined />,
      label: 'Tags',
    },
    ...(canManageSettings ? [{
      key: '/settings',
      icon: <SettingOutlined />,
      label: 'Settings',
      children: [
        {
          key: '/settings/profile-fields',
          label: 'Profile Fields',
        },
      ],
    }] : []),
  ];

  const handleMenuClick = ({ key }) => {
    navigate(key);
  };

  return (
    <Sider width={240} className="bg-gray-50 border-r border-gray-200">
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={handleMenuClick}
        className="bg-gray-50 border-0"
      />
    </Sider>
  );
};

export default AppSidebar;