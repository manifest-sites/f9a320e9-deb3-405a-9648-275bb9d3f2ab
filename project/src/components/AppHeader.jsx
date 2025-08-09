import React from 'react';
import { Layout, Select, Typography } from 'antd';
import { useApp } from '../context/AppContext';

const { Header } = Layout;
const { Title } = Typography;

const AppHeader = () => {
  const { currentOrg, organizations, setCurrentOrg } = useApp();

  const handleOrgChange = (orgId) => {
    const org = organizations.find(o => o._id === orgId);
    if (org) {
      setCurrentOrg(org);
    }
  };

  return (
    <Header className="bg-white border-b border-gray-200 px-6 flex items-center justify-between">
      <Title level={3} className="m-0 text-gray-800">
        {currentOrg?.name || 'Church CRM'}
      </Title>
      
      <Select
        value={currentOrg?._id}
        onChange={handleOrgChange}
        className="min-w-[200px]"
        placeholder="Select Organization"
      >
        {organizations.map(org => (
          <Select.Option key={org._id} value={org._id}>
            {org.name}
          </Select.Option>
        ))}
      </Select>
    </Header>
  );
};

export default AppHeader;