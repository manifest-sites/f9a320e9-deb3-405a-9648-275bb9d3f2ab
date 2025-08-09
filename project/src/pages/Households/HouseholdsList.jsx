import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Input, 
  Card, 
  Space,
  message,
  Modal,
  Form
} from 'antd';
import { 
  PlusOutlined, 
  SearchOutlined, 
  EditOutlined,
  EyeOutlined,
  HomeOutlined
} from '@ant-design/icons';
import { Household } from '../../entities/Household';
import { HouseholdMember } from '../../entities/HouseholdMember';
import { Person } from '../../entities/Person';
import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';

const { Search } = Input;

const HouseholdsList = () => {
  const { currentOrg } = useApp();
  const navigate = useNavigate();
  const [households, setHouseholds] = useState([]);
  const [householdMembers, setHouseholdMembers] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingHousehold, setEditingHousehold] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
  }, [currentOrg]);

  const loadData = async () => {
    if (!currentOrg) return;
    
    try {
      setLoading(true);
      const [householdsRes, membersRes, peopleRes] = await Promise.all([
        Household.list(),
        HouseholdMember.list(),
        Person.list()
      ]);

      if (householdsRes.success) setHouseholds(householdsRes.data || []);
      if (membersRes.success) setHouseholdMembers(membersRes.data || []);
      if (peopleRes.success) setPeople(peopleRes.data || []);
    } catch (error) {
      message.error('Failed to load households');
    } finally {
      setLoading(false);
    }
  };

  const filteredHouseholds = households.filter(household => {
    return !searchTerm || 
      household.name?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getHouseholdMemberCount = (householdId) => {
    return householdMembers.filter(member => member.householdId === householdId).length;
  };

  const getHouseholdMembers = (householdId) => {
    return householdMembers
      .filter(member => member.householdId === householdId)
      .map(member => {
        const person = people.find(p => p._id === member.personId);
        return person ? `${person.firstName} ${person.lastName}` : 'Unknown';
      })
      .join(', ');
  };

  const handleCreateEdit = () => {
    setEditingHousehold(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (household) => {
    setEditingHousehold(household);
    form.setFieldsValue(household);
    setModalVisible(true);
  };

  const handleSubmit = async (values) => {
    try {
      const householdData = {
        ...values,
        organizationId: currentOrg._id
      };

      let result;
      if (editingHousehold) {
        result = await Household.update(editingHousehold._id, householdData);
      } else {
        result = await Household.create(householdData);
      }

      if (result.success) {
        message.success(editingHousehold ? 'Household updated' : 'Household created');
        setModalVisible(false);
        loadData();
      } else {
        message.error(result.message || 'Failed to save household');
      }
    } catch (error) {
      message.error('Failed to save household');
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name, household) => (
        <Button 
          type="link" 
          onClick={() => navigate(`/households/${household._id}`)}
          className="p-0 h-auto text-left"
          icon={<HomeOutlined />}
        >
          {name}
        </Button>
      ),
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Members',
      key: 'members',
      render: (_, household) => (
        <div>
          <div className="font-medium">{getHouseholdMemberCount(household._id)} members</div>
          <div className="text-sm text-gray-500">
            {getHouseholdMembers(household._id)}
          </div>
        </div>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => new Date(date).toLocaleDateString(),
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, household) => (
        <Space>
          <Button 
            icon={<EyeOutlined />} 
            size="small"
            onClick={() => navigate(`/households/${household._id}`)}
          />
          <Button 
            icon={<EditOutlined />} 
            size="small"
            onClick={() => handleEdit(household)}
          />
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Households</h1>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={handleCreateEdit}
        >
          Add Household
        </Button>
      </div>

      <Card>
        <div className="space-y-4">
          <Search
            placeholder="Search households by name"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
            allowClear
          />

          <Table
            dataSource={filteredHouseholds}
            columns={columns}
            loading={loading}
            rowKey="_id"
            pagination={{
              showSizeChanger: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} of ${total} households`,
            }}
          />
        </div>
      </Card>

      <Modal
        title={editingHousehold ? 'Edit Household' : 'Create Household'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="Household Name"
            rules={[{ required: true, message: 'Household name is required' }]}
          >
            <Input placeholder="e.g., The Smith Family" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default HouseholdsList;