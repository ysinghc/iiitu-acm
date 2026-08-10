import React, { useState } from 'react';
import { Upload, Link as LinkIcon, X, Check, Image as ImageIcon, Loader2 } from 'lucide-react';
import { API } from '../utils/apiURL';

export default function ImageUploader({
  value = '',
  onChange,
  label = 'Photo / Image',
  required = false
}) {
  const [mode, setMode] = useState('upload'); // 'upload' | 'url'
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const getHeaders = () => {
    const token = localStorage.getItem('acm_admin_token');
    return {
      'Authorization': `Bearer ${token}`
    };
  };

  const uploadFile = async (file) => {
    setError('');
    
    // Client-side file type check: strictly JPEG or PNG
    const validMimes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validMimes.includes(file.type)) {
      setError('Invalid file format. Only JPEG (.jpg, .jpeg) and PNG (.png) files are accepted.');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch(`${API}/admin/upload`, {
        method: 'POST',
        headers: getHeaders(),
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      // Convert relative upload path to full URL if API base is full URL, else use relative
      const finalUrl = data.imageUrl.startsWith('http')
        ? data.imageUrl
        : `${API.startsWith('http') ? API.replace(/\/api\/?$/, '') : ''}${data.imageUrl}`;

      onChange(finalUrl);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Image upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  // Helper to format displayed image src (relative vs absolute)
  const resolveImgSrc = (url) => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('blob:')) return url;
    if (url.startsWith('/uploads')) {
      const baseUrl = API.startsWith('http') ? API.replace(/\/api\/?$/, '') : '';
      return `${baseUrl}${url}`;
    }
    return url;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wide">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="flex gap-1 bg-bg-primary p-0.5 rounded-lg border border-border-color">
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`px-2 py-0.5 text-[9px] font-bold rounded flex items-center gap-1 transition-colors ${
              mode === 'upload' ? 'bg-acm-blue text-white' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Upload className="h-2.5 w-2.5" /> Upload File
          </button>
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`px-2 py-0.5 text-[9px] font-bold rounded flex items-center gap-1 transition-colors ${
              mode === 'url' ? 'bg-acm-blue text-white' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <LinkIcon className="h-2.5 w-2.5" /> URL Link
          </button>
        </div>
      </div>

      {/* Mode 1: File Upload (JPEG / PNG -> WebP) */}
      {mode === 'upload' && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-xl p-4 text-center transition-all ${
            dragOver ? 'border-acm-blue bg-acm-blue/5' : 'border-border-color bg-bg-primary hover:border-text-secondary'
          }`}
        >
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            onChange={handleFileChange}
            disabled={uploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
          <div className="flex flex-col items-center justify-center gap-1.5 pointer-events-none">
            {uploading ? (
              <>
                <Loader2 className="h-5 w-5 text-acm-blue animate-spin" />
                <span className="text-xs font-semibold text-acm-blue">Converting to WebP...</span>
              </>
            ) : (
              <>
                <Upload className="h-5 w-5 text-text-secondary" />
                <p className="text-xs font-semibold text-text-primary">
                  Click or Drag & Drop JPEG/PNG file
                </p>
                <p className="text-[10px] text-text-tertiary">
                  Auto-converted to optimized <strong className="text-acm-blue">.webp</strong> on server
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Mode 2: Direct Image URL */}
      {mode === 'url' && (
        <input
          type="url"
          required={required && !value}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://example.com/photo.jpg"
          className="w-full px-3 py-2 border border-border-color rounded-xl bg-bg-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-acm-blue text-xs transition-colors duration-300"
        />
      )}

      {/* Error display */}
      {error && (
        <p className="text-[10px] font-semibold text-red-500 flex items-center gap-1 mt-1">
          <X className="h-3 w-3" /> {error}
        </p>
      )}

      {/* Live Preview & Clear */}
      {value && (
        <div className="relative mt-2 p-2 bg-bg-primary border border-border-color rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={resolveImgSrc(value)}
              alt="Preview"
              className="w-10 h-10 rounded-lg object-cover border border-border-color flex-shrink-0 bg-bg-secondary"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-green-600 dark:text-green-400 flex items-center gap-1 uppercase tracking-wider">
                <Check className="h-3 w-3" /> Image Selected
              </span>
              <p className="text-[10px] text-text-secondary truncate max-w-[200px]" title={value}>
                {value}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onChange('')}
            className="p-1 rounded-lg hover:bg-red-500/10 text-text-secondary hover:text-red-500 transition-colors"
            title="Remove image"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
