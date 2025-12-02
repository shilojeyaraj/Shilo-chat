'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, Save, Briefcase, Code, GraduationCap, Award, FileText, User, Mail, Tag, Upload, Loader2 } from 'lucide-react';
import { PersonalInfo } from '@/lib/db';
import { savePersonalInfo, getPersonalInfo, deletePersonalInfo } from '@/lib/utils/personal-info';
import toast from 'react-hot-toast';

interface PersonalInfoProps {
  onClose: () => void;
}

const CATEGORIES: Array<{ value: PersonalInfo['category']; label: string; icon: React.ReactNode }> = [
  { value: 'experience', label: 'Experience', icon: <Briefcase className="w-4 h-4" /> },
  { value: 'project', label: 'Project', icon: <Code className="w-4 h-4" /> },
  { value: 'education', label: 'Education', icon: <GraduationCap className="w-4 h-4" /> },
  { value: 'skill', label: 'Skill', icon: <Award className="w-4 h-4" /> },
  { value: 'resume', label: 'Resume', icon: <FileText className="w-4 h-4" /> },
  { value: 'achievement', label: 'Achievement', icon: <Award className="w-4 h-4" /> },
  { value: 'contact', label: 'Contact', icon: <Mail className="w-4 h-4" /> },
  { value: 'general', label: 'General', icon: <User className="w-4 h-4" /> },
];

