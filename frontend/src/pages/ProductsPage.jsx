import React, { useState, useEffect, useCallback } from 'react';
import { Package, Search, Plus, Edit, Trash2, Camera, RefreshCw } from 'lucide-react';
import * as api from '../services/api';

const EMPTY_PRODUCT = {
  name: '', sku: '', category: '', price: 0, original_price: 0, stock: 0, description: '', image_url: '',
};

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'create' | product object
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 50 };
      if (search) params.search = search;
      if (filterCat) params.category = filterCat;
      const data = await api.getProductsList(params);
      setProducts(data.products || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Load products error:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterCat]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  useEffect(() => {
    api.getProductCategories().then(setCategories).catch(() => {});
  }, []);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  function openCreate() {
    setForm(EMPTY_PRODUCT);
    setModal('create');
  }

  function openEdit(product) {
    setForm({ ...product });
    setModal(product);
  }

  async function handleSave() {
    if (!form.name.trim()) return showToast('Tên sản phẩm là bắt buộc', 'error');
    setSaving(true);
    try {
      if (modal === 'create') {
        await api.createProduct({ ...form, price: Number(form.price), original_price: Number(form.original_price), stock: Number(form.stock) });
        showToast('Thêm sản phẩm thành công');
      } else {
        await api.updateProduct(modal.id, { ...form, price: Number(form.price), original_price: Number(form.original_price), stock: Number(form.stock) });
        showToast('Cập nhật thành công');
      }
      setModal(null);
      loadProducts();
    } catch (err) {
      showToast('Lỗi: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Xóa sản phẩm này?')) return;
    try {
      await api.deleteProduct(id);
      showToast('Đã xóa');
      loadProducts();
    } catch (err) {
      showToast('Lỗi xóa', 'error');
    }
  }

  const totalPages = Math.ceil(total / 50);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" /> Sản phẩm
            <span className="text-sm font-normal text-slate-500">({total})</span>
          </h1>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Tìm sản phẩm..."
                className="bg-white border border-slate-200 text-sm text-slate-700 placeholder-slate-400 rounded-lg pl-9 pr-3 py-2 outline-none focus:ring-1 focus:ring-blue-500/40 w-48"
              />
            </div>
            <button
              onClick={async () => {
                setSyncing(true);
                try {
                  const result = await api.syncInventory();
                  showToast(result.message || `Đã đồng bộ ${result.updated} sản phẩm`);
                  loadProducts();
                } catch (err) {
                  showToast('Lỗi đồng bộ: ' + (err.response?.data?.error || err.message), 'error');
                } finally {
                  setSyncing(false);
                }
              }}
              disabled={syncing}
              className="px-3 py-2 bg-white border border-slate-200 text-sm text-slate-600 rounded-lg hover:bg-slate-50 transition font-medium flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} /> Đồng bộ tồn kho
            </button>
            <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-500 transition font-medium flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Thêm SP
            </button>
          </div>
        </div>

        {/* Category filters */}
        {categories.length > 0 && (
          <div className="flex gap-2 mb-4 flex-wrap">
            <button onClick={() => { setFilterCat(''); setPage(1); }} className={`px-3 py-1 rounded-lg text-xs font-medium transition ${!filterCat ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}>Tất cả</button>
            {categories.map((cat) => (
              <button key={cat} onClick={() => { setFilterCat(cat); setPage(1); }} className={`px-3 py-1 rounded-lg text-xs font-medium transition ${filterCat === cat ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}>{cat}</button>
            ))}
          </div>
        )}

        {/* Table */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left text-[11px] text-slate-500 font-medium uppercase tracking-wider px-4 py-3">Sản phẩm</th>
                <th className="text-left text-[11px] text-slate-500 font-medium uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Danh mục</th>
                <th className="text-right text-[11px] text-slate-500 font-medium uppercase tracking-wider px-4 py-3">Giá</th>
                <th className="text-center text-[11px] text-slate-500 font-medium uppercase tracking-wider px-4 py-3">Kho</th>
                <th className="text-center text-[11px] text-slate-500 font-medium uppercase tracking-wider px-4 py-3 w-24">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-12 text-slate-500 text-sm">Đang tải...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-slate-500 text-sm">Chưa có sản phẩm nào</td></tr>
              ) : products.map((p) => (
                <tr key={p.id} className="border-b border-slate-200 hover:bg-slate-50 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.image_url ? (
                        <img src={p.image_url} alt="" className="w-10 h-10 rounded-lg object-cover bg-slate-100" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400"><Camera className="w-4 h-4" /></div>
                      )}
                      <div>
                        <p className="text-sm text-slate-800 font-medium">{p.name}</p>
                        {p.sku && <p className="text-[11px] text-slate-500">SKU: {p.sku}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 hidden sm:table-cell">{p.category || '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-800 font-medium text-right">{Number(p.price).toLocaleString('vi-VN')}đ</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className={`text-sm font-medium ${p.stock <= 0 ? 'text-red-600' : p.stock < 5 ? 'text-yellow-600' : 'text-green-600'}`}>{p.stock}</span>
                      {p.stock <= 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">Hết hàng</span>
                      )}
                      {p.stock > 0 && p.stock < 5 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 font-medium">Sắp hết</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-slate-100 transition" title="Sửa">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg text-slate-600 hover:text-red-600 hover:bg-slate-100 transition" title="Xóa">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="px-3 py-1.5 rounded-lg text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition">&lt;</button>
            <span className="text-sm text-slate-500">Trang {page} / {totalPages}</span>
            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="px-3 py-1.5 rounded-lg text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition">&gt;</button>
          </div>
        )}

        {/* Modal */}
        {modal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white border border-slate-200 shadow-2xl rounded-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-bold text-slate-900 mb-4">{modal === 'create' ? '+ Thêm sản phẩm' : 'Sửa sản phẩm'}</h2>
              <div className="space-y-3">
                <Field label="Tên sản phẩm *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Mã SP (SKU)" value={form.sku} onChange={(v) => setForm({ ...form, sku: v })} />
                  <Field label="Danh mục" value={form.category} onChange={(v) => setForm({ ...form, category: v })} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Giá bán" type="number" value={form.price} onChange={(v) => setForm({ ...form, price: v })} />
                  <Field label="Giá gốc" type="number" value={form.original_price} onChange={(v) => setForm({ ...form, original_price: v })} />
                  <Field label="Tồn kho" type="number" value={form.stock} onChange={(v) => setForm({ ...form, stock: v })} />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Mô tả</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full bg-white border border-slate-200 text-sm text-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500/40 resize-none" />
                </div>
                <Field label="URL ảnh" value={form.image_url} onChange={(v) => setForm({ ...form, image_url: v })} placeholder="https://..." />
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-600 hover:bg-slate-100 transition">Hủy</button>
                <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-50 transition">
                  {saving ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
            {toast.msg}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label className="block text-xs text-slate-600 mb-1">{label}</label>
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white border border-slate-200 text-sm text-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500/40"
      />
    </div>
  );
}
