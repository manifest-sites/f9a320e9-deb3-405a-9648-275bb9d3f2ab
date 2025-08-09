import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Card, 
  Space,
  Switch,
  Tag,
  message,
  Modal,
  Form,
  Input,
  Select,
  Checkbox,
  Row,
  Col,
  Divider,
  List,
  Typography
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined,
  DeleteOutlined,
  DragOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { ProfileFieldDef } from '../../entities/ProfileFieldDef';
import { Person } from '../../entities/Person';
import { useApp } from '../../context/AppContext';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;

const SortableRow = ({ children, ...props }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: props['data-row-key'],
  });

  const style = {
    ...props.style,
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: 'move',
    ...(isDragging ? { position: 'relative', zIndex: 9999 } : {}),
  };

  return (
    <tr {...props} ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </tr>
  );
};

const ProfileFields = () => {
  const { currentOrg, userRole } = useApp();
  const [profileFields, setProfileFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [form] = Form.useForm();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Check if user has admin access
  const hasAdminAccess = ['admin', 'owner'].includes(userRole);

  useEffect(() => {
    loadData();
  }, [currentOrg]);

  const loadData = async () => {
    if (!currentOrg) return;
    
    try {
      setLoading(true);
      const fieldsRes = await ProfileFieldDef.list();
      if (fieldsRes.success) {
        const sortedFields = (fieldsRes.data || []).sort((a, b) => a.orderIndex - b.orderIndex);
        setProfileFields(sortedFields);
      }
    } catch (error) {
      message.error('Failed to load profile fields');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingField(null);
    form.resetFields();
    form.setFieldsValue({
      type: 'text',
      required: false,
      visibility: 'public',
      archived: false
    });
    setModalVisible(true);
  };

  const handleEdit = (field) => {
    setEditingField(field);
    form.setFieldsValue(field);
    setModalVisible(true);
  };

  const handleSubmit = async (values) => {
    try {
      const fieldData = {
        ...values,
        organizationId: currentOrg._id,
        key: values.key || values.label.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        orderIndex: editingField ? editingField.orderIndex : profileFields.length
      };

      // Handle options for select/multiselect fields
      if (['select', 'multiselect'].includes(values.type)) {
        if (!values.options || values.options.length === 0) {
          message.error('Please provide options for select fields');
          return;
        }
        fieldData.options = values.options.map(option => ({
          value: option.value || option.label.toLowerCase().replace(/[^a-z0-9]/g, '_'),
          label: option.label
        }));
      } else {
        fieldData.options = [];
      }

      let result;
      if (editingField) {
        result = await ProfileFieldDef.update(editingField._id, fieldData);
      } else {
        result = await ProfileFieldDef.create(fieldData);
      }

      if (result.success) {
        message.success(editingField ? 'Field updated' : 'Field created');
        setModalVisible(false);
        loadData();
      } else {
        message.error(result.message || 'Failed to save field');
      }
    } catch (error) {
      message.error('Failed to save field');
    }
  };

  const handleDelete = async (field) => {
    try {
      const result = await ProfileFieldDef.delete(field._id);
      if (result.success) {
        message.success('Field deleted');
        loadData();
      } else {
        message.error('Failed to delete field');
      }
    } catch (error) {
      message.error('Failed to delete field');
    }
  };

  const handleToggleArchive = async (field) => {
    try {
      const result = await ProfileFieldDef.update(field._id, {
        archived: !field.archived
      });
      if (result.success) {
        message.success(field.archived ? 'Field unarchived' : 'Field archived');
        loadData();
      }
    } catch (error) {
      message.error('Failed to update field');
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = profileFields.findIndex(field => field._id === active.id);
      const newIndex = profileFields.findIndex(field => field._id === over.id);
      
      const newFields = arrayMove(profileFields, oldIndex, newIndex);
      setProfileFields(newFields);
      
      // Update order indexes
      try {
        await Promise.all(
          newFields.map((field, index) =>
            ProfileFieldDef.update(field._id, { orderIndex: index })
          )
        );
        message.success('Field order updated');
      } catch (error) {
        message.error('Failed to update field order');
        loadData(); // Reload on error
      }
    }
  };

  const renderFieldPreview = (field) => {
    const commonProps = {
      placeholder: `Enter ${field.label}`,
      disabled: true
    };

    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'url':
        return <Input {...commonProps} />;
      case 'textarea':
        return <TextArea rows={3} {...commonProps} />;
      case 'number':
        return <Input type="number" {...commonProps} />;
      case 'date':
        return <Input type="date" {...commonProps} />;
      case 'checkbox':
        return <Checkbox disabled>{field.label}</Checkbox>;
      case 'select':
        return (
          <Select {...commonProps} className="w-full">
            {field.options?.map(option => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        );
      case 'multiselect':
        return (
          <Select {...commonProps} mode="multiple" className="w-full">
            {field.options?.map(option => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        );
      default:
        return <Input {...commonProps} />;
    }
  };

  if (!hasAdminAccess) {
    return (
      <div className="p-6 text-center">
        <Title level={3}>Access Denied</Title>
        <Text>You need admin privileges to manage profile fields.</Text>
      </div>
    );
  }

  const columns = [
    {
      title: 'Order',
      width: 60,
      render: () => <DragOutlined className="cursor-move" />,
    },
    {
      title: 'Label',
      dataIndex: 'label',
      key: 'label',
      render: (label, field) => (
        <div>
          <div className="font-medium">{label}</div>
          <Text type="secondary" className="text-sm">Key: {field.key}</Text>
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type) => <Tag>{type}</Tag>,
    },
    {
      title: 'Required',
      dataIndex: 'required',
      key: 'required',
      render: (required) => required ? <Tag color="red">Required</Tag> : <Tag>Optional</Tag>,
    },
    {
      title: 'Visibility',
      dataIndex: 'visibility',
      key: 'visibility',
      render: (visibility) => (
        <Tag color={visibility === 'staff_only' ? 'orange' : 'blue'}>
          {visibility === 'staff_only' ? 'Staff Only' : 'Public'}
        </Tag>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, field) => (
        <Switch
          checked={!field.archived}
          onChange={() => handleToggleArchive(field)}
          checkedChildren="Active"
          unCheckedChildren="Archived"
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, field) => (
        <Space>
          <Button 
            icon={<EditOutlined />} 
            size="small"
            onClick={() => handleEdit(field)}
          />
          <Button 
            icon={<DeleteOutlined />} 
            size="small"
            danger
            onClick={() => {
              Modal.confirm({
                title: 'Delete Field',
                content: `Are you sure you want to delete "${field.label}"? This action cannot be undone.`,
                onOk: () => handleDelete(field),
              });
            }}
          />
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Title level={2}>Profile Fields</Title>
        <Space>
          <Button 
            icon={<EyeOutlined />}
            onClick={() => setPreviewVisible(true)}
          >
            Preview Form
          </Button>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            Add Field
          </Button>
        </Space>
      </div>

      <Card>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={profileFields.map(field => field._id)}
            strategy={verticalListSortingStrategy}
          >
            <Table
              dataSource={profileFields}
              columns={columns}
              loading={loading}
              rowKey="_id"
              pagination={false}
              components={{
                body: {
                  row: SortableRow,
                },
              }}
            />
          </SortableContext>
        </DndContext>
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={editingField ? 'Edit Profile Field' : 'Create Profile Field'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="label"
                label="Field Label"
                rules={[{ required: true, message: 'Label is required' }]}
              >
                <Input placeholder="e.g., Date of Birth" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="key"
                label="Field Key"
                help="Auto-generated from label if not provided"
              >
                <Input placeholder="e.g., date_of_birth" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="type"
                label="Field Type"
                rules={[{ required: true, message: 'Type is required' }]}
              >
                <Select>
                  <Option value="text">Text</Option>
                  <Option value="textarea">Text Area</Option>
                  <Option value="number">Number</Option>
                  <Option value="date">Date</Option>
                  <Option value="checkbox">Checkbox</Option>
                  <Option value="select">Select</Option>
                  <Option value="multiselect">Multi-Select</Option>
                  <Option value="email">Email</Option>
                  <Option value="phone">Phone</Option>
                  <Option value="url">URL</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="visibility"
                label="Visibility"
                rules={[{ required: true, message: 'Visibility is required' }]}
              >
                <Select>
                  <Option value="public">Public</Option>
                  <Option value="staff_only">Staff Only</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="required"
            valuePropName="checked"
          >
            <Checkbox>Required field</Checkbox>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.type !== currentValues.type
            }
          >
            {({ getFieldValue }) => {
              const fieldType = getFieldValue('type');
              if (!['select', 'multiselect'].includes(fieldType)) return null;

              return (
                <Form.List name="options">
                  {(fields, { add, remove }) => (
                    <div>
                      <label className="block text-sm font-medium mb-2">Options</label>
                      {fields.map(({ key, name, ...restField }) => (
                        <Row key={key} gutter={8} className="mb-2">
                          <Col span={10}>
                            <Form.Item
                              {...restField}
                              name={[name, 'label']}
                              rules={[{ required: true, message: 'Option label is required' }]}
                            >
                              <Input placeholder="Option label" />
                            </Form.Item>
                          </Col>
                          <Col span={10}>
                            <Form.Item
                              {...restField}
                              name={[name, 'value']}
                            >
                              <Input placeholder="Option value (optional)" />
                            </Form.Item>
                          </Col>
                          <Col span={4}>
                            <Button 
                              type="text" 
                              danger 
                              onClick={() => remove(name)}
                            >
                              Delete
                            </Button>
                          </Col>
                        </Row>
                      ))}
                      <Button 
                        type="dashed" 
                        onClick={() => add()}
                        className="w-full"
                      >
                        Add Option
                      </Button>
                    </div>
                  )}
                </Form.List>
              );
            }}
          </Form.Item>
        </Form>
      </Modal>

      {/* Preview Modal */}
      <Modal
        title="Form Preview"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={null}
        width={800}
      >
        <div className="space-y-4">
          <Title level={4}>Person Form Preview</Title>
          <Text type="secondary">
            This preview shows how the current profile fields will appear in the person form.
          </Text>
          
          <Divider />
          
          <Row gutter={16}>
            {profileFields
              .filter(field => !field.archived)
              .map(field => (
                <Col xs={24} sm={field.type === 'textarea' ? 24 : 12} key={field._id}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                      {field.visibility === 'staff_only' && 
                        <Tag size="small" color="orange" className="ml-2">Staff Only</Tag>
                      }
                    </label>
                    {renderFieldPreview(field)}
                  </div>
                </Col>
              ))}
          </Row>
        </div>
      </Modal>
    </div>
  );
};

export default ProfileFields;