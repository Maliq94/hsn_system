import { useState } from 'react'

export default function CemeteriesView({ campaigns = [], onRefresh }) {
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  const cemeteries = campaigns.flatMap(c => (c.cemeteries || []).map(cem => ({ ...cem, campaignName: c.name })));

  const filtered = cemeteries.filter(c => 
    c.name.includes(searchQuery) || (c.notes && c.notes.includes(searchQuery))
  );

  const handleDelete = async (id) => {
    if(!confirm('حذف سجل المقبرة نهائياً؟')) return;
    await fetch('/api/cemeteries?id=' + id, { method: 'DELETE' })
    onRefresh()
  }

  return (
    <div className="absolute top-14 right-20 left-0 bottom-0 bg-[#0B0E11] p-8 font-['Cairo'] text-right overflow-y-auto custom-scrollbar z-20" dir="rtl">
      <header className="flex justify-between items-center mb-8 border-b border-[#2D3339] pb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#10b981]">سجل المقابر والمواقع المسحية</h1>
          <p className="text-outline text-sm mt-1">حصر وتوثيق المواقع الجاري مسحها ضمن الحملات</p>
        </div>
        <div className="flex gap-4">
           <div className="relative">
              <span className="material-symbols-outlined absolute right-3 top-2 text-slate-500 text-[18px]">search</span>
              <input 
                type="text" 
                placeholder="بحث في المقابر..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-[#15191C] border border-[#2D3339] pr-10 pl-4 py-2 rounded-lg text-sm text-white focus:border-[#10b981] outline-none w-64"
              />
           </div>
        </div>
      </header>

      <div className="bg-[#15191C] border border-[#2D3339] rounded-2xl overflow-hidden shadow-2xl">
        <table className="w-full text-right border-collapse">
          <thead className="bg-[#0B0E11] text-slate-500 text-xs border-b border-[#2D3339]">
            <tr>
              <th className="p-5 font-bold">الموقع / المقبرة</th>
              <th className="p-5 font-bold">الحملة المرتبطة</th>
              <th className="p-5 font-bold">الحالة</th>
              <th className="p-5 font-bold">الإحداثيات</th>
              <th className="p-5 font-bold text-center">الزيارات</th>
              <th className="p-5 font-bold text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                <td className="p-5">
                  <div className="flex flex-col">
                    <span className="font-bold text-[#10b981] text-lg">{c.name}</span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest">{c.id}</span>
                  </div>
                </td>
                <td className="p-5">
                  <span className="bg-white/5 border border-white/10 px-3 py-1 rounded-full text-xs text-white">{c.campaignName}</span>
                </td>
                <td className="p-5 text-sm text-slate-400 font-bold">
                  <span className={`px-2 py-0.5 rounded border ${c.status === 'CLEANED' ? 'border-emerald-500/30 text-emerald-500' : 'border-amber-500/30 text-amber-500'}`}>
                    {c.status === 'CLEANED' ? 'طاهرة' : 'قيد الفحص'}
                  </span>
                </td>
                <td className="p-5">
                   <span className="text-xs font-mono text-slate-500">{c.lat ? `${c.lat.toFixed(4)}, ${c.lng.toFixed(4)}` : 'لم يحدد'}</span>
                </td>
                <td className="p-5 text-center">
                  <span className="bg-[#10b981]/10 text-[#10b981] px-4 py-1 rounded-full font-mono font-bold border border-[#10b981]/20">
                    {c.visits?.length || 0}
                  </span>
                </td>
                <td className="p-5">
                  <div className="flex justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button onClick={() => handleDelete(c.id)} className="text-slate-500 hover:text-red-500 transition-colors">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                     </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                 <td colSpan="6" className="p-20 text-center text-slate-600 italic">لا توجد مقابر مسجلة</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
