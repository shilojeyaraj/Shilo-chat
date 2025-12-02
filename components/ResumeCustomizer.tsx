'use client';

import React, { useState, useEffect } from 'react';
import { X, FileText, Copy, Download, Loader2, Upload, Edit2, Check, Mail } from 'lucide-react';
import { getPersonalInfoContext } from '@/lib/utils/personal-info';
import { saveResumeTemplate, getResumeTemplate } from '@/lib/utils/resume-template';
import { saveCoverLetterTemplate, getCoverLetterTemplate } from '@/lib/utils/cover-letter-template';
import toast from 'react-hot-toast';

interface ResumeCustomizerProps {
  onClose: () => void;
}

type CustomizerMode = 'resume' | 'cover-letter';

export default function ResumeCustomizer({ onClose }: ResumeCustomizerProps) {
  const [mode, setMode] = useState<CustomizerMode>('resume');
  
  // Resume state
  const [latexResume, setLatexResume] = useState('');
  const [isEditingResumeTemplate, setIsEditingResumeTemplate] = useState(false);
  const [resumeTemplateSaved, setResumeTemplateSaved] = useState(false);
  
  // Cover letter state
  const [coverLetterTemplate, setCoverLetterTemplate] = useState('');
  const [isEditingCoverLetterTemplate, setIsEditingCoverLetterTemplate] = useState(false);
  const [coverLetterTemplateSaved, setCoverLetterTemplateSaved] = useState(false);
  const [coverLetterPrompt, setCoverLetterPrompt] = useState('');
  
  // Shared state
  const [jobPosting, setJobPosting] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [optimizedContent, setOptimizedContent] = useState('');
  const [personalInfoLoaded, setPersonalInfoLoaded] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load saved templates
        const savedResumeTemplate = await getResumeTemplate();
        if (savedResumeTemplate) {
          setLatexResume(savedResumeTemplate);
          setResumeTemplateSaved(true);
        } else {
          setIsEditingResumeTemplate(true);
        }

        const savedCoverLetterTemplate = await getCoverLetterTemplate();
        if (savedCoverLetterTemplate) {
          setCoverLetterTemplate(savedCoverLetterTemplate);
          setCoverLetterTemplateSaved(true);
        } else {
          setIsEditingCoverLetterTemplate(true);
        }

        // Check personal info
        const context = await getPersonalInfoContext();
        setPersonalInfoLoaded(context.length > 0);
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };
    loadData();
  }, []);

  const handleSaveResumeTemplate = async () => {
    if (!latexResume.trim()) {
      toast.error('Please enter a LaTeX resume template first');
      return;
    }

    try {
      await saveResumeTemplate(latexResume);
      setResumeTemplateSaved(true);
      setIsEditingResumeTemplate(false);
      toast.success('Resume template saved! It will be used by default.');
    } catch (error) {
      console.error('Failed to save template:', error);
      toast.error('Failed to save template');
    }
  };

  const handleUpdateResumeTemplate = () => {
    setIsEditingResumeTemplate(true);
    setResumeTemplateSaved(false);
  };

  const handleSaveCoverLetterTemplate = async () => {
    if (!coverLetterTemplate.trim()) {
      toast.error('Please enter a cover letter template first');
      return;
    }

    try {
      await saveCoverLetterTemplate(coverLetterTemplate);
      setCoverLetterTemplateSaved(true);
      setIsEditingCoverLetterTemplate(false);
      toast.success('Cover letter template saved! It will be used by default.');
    } catch (error) {
      console.error('Failed to save template:', error);
      toast.error('Failed to save template');
    }
  };

  const handleUpdateCoverLetterTemplate = () => {
    setIsEditingCoverLetterTemplate(true);
    setCoverLetterTemplateSaved(false);
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB');
      return;
    }

    try {
      const text = await file.text();
      setLatexResume(text);
      setResumeTemplateSaved(false);
      setIsEditingResumeTemplate(true);
      toast.success('LaTeX resume loaded');
    } catch (error) {
      toast.error('Failed to read file');
    }
  };

  const handleJobPostingUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    try {
      const text = await file.text();
      setJobPosting(text);
      toast.success('Job posting loaded');
    } catch (error) {
      toast.error('Failed to read file');
    }
  };

  const handleOptimize = async () => {
    if (!jobPosting.trim()) {
      toast.error('Please enter or upload a job posting');
      return;
    }

    if (!personalInfoLoaded) {
      toast.error('Please add your personal information first in the Personal Info section');
      return;
    }

    setIsGenerating(true);
    setOptimizedContent('');

    try {
      // Get personal info context
      const personalInfoContext = await getPersonalInfoContext();

      if (mode === 'resume') {
        // Use saved template if textarea is empty but template is saved
        let templateToUse = latexResume;
        if (!templateToUse.trim() && resumeTemplateSaved) {
          const savedTemplate = await getResumeTemplate();
          if (savedTemplate) {
            templateToUse = savedTemplate;
          }
        }

        if (!templateToUse.trim()) {
          toast.error('Please upload or paste your LaTeX resume template first');
          setIsGenerating(false);
          return;
        }

        const response = await fetch('/api/resume/optimize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latexResume: templateToUse,
            jobPosting,
            personalInfoContext,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to optimize resume');
        }

        const data = await response.json();
        setOptimizedContent(data.optimizedLatex);
        toast.success('Resume optimized successfully!');
      } else {
        // Cover letter mode
        let templateToUse = coverLetterTemplate;
        if (!templateToUse.trim() && coverLetterTemplateSaved) {
          const savedTemplate = await getCoverLetterTemplate();
          if (savedTemplate) {
            templateToUse = savedTemplate;
          }
        }

        if (!templateToUse.trim()) {
          toast.error('Please upload or paste your cover letter template first');
          setIsGenerating(false);
          return;
        }

        const response = await fetch('/api/cover-letter/optimize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            coverLetterTemplate: templateToUse,
            jobPosting,
            personalInfoContext,
            customPrompt: coverLetterPrompt.trim() || undefined, // Only send if provided
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to optimize cover letter');
        }

        const data = await response.json();
        setOptimizedContent(data.optimizedCoverLetter);
        toast.success('Cover letter optimized successfully!');
      }
    } catch (error: any) {
      console.error('Optimization error:', error);
      toast.error(error.message || 'Failed to optimize');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    const content = optimizedContent || (mode === 'resume' ? latexResume : coverLetterTemplate);
    navigator.clipboard.writeText(content);
    toast.success(`${mode === 'resume' ? 'LaTeX code' : 'Cover letter'} copied to clipboard!`);
  };

  const handleDownload = () => {
    const content = optimizedContent || (mode === 'resume' ? latexResume : coverLetterTemplate);
    if (!content) {
      toast.error(`No ${mode === 'resume' ? 'resume' : 'cover letter'} to download`);
      return;
    }
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const extension = mode === 'resume' ? 'tex' : 'txt';
    const filename = mode === 'resume' ? 'resume' : 'cover-letter';
    a.download = `${filename}-optimized-${Date.now()}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`${mode === 'resume' ? 'Resume' : 'Cover letter'} downloaded!`);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-gray-800 rounded-xl w-full max-w-6xl h-[90vh] flex flex-col mx-4" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-semibold text-white">Resume Customizer</h2>
          </div>
          <div className="flex items-center gap-2">
            {(optimizedContent || (mode === 'resume' ? latexResume : coverLetterTemplate)) && (
              <>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 border-b border-gray-700">
          <button
            onClick={() => setMode('resume')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              mode === 'resume'
                ? 'text-blue-400 border-blue-400'
                : 'text-gray-400 border-transparent hover:text-gray-300'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Resume Customizer
          </button>
          <button
            onClick={() => setMode('cover-letter')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              mode === 'cover-letter'
                ? 'text-blue-400 border-blue-400'
                : 'text-gray-400 border-transparent hover:text-gray-300'
            }`}
          >
            <Mail className="w-4 h-4 inline mr-2" />
            Cover Letter Customizer
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-6 h-full">
            {/* Left Column: Input */}
            <div className="space-y-6">
              {/* Template Input */}
              {mode === 'resume' ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Your LaTeX Resume Template
                    </label>
                    {resumeTemplateSaved && !isEditingResumeTemplate && (
                      <button
                        onClick={handleUpdateResumeTemplate}
                        className="flex items-center gap-1.5 px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-gray-300"
                      >
                        <Edit2 className="w-3 h-3" />
                        Update Template
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {resumeTemplateSaved && !isEditingResumeTemplate ? (
                      <div className="w-full h-64 px-4 py-3 bg-gray-700/50 text-gray-400 rounded-lg border border-gray-600 flex items-center justify-center">
                        <div className="text-center">
                          <Check className="w-8 h-8 text-green-400 mx-auto mb-2" />
                          <p className="text-sm font-medium">Template Saved</p>
                          <p className="text-xs mt-1">Using saved template by default</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <textarea
                          value={latexResume}
                          onChange={(e) => {
                            setLatexResume(e.target.value);
                            setResumeTemplateSaved(false);
                          }}
                          placeholder="Paste your LaTeX resume template here, or upload a .tex file..."
                          className="w-full h-64 px-4 py-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-xs"
                        />
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg cursor-pointer transition-colors text-sm">
                            <Upload className="w-4 h-4" />
                            Upload .tex File
                            <input
                              type="file"
                              accept=".tex"
                              onChange={handleResumeUpload}
                              className="hidden"
                            />
                          </label>
                          {latexResume.trim() && (
                            <button
                              onClick={handleSaveResumeTemplate}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-sm font-medium"
                            >
                              <Check className="w-4 h-4" />
                              Save as Default
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Your Cover Letter Template
                    </label>
                    {coverLetterTemplateSaved && !isEditingCoverLetterTemplate && (
                      <button
                        onClick={handleUpdateCoverLetterTemplate}
                        className="flex items-center gap-1.5 px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-gray-300"
                      >
                        <Edit2 className="w-3 h-3" />
                        Update Template
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {coverLetterTemplateSaved && !isEditingCoverLetterTemplate ? (
                      <div className="w-full h-64 px-4 py-3 bg-gray-700/50 text-gray-400 rounded-lg border border-gray-600 flex items-center justify-center">
                        <div className="text-center">
                          <Check className="w-8 h-8 text-green-400 mx-auto mb-2" />
                          <p className="text-sm font-medium">Template Saved</p>
                          <p className="text-xs mt-1">Using saved template by default</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <textarea
                          value={coverLetterTemplate}
                          onChange={(e) => {
                            setCoverLetterTemplate(e.target.value);
                            setCoverLetterTemplateSaved(false);
                          }}
                          placeholder="Paste your cover letter template here, or upload a .txt file..."
                          className="w-full h-64 px-4 py-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg cursor-pointer transition-colors text-sm">
                            <Upload className="w-4 h-4" />
                            Upload .txt File
                            <input
                              type="file"
                              accept=".txt"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                if (file.size > 2 * 1024 * 1024) {
                                  toast.error('File size must be less than 2MB');
                                  return;
                                }
                                try {
                                  const text = await file.text();
                                  setCoverLetterTemplate(text);
                                  setCoverLetterTemplateSaved(false);
                                  setIsEditingCoverLetterTemplate(true);
                                  toast.success('Cover letter template loaded');
                                } catch (error) {
                                  toast.error('Failed to read file');
                                }
                              }}
                              className="hidden"
                            />
                          </label>
                          {coverLetterTemplate.trim() && (
                            <button
                              onClick={handleSaveCoverLetterTemplate}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-sm font-medium"
                            >
                              <Check className="w-4 h-4" />
                              Save as Default
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Job Posting Input */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Job Posting Description
                </label>
                <div className="space-y-2">
                  <textarea
                    value={jobPosting}
                    onChange={(e) => setJobPosting(e.target.value)}
                    placeholder="Paste the job posting description here..."
                    className="w-full h-48 px-4 py-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  <label className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg cursor-pointer transition-colors text-sm w-fit">
                    <Upload className="w-4 h-4" />
                    Upload Job Posting
                    <input
                      type="file"
                      accept=".txt,.pdf,.doc,.docx"
                      onChange={handleJobPostingUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Cover Letter Custom Prompt (only for cover letter mode) */}
              {mode === 'cover-letter' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Custom Instructions (Optional)
                  </label>
                  <textarea
                    value={coverLetterPrompt}
                    onChange={(e) => setCoverLetterPrompt(e.target.value)}
                    placeholder="Specify what to emphasize (e.g., 'Focus on my experience with React and TypeScript', 'Highlight why I'm a good fit for this role', 'Emphasize my leadership experience')..."
                    className="w-full h-32 px-4 py-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Leave empty for standard optimization, or specify what to focus on
                  </p>
                </div>
              )}

              {/* Status & Generate Button */}
              <div className="space-y-2">
                {!personalInfoLoaded && (
                  <div className="p-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg text-xs text-yellow-400">
                    ⚠️ Add your personal information in the Personal Info section first
                  </div>
                )}
                {personalInfoLoaded && (
                  <div className="p-3 bg-blue-900/20 border border-blue-600/30 rounded-lg text-xs text-blue-400">
                    ✓ Personal info loaded - will use only your Personal Info data
                  </div>
                )}
                <button
                  onClick={handleOptimize}
                  disabled={
                    isGenerating || 
                    (mode === 'resume' && !latexResume.trim() && !resumeTemplateSaved) ||
                    (mode === 'cover-letter' && !coverLetterTemplate.trim() && !coverLetterTemplateSaved) ||
                    !jobPosting.trim() || 
                    !personalInfoLoaded
                  }
                  className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Optimizing Resume...
                    </>
                  ) : (
                    <>
                      <FileText className="w-5 h-5" />
                      Optimize Resume for Job
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right Column: Output */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {optimizedContent 
                  ? `Optimized ${mode === 'resume' ? 'LaTeX Resume' : 'Cover Letter'}` 
                  : `Optimized ${mode === 'resume' ? 'Resume' : 'Cover Letter'} (will appear here)`
                }
              </label>
              {mode === 'resume' ? (
                <pre className="w-full h-full px-4 py-3 bg-gray-900 text-gray-300 rounded-lg border border-gray-600 overflow-auto text-xs font-mono">
                  {optimizedContent || latexResume || 'Your optimized resume will appear here...'}
                </pre>
              ) : (
                <textarea
                  readOnly
                  value={optimizedContent || coverLetterTemplate || 'Your optimized cover letter will appear here...'}
                  className="w-full h-full px-4 py-3 bg-gray-900 text-gray-300 rounded-lg border border-gray-600 overflow-auto text-sm resize-none"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

