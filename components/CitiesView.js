import { useState } from 'react'

export default function CitiesView({ cities = [], cases = [], onRefresh, onViewCases }) {
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({ id: '', name: '' })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch('/api/cities', { method: 'POST', body: JSON.stringify(formData) })
      onRefresh()
      setShowForm(false)
      setFormData({ id: '', name: '' })
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (c) => {
    setFormData({ id: c.id, name: c.name })
    setShowForm(true)
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`هل أنت متأكد من حذف المدينة: ${name}؟`)) return
    await fetch(`/api/cities?id=${id}`, { method: 'DELETE' })
    onRefresh()
  }

  return (
    <div className="absolute top-14 right-20 left-0 bottom-0 bg-[#0B0E11] p-8 font-['Cairo'] text-right overflow-y-auto custom-scrollbar z-20" dir="rtl">
      <header className="flex justify-between items-center mb-8 border-b border-[#2D3339] pb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#00E5FF]">سجل النطاقات الجغرافية</h1>
          <p className="text-outline text-sm mt-1">إشراف وإدارة المدن النشطة في مسرح العمليات</p>
        </div>
        {!showForm && (
          <button onClick={() => { setFormData({ id: '', name: '' }); setShowForm(true); }} className="flex items-center gap-2 bg-[#00E5FF] text-[#0f172a] px-6 py-2.5 rounded-lg font-bold shadow-lg transition-all active:scale-95">
            <span className="material-symbols-outlined text-[20px]">add_location</span>
            إضافة مدينة
          </button>
        )}
      </header>

      {showForm ? (
        <div className="max-w-2xl mx-auto bg-[#15191C] border border-[#2D3339] p-8 rounded-2xl shadow-xl animate-enter">
          <h2 className="text-xl font-bold text-white mb-6">{formData.id ? 'تعديل النطاق الجغرافي' : 'تعريف مدينة جديدة'}</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">اسم المدينة</label>
              <input required value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="w-full bg-[#0B0E11] border border-[#2D3339] p-4 rounded-xl text-white outline-none focus:border-[#00E5FF]" />
            </div>
            <div className="flex gap-4">
              <button type="submit" disabled={loading} className="flex-1 bg-[#00E5FF] text-[#0f172a] font-bold p-4 rounded-xl shadow-lg transition-all">
                {loading ? 'جاري الحفظ...' : 'حفظ البيانات'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 border border-[#2D3339] text-slate-500 rounded-xl hover:bg-white/5 transition-colors">إلغاء</button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-[#15191C] border border-[#2D3339] rounded-2xl overflow-hidden shadow-2xl">
          <table className="w-full text-right">
            <thead className="bg-[#0B0E11] text-slate-500 text-xs border-b border-[#2D3339]">
              <tr>
                <th className="p-5 font-bold text-center">الرمز</th>
                <th className="p-5 font-bold">اسم المدينة</th>
                <th className="p-5 font-bold text-center">الحالات النشطة</th>
                <th className="p-5 font-bold text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {cities.map(c => {
                const count = cases.filter(cs => cs.city === c.name).length;
                return (
                  <tr key={c.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-5 font-mono text-[10px] text-slate-500 tracking-tighter w-1/4 uppercase text-center">{c.id.slice(-6)}</td>
                    <td className="p-5 font-bold text-white text-lg">
                      <button onClick={() => onViewCases?.(c.name)} className="hover:text-[#00E5FF] transition-colors">{c.name}</button>
                    </td>
                    <td className="p-5 text-center">
                      <button 
                        onClick={() => onViewCases?.(c.name)}
                        className="bg-[#00E5FF]/10 text-[#00E5FF] px-3 py-1 rounded-full font-bold text-sm border border-[#00E5FF]/20 hover:bg-[#00E5FF]/20 transition-all"
                      >
                        {count} حالة
                      </button>
                    </td>
                    <td className="p-5">
                      <div className="flex justify-center gap-4">
                        <button onClick={() => handleEdit(c)} className="text-slate-500 hover:text-[#00E5FF] transition-colors"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                        <button onClick={() => handleDelete(c.id, c.name)} className="text-slate-500 hover:text-error transition-colors"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {cities.length === 0 && (
                <tr>
                   <td colSpan="4" className="p-20 text-center text-slate-600 italic">لا توجد مدن مسجلة في سجل النطاقات</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
