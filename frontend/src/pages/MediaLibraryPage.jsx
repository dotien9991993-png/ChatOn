import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Image, Search, Upload, Trash2, FolderPlus, Folder, X, Copy, ChevronLeft, ChevronRight } from 'lucide-react';
import * as api from '../services/api';

export default function MediaLibraryPage() {
  const [media, setMedia] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState(null);
  const [newCatName, setNewCatName] = useState('');
  const [showCatForm, setShowCatForm] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const fileInputRef = useRef(null);
  const dropRef = useRef(null);

  const loadMedia = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 24 };
      if (search) params.search = search;
      if (filterCat) params.category_id = filterCat;
      const data = await api.getMedia(params);
      setMedia(data.media || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Load media error:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterCat]);

  useEffect(() => { loadMedia(); }, [loadMedia]);

  useEffect(() => {
    api.getMediaCategories().then(setCategories).catch(() => {});
  }, []);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleUpload(files) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      if (files.length === 1) {
        await api.uploadMedia(files[0], filterCat || undefined);
      } else {
        await api.uploadMediaMultiple(files, filterCat || undefined);
      }
      showToast(`Tải lên ${files.length} ảnh thành công`);
      loadMedia();
    } catch (err) {
      showToast('Tải lên thất bại: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(item) {
    if (!confirm('Xóa ảnh này?')) return;
    try {
      await api.deleteMedia(item.id);
      showToast('Đã xóa ảnh');
      loadMedia();
    } catch (err) {
      showToast('Lỗi xóa: ' + err.message, 'error');
    }
  }

  async function handleCreateCategory() {
    if (!newCatName.trim()) return;
    try {
      const cat = await api.createMediaCategory(newCatName.trim());
      setCategories([...categories, cat]);
      setNewCatName('');
      setShowCatForm(false);
      showToast('Đã tạo danh mục');
    } catch (err) {
      showToast('Lỗi: ' + (err.response?.data?.error || err.message), 'error');
    }
  }

  async function handleDeleteCategory(catId) {
    if (!confirm('Xóa danh mục này?')) return;
    try {
      await api.deleteMediaCategory(catId);
      setCategories(categories.filter(c => c.id !== catId));
      if (filterCat === catId) setFilterCat('');
      showToast('Đã xóa danh mục');
    } catch (err) {
      showToast('Lỗi: ' + err.message, 'error');
    }
  }

  function copyUrl(url) {
    navigator.clipboard.writeText(url);
    showToast('Đã sao chép URL');
  }

  // Drag & drop handlers
  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    dropRef.current?.classList.add('ring-2', 'ring-blue-400');
  }
  function handleDragLeave(e) {
    e.preventDefault();
    dropRef.current?.classList.remove('ring-2', 'ring-blue-400');
  }
  function handleDrop(e) {
    e.preventDefault();
    dropRef.current?.classList.remove('ring-2', 'ring-blue-400');
    const files = Array.from(e.dataTransfer.files);
    handleUpload(files);
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <Image className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Thư viện ảnh</h1>
            <p className="text-xs text-slate-500">{total} ảnh &middot; Định dạng: JPG, PNG, GIF, WEBP &middot; Tối đa 10MB</p>
          </div>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-500 transition font-medium disabled:opacity-50"
        >
          <Upload className="w-4 h-4" />
          {uploading ? 'Đang tải lên...' : 'Tải lên'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={(e) => handleUpload(Array.from(e.target.files))}
        />
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Category Sidebar */}
        <div className="w-56 border-r border-slate-200 bg-white flex-shrink-0 overflow-y-auto hidden md:block">
          <div className="p-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">Danh mục</p>
            <button
              onClick={() => { setFilterCat(''); setPage(1); }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                !filterCat ? 'bg-blue-50 text-blue-600 font-medium' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Tất cả
            </button>
            {categories.map(cat => (
              <div key={cat.id} className="group flex items-center">
                <button
                  onClick={() => { setFilterCat(cat.id); setPage(1); }}
                  className={`flex-1 text-left px-3 py-2 rounded-lg text-sm transition flex items-center gap-2 ${
                    filterCat === cat.id ? 'bg-blue-50 text-blue-600 font-medium' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Folder className="w-3.5 h-3.5" />
                  {cat.name}
                </button>
                <button
                  onClick={() => handleDeleteCategory(cat.id)}
                  className="p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                  title="Xóa danh mục"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {showCatForm ? (
              <div className="mt-2 flex gap-1">
                <input
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
                  placeholder="Tên danh mục"
                  className="flex-1 text-sm border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-blue-400"
                  autoFocus
                />
                <button onClick={handleCreateCategory} className="px-2 py-1.5 bg-blue-600 text-white rounded-lg text-xs">OK</button>
                <button onClick={() => setShowCatForm(false)} className="px-2 py-1.5 text-slate-500 hover:bg-slate-100 rounded-lg text-xs">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowCatForm(true)}
                className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition flex items-center gap-2 mt-1"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                Thêm danh mục
              </button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search bar */}
          <div className="px-4 py-3 border-b border-slate-100 bg-white">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Tìm kiếm theo tên file..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
          </div>

          {/* Image Grid / Drop zone */}
          <div
            ref={dropRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className="flex-1 overflow-y-auto p-4 transition"
          >
            {loading ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-2" />
                <p className="text-sm">Đang tải...</p>
              </div>
            ) : media.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                <Image className="w-12 h-12 mb-2 opacity-30" />
                <p className="text-sm">Chưa có ảnh nào</p>
                <p className="text-xs mt-1">Kéo thả hoặc bấm Tải lên để thêm ảnh</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {media.map(item => (
                  <div key={item.id} className="group relative bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition">
                    <div
                      className="aspect-square bg-slate-50 cursor-pointer"
                      onClick={() => setLightbox(item)}
                    >
                      <img
                        src={item.thumbnail_url || item.url}
                        alt={item.original_name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="px-2 py-1.5">
                      <p className="text-[11px] text-slate-600 truncate">{item.original_name}</p>
                    </div>
                    {/* Hover actions */}
                    <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() => copyUrl(item.url)}
                        className="p-1.5 bg-white/90 rounded-lg shadow-sm hover:bg-white text-slate-600 hover:text-blue-600 transition"
                        title="Sao chép URL"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="p-1.5 bg-white/90 rounded-lg shadow-sm hover:bg-white text-slate-600 hover:text-red-500 transition"
                        title="Xóa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-slate-200 bg-white flex items-center justify-between">
              <p className="text-xs text-slate-500">Trang {page} / {totalPages} ({total} ảnh)</p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightbox.url}
            alt={lightbox.original_name}
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
