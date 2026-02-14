'use client';

import React, { useState, useEffect } from 'react';
import { X, FileText, Copy, Download, Loader2, Upload, Edit2, Check, Mail, Briefcase, FolderGit2, GraduationCap, Wrench, AlertTriangle } from 'lucide-react';
import { getPersonalInfoContext, getPersonalInfo } from '@/lib/utils/personal-info';
import { saveResumeTemplate, getResumeTemplate } from '@/lib/utils/resume-template';
import { saveCoverLetterTemplate, getCoverLetterTemplate } from '@/lib/utils/cover-letter-template';
import { PersonalInfo } from '@/lib/db';
import toast from 'react-hot-toast';

interface ResumeCustomizerProps {
  onClose: () => void;
}

type CustomizerMode = 'resume' | 'cover-letter';

interface ProfileStats {
  experiences: number;
  projects: number;
  skills: number;
  education: number;
  total: number;
  experienceNames: string[];
  projectNames: string[];
}

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

  // Profile stats for resume mode
  const [profileStats, setProfileStats] = useState<ProfileStats>({
    experiences: 0,
    projects: 0,
    skills: 0,
    education: 0,
    total: 0,
    experienceNames: [],
    projectNames: [],
  });

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

        // Load personal info and compute stats
        const context = await getPersonalInfoContext();
        setPersonalInfoLoaded(context.length > 0);

        const allInfo = await getPersonalInfo();
        const experiences = allInfo.filter((i: PersonalInfo) => i.category === 'experience');
        const projects = allInfo.filter((i: PersonalInfo) => i.category === 'project');
        const skills = allInfo.filter((i: PersonalInfo) => i.category === 'skill');
        const education = allInfo.filter((i: PersonalInfo) => i.category === 'education');

        setProfileStats({
          experiences: experiences.length,
          projects: projects.length,
          skills: skills.length,
          education: education.length,
          total: allInfo.length,
          experienceNames: experiences.map((e: PersonalInfo) => e.title),
          projectNames: projects.map((p: PersonalInfo) => p.title),
        });
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

    if (mode === 'resume' && profileStats.experiences < 3) {
      toast.error(`Need at least 3 experiences in your profile (you have ${profileStats.experiences}). Add more in Personal Info.`);
      return;
    }

    if (mode === 'resume' && profileStats.projects < 3) {
      toast.error(`Need at least 3 projects in your profile (you have ${profileStats.projects}). Add more in Personal Info.`);
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
          const contentType = response.headers.get('content-type');
          let errorMsg = 'Failed to optimize resume';

          if (contentType && contentType.includes('application/json')) {
            try {
              const error = await response.json();
              errorMsg = error.error || error.details || errorMsg;
            } catch (e) {
              errorMsg = `Server error (${response.status}): ${response.statusText}`;
            }
          } else {
            const text = await response.text();
            errorMsg = `Server error (${response.status}): ${response.statusText}`;
            console.error('Non-JSON error response:', text.substring(0, 200));
          }

          throw new Error(errorMsg);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          console.error('Non-JSON response:', text.substring(0, 200));
          throw new Error('Server returned invalid response format');
        }

        const data = await response.json();
        if (!data.optimizedLatex) {
          throw new Error('No optimized resume returned from server');
        }
        setOptimizedContent(data.optimizedLatex);
        toast.success('Resume optimized! 3 best experiences + 3 best projects selected.');
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
            customPrompt: coverLetterPrompt.trim() || undefined,
          }),
        });

        if (!response.ok) {
          const contentType = response.headers.get('content-type');
          let errorMsg = 'Failed to optimize cover letter';

          if (contentType && contentType.includes('application/json')) {
            try {
              const error = await response.json();
              errorMsg = error.error || error.details || errorMsg;
            } catch (e) {
              errorMsg = `Server error (${response.status}): ${response.statusText}`;
            }
          } else {
            const text = await response.text();
            errorMsg = `Server error (${response.status}): ${response.statusText}`;
            console.error('Non-JSON error response:', text.substring(0, 200));
          }

          throw new Error(errorMsg);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          console.error('Non-JSON response:', text.substring(0, 200));
          throw new Error('Server returned invalid response format');
        }

        const data = await response.json();
        if (!data.optimizedCoverLetter) {
          throw new Error('No optimized cover letter returned from server');
        }
        setOptimizedContent(data.optimizedCoverLetter);
        toast.success('Cover letter optimized successfully!');
      }
    } catch (error: any) {
      console.error('Optimization error:', error);
      const errorMessage = error?.message || 'Failed to optimize';
      toast.error(errorMessage, {
        duration: 5000,
        icon: '❌',
        style: {
          background: '#dc2626',
          color: '#fff',
        }
      });
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

  const hasEnoughProfile = profileStats.experiences >= 3 && profileStats.projects >= 3;

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
            <div className="space-y-4">
              {/* Profile Stats Panel (Resume mode only) */}
              {mode === 'resume' && (
                <div className={`p-3 rounded-lg border ${hasEnoughProfile ? 'bg-emerald-900/20 border-emerald-600/30' : 'bg-amber-900/20 border-amber-600/30'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Profile Pool
                    </span>
                    {hasEnoughProfile ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-700/50 text-emerald-300">Ready</span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-700/50 text-amber-300">Needs More</span>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="flex flex-col items-center">
                      <Briefcase className={`w-3.5 h-3.5 mb-0.5 ${profileStats.experiences >= 3 ? 'text-emerald-400' : 'text-amber-400'}`} />
                      <span className="text-lg font-bold text-white">{profileStats.experiences}</span>
                      <span className="text-[10px] text-gray-400">Experiences</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <FolderGit2 className={`w-3.5 h-3.5 mb-0.5 ${profileStats.projects >= 3 ? 'text-emerald-400' : 'text-amber-400'}`} />
                      <span className="text-lg font-bold text-white">{profileStats.projects}</span>
                      <span className="text-[10px] text-gray-400">Projects</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <Wrench className="w-3.5 h-3.5 mb-0.5 text-blue-400" />
                      <span className="text-lg font-bold text-white">{profileStats.skills}</span>
                      <span className="text-[10px] text-gray-400">Skills</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <GraduationCap className="w-3.5 h-3.5 mb-0.5 text-blue-400" />
                      <span className="text-lg font-bold text-white">{profileStats.education}</span>
                      <span className="text-[10px] text-gray-400">Education</span>
                    </div>
                  </div>
                  {!hasEnoughProfile && (
                    <div className="mt-2 p-2 bg-amber-900/30 rounded text-[10px] text-amber-300 flex items-start gap-1.5">
                      <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>
                        Need at least <strong>3 experiences</strong> and <strong>3 projects</strong> in your profile.
                        Add more via Personal Info or chat (&quot;save this to my profile&quot;).
                      </span>
                    </div>
                  )}
                  {hasEnoughProfile && (
                    <div className="mt-2 text-[10px] text-gray-500">
                      <strong>Fixed:</strong> Skills + Education &bull; <strong>Dynamic:</strong> Best 3 of {profileStats.experiences} experiences + Best 3 of {profileStats.projects} projects
                    </div>
                  )}
                </div>
              )}

              {/* Template Input */}
              {mode === 'resume' ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Base LaTeX Template
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
                      <div className="w-full px-4 py-3 bg-gray-700/50 text-gray-400 rounded-lg border border-gray-600 flex items-center justify-center" style={{ height: '100px' }}>
                        <div className="text-center">
                          <Check className="w-6 h-6 text-green-400 mx-auto mb-1" />
                          <p className="text-xs font-medium">Base Template Saved</p>
                          <p className="text-[10px] mt-0.5 text-gray-500">Skills + Education locked &bull; Formatting preserved</p>
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
                          className="w-full h-48 px-4 py-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-xs"
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

              {/* Generate Button */}
              <div className="space-y-2">
                <button
                  onClick={handleOptimize}
                  disabled={
                    isGenerating ||
                    (mode === 'resume' && !latexResume.trim() && !resumeTemplateSaved) ||
                    (mode === 'resume' && !hasEnoughProfile) ||
                    (mode === 'cover-letter' && !coverLetterTemplate.trim() && !coverLetterTemplateSaved) ||
                    !jobPosting.trim() ||
                    !personalInfoLoaded
                  }
                  className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {mode === 'resume' ? 'Selecting best experiences & projects...' : 'Optimizing Cover Letter...'}
                    </>
                  ) : (
                    <>
                      <FileText className="w-5 h-5" />
                      {mode === 'resume' ? 'Optimize Resume for Job' : 'Optimize Cover Letter for Job'}
                    </>
                  )}
                </button>
                {mode === 'resume' && isGenerating && (
                  <p className="text-[10px] text-gray-500 text-center">
                    Analyzing job requirements, scoring {profileStats.experiences} experiences + {profileStats.projects} projects, selecting best 3+3...
                  </p>
                )}
              </div>
            </div>

            {/* Right Column: Output */}
            <div className="flex flex-col">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {optimizedContent
                  ? `Optimized ${mode === 'resume' ? 'LaTeX Resume' : 'Cover Letter'}`
                  : `Optimized ${mode === 'resume' ? 'Resume' : 'Cover Letter'} (will appear here)`
                }
              </label>
              {mode === 'resume' ? (
                <pre className="flex-1 w-full px-4 py-3 bg-gray-900 text-gray-300 rounded-lg border border-gray-600 overflow-auto text-xs font-mono">
                  {optimizedContent || 'Your optimized resume will appear here...\n\nHow it works:\n• Skills section — copied exactly from your base template\n• Education section — copied exactly from your base template\n• Experience — best 3 selected from your profile\n• Projects — best 3 selected from your profile\n\nThe AI scores every experience and project in your\nprofile against the job posting and picks the top matches.'}
                </pre>
              ) : (
                <textarea
                  readOnly
                  value={optimizedContent || coverLetterTemplate || 'Your optimized cover letter will appear here...'}
                  className="flex-1 w-full px-4 py-3 bg-gray-900 text-gray-300 rounded-lg border border-gray-600 overflow-auto text-sm resize-none"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
