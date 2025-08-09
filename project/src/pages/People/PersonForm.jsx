import React, { useState, useEffect } from 'react';
import { 
  Form, 
  Input, 
  Select, 
  Button, 
  Card, 
  Row, 
  Col, 
  Tag, 
  Space,
  Checkbox,
  DatePicker,
  InputNumber,
  message,
  Modal
} from 'antd';
import { PlusOutlined, SaveOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { Person } from '../../entities/Person';
import { Tag as TagEntity } from '../../entities/Tag';
import { ProfileFieldDef } from '../../entities/ProfileFieldDef';
import { useApp } from '../../context/AppContext';
import moment from 'moment';

const { Option } = Select;
const { TextArea } = Input;

const PersonForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentOrg, userRole } = useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [person, setPerson] = useState(null);
  const [tags, setTags] = useState([]);
  const [profileFields, setProfileFields] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [newTagName, setNewTagName] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  const isEditing = Boolean(id);

  useEffect(() => {
    loadData();
  }, [id, currentOrg]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  const loadData = async () => {
    if (!currentOrg) return;
    
    try {
      setLoading(true);
      const [tagsRes, fieldsRes] = await Promise.all([
        TagEntity.list(),
        ProfileFieldDef.list()
      ]);

      if (tagsRes.success) setTags(tagsRes.data || []);
      if (fieldsRes.success) {
        const visibleFields = (fieldsRes.data || []).filter(field => 
          !field.archived && 
          (field.visibility !== 'staff_only' || ['admin', 'owner'].includes(userRole))
        );
        setProfileFields(visibleFields);
      }

      if (isEditing) {
        const personRes = await Person.get(id);
        if (personRes.success) {
          const personData = personRes.data;
          setPerson(personData);
          setSelectedTags(personData.tagIds || []);
          
          // Set form values
          const formValues = {
            ...personData,
            ...personData.fields,
          };
          form.setFieldsValue(formValues);
        }
      }
    } catch (error) {
      message.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      
      // Separate core fields from dynamic fields
      const { firstName, lastName, preferredName, email, phone, status, ...dynamicFields } = values;
      
      const personData = {
        organizationId: currentOrg._id,
        firstName,
        lastName,
        preferredName,
        email,
        phone,
        status,
        fields: dynamicFields,
        tagIds: selectedTags,
      };

      let result;
      if (isEditing) {
        result = await Person.update(id, personData);
      } else {
        result = await Person.create(personData);
      }

      if (result.success) {
        message.success(isEditing ? 'Person updated' : 'Person created');
        setHasChanges(false);
        navigate('/people');
      } else {
        message.error(result.message || 'Failed to save person');
      }
    } catch (error) {
      message.error('Failed to save person');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    
    try {
      const result = await TagEntity.create({
        organizationId: currentOrg._id,
        name: newTagName.trim(),
        color: '#1890ff'
      });
      
      if (result.success) {
        const newTag = result.data;
        setTags([...tags, newTag]);
        setSelectedTags([...selectedTags, newTag._id]);
        setNewTagName('');
        message.success('Tag created');
      }
    } catch (error) {
      message.error('Failed to create tag');
    }
  };

  const renderDynamicField = (field) => {
    const key = field.key;
    const rules = field.required ? [{ required: true, message: `${field.label} is required` }] : [];

    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'url':
        return (
          <Form.Item
            key={key}
            name={key}
            label={field.label}
            rules={rules}
          >
            <Input type={field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text'} />
          </Form.Item>
        );

      case 'textarea':
        return (
          <Form.Item
            key={key}
            name={key}
            label={field.label}
            rules={rules}
          >
            <TextArea rows={3} />
          </Form.Item>
        );

      case 'number':
        return (
          <Form.Item
            key={key}
            name={key}
            label={field.label}
            rules={rules}
          >
            <InputNumber className="w-full" />
          </Form.Item>
        );

      case 'date':
        return (
          <Form.Item
            key={key}
            name={key}
            label={field.label}
            rules={rules}
          >
            <DatePicker className="w-full" />
          </Form.Item>
        );

      case 'checkbox':
        return (
          <Form.Item
            key={key}
            name={key}
            label={field.label}
            valuePropName="checked"
            rules={rules}
          >
            <Checkbox />
          </Form.Item>
        );

      case 'select':
        return (
          <Form.Item
            key={key}
            name={key}
            label={field.label}
            rules={rules}
          >
            <Select placeholder={`Select ${field.label}`}>
              {field.options?.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        );

      case 'multiselect':
        return (
          <Form.Item
            key={key}
            name={key}
            label={field.label}
            rules={rules}
          >
            <Select mode="multiple" placeholder={`Select ${field.label}`}>
              {field.options?.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        );

      default:
        return null;
    }
  };

  const handleFormChange = () => {
    setHasChanges(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={() => {
              if (hasChanges) {
                Modal.confirm({
                  title: 'Unsaved Changes',
                  content: 'You have unsaved changes. Are you sure you want to leave?',
                  onOk: () => navigate('/people'),
                });
              } else {
                navigate('/people');
              }
            }}
          />
          <h1 className="text-2xl font-semibold">
            {isEditing ? 'Edit Person' : 'Add Person'}
          </h1>
        </div>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        onValuesChange={handleFormChange}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            <Card title="Basic Information" className="mb-4">
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="firstName"
                    label="First Name"
                    rules={[{ required: true, message: 'First name is required' }]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="lastName"
                    label="Last Name"
                    rules={[{ required: true, message: 'Last name is required' }]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="preferredName" label="Preferred Name">
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="status"
                    label="Status"
                    rules={[{ required: true, message: 'Status is required' }]}
                  >
                    <Select>
                      <Option value="active">Active</Option>
                      <Option value="inactive">Inactive</Option>
                      <Option value="visitor">Visitor</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="email" label="Email">
                    <Input type="email" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="phone" label="Phone">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {profileFields.length > 0 && (
              <Card title="Additional Information" className="mb-4">
                <Row gutter={16}>
                  {profileFields.map(field => (
                    <Col xs={24} sm={field.type === 'textarea' ? 24 : 12} key={field._id}>
                      {renderDynamicField(field)}
                    </Col>
                  ))}
                </Row>
              </Card>
            )}
          </Col>

          <Col xs={24} lg={8}>
            <Card title="Tags" className="mb-4">
              <div className="space-y-3">
                <div className="space-y-2">
                  {selectedTags.map(tagId => {
                    const tag = tags.find(t => t._id === tagId);
                    return tag ? (
                      <Tag
                        key={tagId}
                        closable
                        color={tag.color}
                        onClose={() => setSelectedTags(selectedTags.filter(id => id !== tagId))}
                      >
                        {tag.name}
                      </Tag>
                    ) : null;
                  })}
                </div>
                
                <Select
                  placeholder="Add tags"
                  value={null}
                  onChange={(tagId) => {
                    if (tagId && !selectedTags.includes(tagId)) {
                      setSelectedTags([...selectedTags, tagId]);
                    }
                  }}
                  className="w-full"
                >
                  {tags
                    .filter(tag => !selectedTags.includes(tag._id))
                    .map(tag => (
                      <Option key={tag._id} value={tag._id}>
                        {tag.name}
                      </Option>
                    ))}
                </Select>

                <div className="flex space-x-2">
                  <Input
                    placeholder="New tag name"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onPressEnter={handleCreateTag}
                  />
                  <Button 
                    icon={<PlusOutlined />} 
                    onClick={handleCreateTag}
                    disabled={!newTagName.trim()}
                  />
                </div>
              </div>
            </Card>

            <Card title="Actions">
              <Space direction="vertical" className="w-full">
                <Button 
                  type="primary" 
                  icon={<SaveOutlined />}
                  htmlType="submit"
                  loading={loading}
                  className="w-full"
                >
                  {isEditing ? 'Update Person' : 'Create Person'}
                </Button>
              </Space>
            </Card>
          </Col>
        </Row>
      </Form>
    </div>
  );
};

export default PersonForm;