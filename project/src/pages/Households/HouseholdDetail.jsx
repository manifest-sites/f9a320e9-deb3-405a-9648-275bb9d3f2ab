import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Space, 
  List,
  Select,
  message,
  Modal,
  Tag,
  Avatar,
  Typography
} from 'antd';
import { 
  ArrowLeftOutlined,
  EditOutlined,
  PlusOutlined,
  UserOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { Household } from '../../entities/Household';
import { HouseholdMember } from '../../entities/HouseholdMember';
import { Person } from '../../entities/Person';
import { useApp } from '../../context/AppContext';

const { Title, Text } = Typography;

const HouseholdDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentOrg } = useApp();
  const [household, setHousehold] = useState(null);
  const [members, setMembers] = useState([]);
  const [people, setPeople] = useState([]);
  const [availablePeople, setAvailablePeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addMemberVisible, setAddMemberVisible] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [selectedRelationship, setSelectedRelationship] = useState('other');

  useEffect(() => {
    if (id && currentOrg) {
      loadData();
    }
  }, [id, currentOrg]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [householdRes, membersRes, peopleRes] = await Promise.all([
        Household.get(id),
        HouseholdMember.list(),
        Person.list()
      ]);

      if (householdRes.success) setHousehold(householdRes.data);
      if (peopleRes.success) setPeople(peopleRes.data || []);
      
      if (membersRes.success) {
        const householdMembers = (membersRes.data || []).filter(member => member.householdId === id);
        setMembers(householdMembers);
        
        // Set available people (those not in this household)
        const memberPersonIds = householdMembers.map(member => member.personId);
        const available = (peopleRes.data || []).filter(person => !memberPersonIds.includes(person._id));
        setAvailablePeople(available);
      }
    } catch (error) {
      message.error('Failed to load household data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedPerson) return;

    try {
      const result = await HouseholdMember.create({
        organizationId: currentOrg._id,
        householdId: id,
        personId: selectedPerson,
        relationship: selectedRelationship
      });

      if (result.success) {
        message.success('Member added to household');
        setAddMemberVisible(false);
        setSelectedPerson(null);
        setSelectedRelationship('other');
        loadData();
      } else {
        message.error('Failed to add member');
      }
    } catch (error) {
      message.error('Failed to add member');
    }
  };

  const handleRemoveMember = async (memberId) => {
    try {
      const result = await HouseholdMember.delete(memberId);
      if (result.success) {
        message.success('Member removed from household');
        loadData();
      } else {
        message.error('Failed to remove member');
      }
    } catch (error) {
      message.error('Failed to remove member');
    }
  };

  const getPersonById = (personId) => people.find(p => p._id === personId);

  const getRelationshipColor = (relationship) => {
    switch (relationship) {
      case 'head': return 'blue';
      case 'spouse': return 'purple';
      case 'child': return 'green';
      default: return 'default';
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!household) {
    return <div className="p-6">Household not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate('/households')}
          />
          <Title level={2} className="m-0">{household.name}</Title>
        </div>
        <Space>
          <Button 
            icon={<PlusOutlined />}
            onClick={() => setAddMemberVisible(true)}
          >
            Add Member
          </Button>
          <Button 
            type="primary"
            icon={<EditOutlined />}
          >
            Edit Household
          </Button>
        </Space>
      </div>

      <Card title={`Members (${members.length})`}>
        <List
          dataSource={members}
          renderItem={(member) => {
            const person = getPersonById(member.personId);
            if (!person) return null;
            
            return (
              <List.Item
                actions={[
                  <Button
                    key="view"
                    type="link"
                    onClick={() => navigate(`/people/${person._id}`)}
                  >
                    View
                  </Button>,
                  <Button
                    key="remove"
                    type="link"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => {
                      Modal.confirm({
                        title: 'Remove Member',
                        content: `Are you sure you want to remove ${person.firstName} ${person.lastName} from this household?`,
                        onOk: () => handleRemoveMember(member._id),
                      });
                    }}
                  >
                    Remove
                  </Button>
                ]}
              >
                <List.Item.Meta
                  avatar={<Avatar icon={<UserOutlined />} />}
                  title={
                    <div className="flex items-center space-x-2">
                      <span>{person.firstName} {person.lastName}</span>
                      <Tag color={getRelationshipColor(member.relationship)}>
                        {member.relationship}
                      </Tag>
                    </div>
                  }
                  description={
                    <div>
                      {person.email && <div>📧 {person.email}</div>}
                      {person.phone && <div>📞 {person.phone}</div>}
                      <Tag color={
                        person.status === 'active' ? 'green' :
                        person.status === 'inactive' ? 'red' : 'blue'
                      }>
                        {person.status?.toUpperCase()}
                      </Tag>
                    </div>
                  }
                />
              </List.Item>
            );
          }}
          locale={{ emptyText: 'No members in this household' }}
        />
      </Card>

      <Modal
        title="Add Member to Household"
        open={addMemberVisible}
        onOk={handleAddMember}
        onCancel={() => {
          setAddMemberVisible(false);
          setSelectedPerson(null);
          setSelectedRelationship('other');
        }}
        okText="Add Member"
        okButtonProps={{ disabled: !selectedPerson }}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Select Person</label>
            <Select
              value={selectedPerson}
              onChange={setSelectedPerson}
              className="w-full"
              placeholder="Choose a person to add"
              showSearch
              filterOption={(input, option) =>
                option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {availablePeople.map(person => (
                <Select.Option key={person._id} value={person._id}>
                  {person.firstName} {person.lastName}
                  {person.email && ` (${person.email})`}
                </Select.Option>
              ))}
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Relationship</label>
            <Select
              value={selectedRelationship}
              onChange={setSelectedRelationship}
              className="w-full"
            >
              <Select.Option value="head">Head of Household</Select.Option>
              <Select.Option value="spouse">Spouse</Select.Option>
              <Select.Option value="child">Child</Select.Option>
              <Select.Option value="other">Other</Select.Option>
            </Select>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default HouseholdDetail;