export default function PersonalInfoManager({ onClose }: PersonalInfoProps) {
  const [items, setItems] = useState<PersonalInfo[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<PersonalInfo['category'] | 'all'>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<Partial<PersonalInfo>>({
    category: 'general',
    title: '',
    content: '',
    tags: [],
    metadata: {},
  });
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);

  useEffect(() => {
    loadItems();
  }, [selectedCategory]);

  const loadItems = async () => {
    try {
      const allItems = await getPersonalInfo(selectedCategory === 'all' ? undefined : selectedCategory);
      setItems(allItems);
    } catch (error) {
      console.error('Failed to load personal info:', error);
      toast.error('Failed to load personal information');
    }
  };

  const handleSave = async () => {
    if (!formData.title || !formData.content) {
      toast.error('Title and content are required');
      return;
    }

    try {
      if (editingId) {
        await savePersonalInfo({ ...formData, id: editingId } as PersonalInfo);
        toast.success('Updated successfully');
        setEditingId(null);
      } else {
        await savePersonalInfo(formData as Omit<PersonalInfo, 'id' | 'createdAt' | 'updatedAt'>);
        toast.success('Added successfully');
        setIsAdding(false);
      }
      
      setFormData({
        category: 'general',
        title: '',
        content: '',
        tags: [],
        metadata: {},
      });
      loadItems();
    } catch (error) {
      console.error('Failed to save personal info:', error);
      toast.error('Failed to save');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      await deletePersonalInfo(id);
      toast.success('Deleted successfully');
      loadItems();
    } catch (error) {
      console.error('Failed to delete:', error);
      toast.error('Failed to delete');
    }
  };

  const handleEdit = (item: PersonalInfo) => {
    setEditingId(item.id!);
    setFormData(item);
    setIsAdding(false);
  };

  const handleAddNew = () => {
    setIsAdding(true);
    setEditingId(null);
    setFormData({
      category: 'general',
      title: '',
      content: '',
      tags: [],
      metadata: {},
    });
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setExtractedData(null);
    setFormData({
      category: 'general',
      title: '',
      content: '',
      tags: [],
      metadata: {},
    });
  };

  // Handle file upload and extraction
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['application/pdf', 'text/plain', 'text/markdown'];
    const validExtensions = ['.pdf', '.txt', '.md'];
    const isValidType = validTypes.includes(file.type) || 
                       validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

    if (!isValidType) {
      toast.error('Please upload a PDF, TXT, or MD file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setIsExtracting(true);
    setIsAdding(true);
    setEditingId(null);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('file', file);
      formDataToSend.append('fileType', file.type);

      const response = await fetch('/api/personal-info/extract', {
        method: 'POST',
        body: formDataToSend,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to extract information');
      }

      setExtractedData(result.data);
      
      // Auto-fill form with extracted data
      await autoFillFromExtractedData(result.data);
      
      toast.success('Information extracted! Review and edit before saving.');
    } catch (error: any) {
      console.error('Extraction error:', error);
      toast.error(error.message || 'Failed to extract information from file');
    } finally {
      setIsExtracting(false);
      e.target.value = ''; // Reset file input
    }
  };

  // Auto-fill form fields from extracted data
  const autoFillFromExtractedData = async (data: any) => {
    const itemsToAdd: Array<{ category: PersonalInfo['category']; data: Partial<PersonalInfo> }> = [];

    // Contact information
    if (data.contact) {
      const contact = data.contact;
      if (contact.name || contact.email || contact.phone) {
        itemsToAdd.push({
          category: 'contact',
          data: {
            category: 'contact',
            title: contact.name || 'Contact Information',
            content: [
              contact.email && `Email: ${contact.email}`,
              contact.phone && `Phone: ${contact.phone}`,
              contact.location && `Location: ${contact.location}`,
              contact.linkedin && `LinkedIn: ${contact.linkedin}`,
              contact.github && `GitHub: ${contact.github}`,
              contact.website && `Website: ${contact.website}`,
            ].filter(Boolean).join('\n'),
            metadata: {
              email: contact.email,
              phone: contact.phone,
              location: contact.location,
              linkedin: contact.linkedin,
              github: contact.github,
              website: contact.website,
            },
          },
        });
      }
    }

    // Experience
    if (data.experience && Array.isArray(data.experience)) {
      data.experience.forEach((exp: any) => {
        if (exp.title || exp.company) {
          itemsToAdd.push({
            category: 'experience',
            data: {
              category: 'experience',
              title: `${exp.title || 'Position'}${exp.company ? ` at ${exp.company}` : ''}`,
              content: exp.description || '',
              metadata: {
                company: exp.company,
                location: exp.location,
                startDate: exp.startDate,
                endDate: exp.endDate,
              },
            },
          });
        }
      });
    }

    // Education
    if (data.education && Array.isArray(data.education)) {
      data.education.forEach((edu: any) => {
        if (edu.degree || edu.institution) {
          itemsToAdd.push({
            category: 'education',
            data: {
              category: 'education',
              title: `${edu.degree || 'Education'}${edu.institution ? ` - ${edu.institution}` : ''}`,
              content: [
                edu.description,
                edu.gpa && `GPA: ${edu.gpa}`,
                edu.graduationDate && `Graduated: ${edu.graduationDate}`,
              ].filter(Boolean).join('\n'),
              metadata: {
                institution: edu.institution,
                location: edu.location,
                graduationDate: edu.graduationDate,
                gpa: edu.gpa,
              },
            },
          });
        }
      });
    }

    // Skills
    if (data.skills && Array.isArray(data.skills) && data.skills.length > 0) {
      itemsToAdd.push({
        category: 'skill',
        data: {
          category: 'skill',
          title: 'Technical Skills',
          content: data.skills.join(', '),
          tags: data.skills,
        },
      });
    }

    // Projects
    if (data.projects && Array.isArray(data.projects)) {
      data.projects.forEach((proj: any) => {
        if (proj.name) {
          itemsToAdd.push({
            category: 'project',
            data: {
              category: 'project',
              title: proj.name,
              content: proj.description || '',
              tags: proj.technologies || [],
              metadata: {
                url: proj.url,
                technologies: proj.technologies || [],
              },
            },
          });
        }
      });
    }

    // Achievements
    if (data.achievements && Array.isArray(data.achievements) && data.achievements.length > 0) {
      data.achievements.forEach((ach: string) => {
        itemsToAdd.push({
          category: 'achievement',
          data: {
            category: 'achievement',
            title: ach,
            content: ach,
          },
        });
      });
    }

    // Summary
    if (data.summary) {
      itemsToAdd.push({
        category: 'general',
        data: {
          category: 'general',
          title: 'Professional Summary',
          content: data.summary,
        },
      });
    }

    // If we have items to add, show the first one in the form for review
    if (itemsToAdd.length > 0) {
      setFormData(itemsToAdd[0].data as Partial<PersonalInfo>);
      // Store all extracted items for batch saving
      setExtractedData({ ...data, _itemsToAdd: itemsToAdd });
      toast.success(`Extracted ${itemsToAdd.length} items. Review the first one, then you can save all or edit individually.`);
    } else {
      toast.error('No structured information found in the document');
    }
  };

  // Save all extracted items at once
  const handleSaveAllExtracted = async () => {
    if (!extractedData?._itemsToAdd || extractedData._itemsToAdd.length === 0) {
      toast.error('No extracted items to save');
      return;
    }

    try {
      let savedCount = 0;
      for (const item of extractedData._itemsToAdd) {
        await savePersonalInfo(item.data as Omit<PersonalInfo, 'id' | 'createdAt' | 'updatedAt'>);
        savedCount++;
      }
      
      toast.success(`Successfully saved ${savedCount} items!`);
      setExtractedData(null);
      setIsAdding(false);
      setFormData({
        category: 'general',
        title: '',
        content: '',
        tags: [],
        metadata: {},
      });
      loadItems();
    } catch (error) {
      console.error('Failed to save extracted items:', error);
      toast.error('Failed to save some items');
    }
  };

  const filteredItems = selectedCategory === 'all' 
    ? items 
    : items.filter(item => item.category === selectedCategory);

  const groupedItems = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, PersonalInfo[]>);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Personal Information</h2>
          <div className="flex items-center gap-3">
            {/* File Upload Button in Header */}
            <label className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg cursor-pointer transition-colors text-sm font-medium">
              {isExtracting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Extracting...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload File
                </>
              )}
              <input
                type="file"
                accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isExtracting}
              />
            </label>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Category Filter */}
          <div className="mb-6 flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              All
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1.5 ${
                  selectedCategory === cat.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {cat.icon}
                {cat.label}
              </button>
            ))}
          </div>

          {/* Add/Edit Form */}
          {(isAdding || editingId !== null) && (
            <div className="mb-6 p-4 bg-gray-700 rounded-lg border border-gray-600">
              <h3 className="text-lg font-semibold text-white mb-4">
                {editingId ? 'Edit Item' : 'Add New Item'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as PersonalInfo['category'] })}
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Senior Software Engineer at Google"
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Content *</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Describe your experience, project, or information..."
                    rows={6}
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={formData.tags?.join(', ') || ''}
                    onChange={(e) => {
                      const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                      setFormData({ ...formData, tags });
                    }}
                    placeholder="e.g., React, TypeScript, Full Stack"
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Metadata fields based on category */}
                {(formData.category === 'experience' || formData.category === 'project') && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Company/Organization</label>
                        <input
                          type="text"
                          value={formData.metadata?.company || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            metadata: { ...formData.metadata, company: e.target.value }
                          })}
                          className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Location</label>
                        <input
                          type="text"
                          value={formData.metadata?.location || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            metadata: { ...formData.metadata, location: e.target.value }
                          })}
                          className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Start Date</label>
                        <input
                          type="text"
                          value={formData.metadata?.startDate || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            metadata: { ...formData.metadata, startDate: e.target.value }
                          })}
                          placeholder="e.g., Jan 2020"
                          className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">End Date</label>
                        <input
                          type="text"
                          value={formData.metadata?.endDate || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            metadata: { ...formData.metadata, endDate: e.target.value }
                          })}
                          placeholder="e.g., Present or Dec 2023"
                          className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">Technologies (comma-separated)</label>
                      <input
                        type="text"
                        value={formData.metadata?.technologies?.join(', ') || ''}
                        onChange={(e) => {
                          const technologies = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                          setFormData({
                            ...formData,
                            metadata: { ...formData.metadata, technologies }
                          });
                        }}
                        placeholder="e.g., React, Node.js, Python"
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </>
                )}

                {formData.category === 'project' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Project URL</label>
                    <input
                      type="url"
                      value={formData.metadata?.url || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        metadata: { ...formData.metadata, url: e.target.value }
                      })}
                      placeholder="https://..."
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                  {extractedData?._itemsToAdd && extractedData._itemsToAdd.length > 1 && (
                    <button
                      onClick={handleSaveAllExtracted}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                      title={`Save all ${extractedData._itemsToAdd.length} extracted items`}
                    >
                      <Save className="w-4 h-4" />
                      Save All ({extractedData._itemsToAdd.length})
                    </button>
                  )}
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Add Button and File Upload */}
          {!isAdding && editingId === null && (
            <div className="mb-4 flex items-center gap-3">
              <button
                onClick={handleAddNew}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add New Item
              </button>
              <label className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 transition-colors cursor-pointer">
                {isExtracting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload File (PDF/TXT/MD)
                  </>
                )}
                <input
                  type="file"
                  accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isExtracting}
                />
              </label>
            </div>
          )}

          {/* Items List */}
          {Object.keys(groupedItems).length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p>No personal information stored yet.</p>
              <p className="text-sm mt-2">Click "Add New Item" to get started.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedItems).map(([category, categoryItems]) => {
                const categoryInfo = CATEGORIES.find(c => c.value === category);
                return (
                  <div key={category}>
                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      {categoryInfo?.icon}
                      {categoryInfo?.label} ({categoryItems.length})
                    </h3>
                    <div className="space-y-3">
                      {categoryItems.map((item) => (
                        <div
                          key={item.id}
                          className="p-4 bg-gray-700 rounded-lg border border-gray-600 hover:border-gray-500 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="text-white font-medium mb-1">{item.title}</h4>
                              <p className="text-gray-300 text-sm mb-2 whitespace-pre-wrap">{item.content}</p>
                              
                              {item.metadata && (
                                <div className="text-xs text-gray-400 space-y-1 mt-2">
                                  {item.metadata.company && <div>Company: {item.metadata.company}</div>}
                                  {item.metadata.location && <div>Location: {item.metadata.location}</div>}
                                  {(item.metadata.startDate || item.metadata.endDate) && (
                                    <div>
                                      {[item.metadata.startDate, item.metadata.endDate].filter(Boolean).join(' - ')}
                                    </div>
                                  )}
                                  {item.metadata.technologies && item.metadata.technologies.length > 0 && (
                                    <div>Technologies: {item.metadata.technologies.join(', ')}</div>
                                  )}
                                  {item.metadata.url && (
                                    <div>
                                      <a href={item.metadata.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                                        {item.metadata.url}
                                      </a>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {item.tags && item.tags.length > 0 && (
                                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                  <Tag className="w-3 h-3 text-gray-400" />
                                  {item.tags.map((tag, idx) => (
                                    <span
                                      key={idx}
                                      className="px-2 py-0.5 bg-gray-600 text-gray-300 text-xs rounded"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2 ml-4">
                              <button
                                onClick={() => handleEdit(item)}
                                className="p-1.5 text-gray-400 hover:text-blue-400 transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(item.id!)}
                                className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

