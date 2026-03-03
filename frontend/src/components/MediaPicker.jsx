import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Search, Upload, Folder, ChevronLeft, ChevronRight } from 'lucide-react';
import * as api from '../services/api';

/**
 * Modal overlay to pick an image from the media library.
 * Props:
 *   open: boolean
 *   onClose: () => void
 *   onSelect: (mediaUrl: string) => void
 */
export default function MediaPicker({ open, onClose, onSelect }) {
  const [media, setMedia] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const loadMedia = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 18 };
      if (search) params.search = search;
      if (filterCat) params.category_id = filterCat;
      const data = await api.getMedia(params);
      setMedia(data.media || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('MediaPicker load error:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterCat]);

  useEffect(() => {
    if (open) {
      loadMedia();
      api.getMediaCategories().then(setCategories).catch(() => {});
    }
  }, [open, loadMedia]);

  async function handleQuickUpload(files) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        await api.uploadMedia(file, filterCat || undefined);
      }
      loadMedia();
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-800">Chon anh tu thu vien</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-500 transition disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition">
              <X className="w-4 h-4" />
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => handleQuickUpload(Array.from(e.target.files))}
          />
        </div>

        {/* Search + Category filter */}
        <div className="px-5 py-2 border-b border-slate-100 flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[150px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Tim kiem..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => { setFilterCat(''); setPage(1); }}
              className={`px-2.5 py-1 rounded-full text-xs transition ${
                !filterCat ? 'bg-blue-100 text-blue-600 font-medium' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              Tat ca
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => { setFilterCat(cat.id); setPage(1); }}
                className={`px-2.5 py-1 rounded-full text-xs transition flex items-center gap-1 ${
                  filterCat === cat.id ? 'bg-blue-100 text-blue-600 font-medium' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                <Folder className="w-3 h-3" />
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Image grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : media.length === 0 ? (
            <div className="text-center text-slate-400 py-12 text-sm">
              Chua co anh. Bam Upload de them.
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {media.map(item => (
                <button
                  key={item.id}
                  onClick={() => { onSelect(item.url); onClose(); }}
                  className="group aspect-square bg-slate-50 rounded-lg overflow-hidden border-2 border-transparent hover:border-blue-500 transition focus:outline-none focus:border-blue-500"
                >
                  <img
                    src={item.thumbnail_url || item.url}
                    alt={item.original_name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-2 border-t border-slate-200 flex items-center justify-between">
            <p className="text-[11px] text-slate-500">Trang {page}/{totalPages}</p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="p-1 rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="p-1 rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
