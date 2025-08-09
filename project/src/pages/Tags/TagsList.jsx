import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Input, 
  Card, 
  Space,
  Tag,
  message,
  Modal,
  Form,
  ColorPicker,
  Popconfirm
} from 'antd';
import { 
  PlusOutlined, 
  SearchOutlined, 
  EditOutlined,
  DeleteOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { Tag as TagEntity } from '../../entities/Tag';
import { Person } from '../../entities/Person';
import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';

const { Search } = Input;

const TagsList = () => {
  const { currentOrg } = useApp();
  const navigate = useNavigate();
  const [tags, setTags] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
  }, [currentOrg]);

  const loadData = async () => {
    if (!currentOrg) return;
    
    try {
      setLoading(true);
      const [tagsRes, peopleRes] = await Promise.all([
        TagEntity.list(),
        Person.list()
      ]);

      if (tagsRes.success) setTags(tagsRes.data || []);
      if (peopleRes.success) setPeople(peopleRes.data || []);
    } catch (error) {
      message.error('Failed to load tags');
    } finally {
      setLoading(false);
    }
  };

  const filteredTags = tags.filter(tag => {
    return !searchTerm || 
      tag.name?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getTagUsageCount = (tagId) => {
    return people.filter(person => person.tagIds?.includes(tagId)).length;
  };

  const handleCreate = () => {
    setEditingTag(null);
    form.resetFields();
    form.setFieldsValue({ color: '#1890ff' });
    setModalVisible(true);
  };

  const handleEdit = (tag) => {
    setEditingTag(tag);
    form.setFieldsValue({
      name: tag.name,
      color: tag.color || '#1890ff'
    });
    setModalVisible(true);
  };

  const handleSubmit = async (values) => {
    try {
      const tagData = {
        ...values,
        organizationId: currentOrg._id,
        color: typeof values.color === 'object' ? values.color.toHexString() : values.color
      };

      let result;
      if (editingTag) {
        result = await TagEntity.update(editingTag._id, tagData);
      } else {
        result = await TagEntity.create(tagData);
      }

      if (result.success) {
        message.success(editingTag ? 'Tag updated' : 'Tag created');
        setModalVisible(false);
        loadData();
      } else {
        message.error(result.message || 'Failed to save tag');
      }
    } catch (error) {
      message.error('Failed to save tag');
    }
  };

  const handleDelete = async (tag) => {
    const usageCount = getTagUsageCount(tag._id);
    
    if (usageCount > 0) {
      message.warning(`Cannot delete tag "${tag.name}" because it is used by ${usageCount} people. Remove the tag from all people first.`);
      return;
    }

    try {
      const result = await TagEntity.delete(tag._id);
      if (result.success) {
        message.success('Tag deleted');
        loadData();
      } else {
        message.error('Failed to delete tag');
      }
    } catch (error) {
      message.error('Failed to delete tag');
    }
  };

  const handleViewPeopleWithTag = (tag) => {
    navigate(`/people?tags=${tag._id}`);
  };

  const columns = [
    {
      title: 'Tag',
      key: 'tag',
      render: (_, tag) => (
        <Tag color={tag.color || '#1890ff'} className="text-sm">
          {tag.name}
        </Tag>
      ),
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Color',
      dataIndex: 'color',
      key: 'color',
      render: (color) => (
        <div className="flex items-center space-x-2">
          <div 
            className="w-6 h-6 rounded border border-gray-300"
            style={{ backgroundColor: color || '#1890ff' }}
          />
          <span className="font-mono text-sm">{color || '#1890ff'}</span>
        </div>
      ),
    },
    {
      title: 'Usage Count',
      key: 'usageCount',
      render: (_, tag) => {
        const count = getTagUsageCount(tag._id);
        return (
          <div className="flex items-center space-x-2">
            <span className="font-medium">{count}</span>
            {count > 0 && (
              <Button 
                type="link" 
                size="small"
                onClick={() => handleViewPeopleWithTag(tag)}
                className="p-0 h-auto"
              >
                View People
              </Button>
            )}
          </div>
        );
      },
      sorter: (a, b) => getTagUsageCount(a._id) - getTagUsageCount(b._id),
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
      render: (_, tag) => (
        <Space>
          <Button 
            icon={<EyeOutlined />} 
            size="small"
            onClick={() => handleViewPeopleWithTag(tag)}
            title="View people with this tag"
          />
          <Button 
            icon={<EditOutlined />} 
            size="small"
            onClick={() => handleEdit(tag)}
          />
          <Popconfirm
            title="Delete Tag"
            description={
              getTagUsageCount(tag._id) > 0 
                ? `This tag is used by ${getTagUsageCount(tag._id)} people and cannot be deleted.`
                : "Are you sure you want to delete this tag?"
            }
            onConfirm={() => handleDelete(tag)}
            disabled={getTagUsageCount(tag._id) > 0}
          >
            <Button 
              icon={<DeleteOutlined />} 
              size="small"
              danger
              disabled={getTagUsageCount(tag._id) > 0}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Tags</h1>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={handleCreate}
        >
          Add Tag
        </Button>
      </div>

      <Card>
        <div className="space-y-4">
          <Search
            placeholder="Search tags by name"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
            allowClear
          />

          <Table
            dataSource={filteredTags}
            columns={columns}
            loading={loading}
            rowKey="_id"
            pagination={{
              showSizeChanger: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} of ${total} tags`,
            }}
          />
        </div>
      </Card>

      <Modal
        title={editingTag ? 'Edit Tag' : 'Create Tag'}
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
            label="Tag Name"
            rules={[{ required: true, message: 'Tag name is required' }]}
          >
            <Input placeholder="e.g., New Member, Volunteer, etc." />
          </Form.Item>
          
          <Form.Item
            name="color"
            label="Color"
            rules={[{ required: true, message: 'Color is required' }]}
          >
            <ColorPicker
              showText
              format="hex"
              presets={[
                {
                  label: 'Recommended',
                  colors: [
                    '#1890ff', '#52c41a', '#faad14', '#f5222d',
                    '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16',
                    '#a0d911', '#1677ff', '#fa541c', '#9254de'
                  ]
                }
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TagsList;