import { useState } from 'react'
import { exportToExcel } from '@/utils/export'

const LIBYAN_CITIES_BACKUP = [
  "طرابلس", "بنغازي", "مصراتة", "الزاوية", "سبها", 
  "طبرق", "درنة", "سرت", "البيضاء", "صبراتة", 
  "غريان", "ترهونة", "زواره", "زليتن"
];

const getCities = (cities) => cities.length > 0 ? cities.map(c => c.name) : LIBYAN_CITIES_BACKUP;

export default function CasesView({ cases = [], members = [], cities = [], campaigns = [], onRefresh, initialCity = '' }) {
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [cityFilter, setCityFilter] = useState(initialCity || 'الكل')
  
  const defaultForm = { id: '', title: '', city: 'طرابلس', type: 'رصد ومتابعة', description: '', assignedUserIds: [], campaignId: '', lat: null, lng: null }
  const [formData, setFormData] = useState(defaultForm)
  const [mediaInspector, setMediaInspector] = useState(null) // { title: '', images: [] }

  const handleExport = () => {
    const data = filteredCases.map(c => ({
      'ID': c.id,
      'Title': c.title,
      'City': c.city,
      'Type': c.type,
      'Status': c.status,
      'Visits': c.visits?.length || 0,
      'Created At': new Date(c.createdAt).toLocaleDateString()
    }));
    exportToExcel(data, `HSN_Cases_Report_${new Date().toISOString().split('T')[0]}`);
  };

  const toggleCaseStatus = async (c) => {
    const newStatus = c.status === 'OPEN' ? 'CLOSED' : 'OPEN';
    await fetch('/api/cases', { 
      method: 'POST', 
      body: JSON.stringify({ ...c, status: newStatus }) 
    });
    onRefresh();
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    if (!formData.campaignId) {
      alert('⚠️ يجب ربط الحالة بحملة نشطة أولاً');
      setLoading(false);
      return;
    }
    try {
      await fetch('/api/cases', { 
        method: 'POST', 
        body: JSON.stringify(formData) 
      })
      onRefresh()
      setShowForm(false)
      setFormData(defaultForm)
    } finally {
      setLoading(false)
    }
  }

  const toggleSpecialist = (id) => {
    let ids = [...formData.assignedUserIds]
    if (ids.includes(id)) ids = ids.filter(x => x !== id)
    else ids.push(id)
    setFormData({...formData, assignedUserIds: ids})
  }

  const handleEdit = (c) => {
    setFormData({
      id: c.id, 
      title: c.title || '', 
      city: c.city || 'طرابلس',
      type: c.type || 'رصد ومتابعة', 
      description: c.description || '', 
      assignedUserIds: c.assignments ? c.assignments.map(a => a.userId) : [],
      campaignId: c.campaignId || '',
      lat: c.lat,
      lng: c.lng
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if(!confirm('سحق ملف الحالة نهائياً؟')) return;
    await fetch('/api/cases?id=' + id, { method: 'DELETE' })
    onRefresh()
  }

  const filteredCases = cases.filter(c => {
    const matchesSearch = c.title?.includes(searchQuery) || c.description?.includes(searchQuery);
    const matchesCity = cityFilter === 'الكل' || c.city === cityFilter;
    return matchesSearch && matchesCity;
  });

  return (
    <div className="absolute top-14 right-20 left-0 bottom-0 bg-[#0B0E11] p-8 font-['Cairo'] text-right overflow-y-auto custom-scrollbar z-20" dir="rtl">
      <header className="flex justify-between items-center mb-8 border-b border-[#2D3339] pb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#00E5FF]">سجل العمليات الميدانية</h1>
          <p className="text-outline text-sm mt-1">حصر وتتبع المسار الإجرائي للحالات النشطة</p>
        </div>
        <div className="flex gap-4">
           <select 
             value={cityFilter} 
             onChange={e => setCityFilter(e.target.value)}
             className="bg-[#15191C] border border-[#2D3339] text-white px-4 py-2 rounded-lg text-sm outline-none focus:border-[#00E5FF]"
           >
              <option value="الكل">تصفية حسب المدينة (الكل)</option>
              {getCities(cities).map(city => <option key={city} value={city}>{city}</option>)}
           </select>
           <div className="relative">
              <span className="material-symbols-outlined absolute right-3 top-2 text-slate-500 text-[18px]">search</span>
              <input 
                type="text" 
                placeholder="بحث في الحالات..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-[#15191C] border border-[#2D3339] pr-10 pl-4 py-2 rounded-lg text-sm text-white focus:border-[#00E5FF] outline-none w-64"
              />
           </div>
           <button onClick={handleExport} className="flex items-center gap-2 bg-white/5 border border-white/10 text-slate-400 px-4 py-2 rounded-lg text-sm hover:text-[#00E5FF] transition-all">
             <span className="material-symbols-outlined text-[18px]">download</span>
             تصدير التقرير
           </button>
           <button onClick={() => { setFormData(defaultForm); setShowForm(true); }} className="flex items-center gap-2 bg-[#00E5FF] text-[#0f172a] px-5 py-2 rounded-lg font-bold shadow-lg transition-all active:scale-95">
             <span className="material-symbols-outlined text-[20px]">add_location</span>
             إطلاق حالة جديدة
           </button>
        </div>
      </header>

      {mediaInspector && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 md:p-10 animate-fade-in backdrop-blur-md">
            <div className="bg-[#15191C] border border-[#2D3339] rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
               <div className="p-6 border-b border-[#2D3339] flex justify-between items-center bg-white/5">
                  <div className="flex items-center gap-3">
                     <span className="material-symbols-outlined text-[#00E5FF]">history_edu</span>
                     <h2 className="text-xl font-bold">التسلسل الزمني للإحاطات: <span className="text-[#00E5FF]">{mediaInspector.title}</span></h2>
                  </div>
                  <button onClick={() => setMediaInspector(null)} className="bg-white/5 w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
               </div>
               
               <div className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar bg-[#0B0E11]/50">
                  <div className="max-w-3xl mx-auto space-y-8 relative before:content-[''] before:absolute before:left-[-20px] before:top-0 before:bottom-0 before:w-1 before:bg-gradient-to-b before:from-[#00E5FF]/20 before:to-transparent ml-8">
                     {(mediaInspector.visits || []).slice().sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).map((v, i) => (
                        <div key={i} className="relative bg-[#1A1F24] border border-white/5 p-6 rounded-2xl shadow-xl hover:border-[#00E5FF]/30 transition-all group">
                           {/* Timeline Dot */}
                           <div className="absolute left-[-26px] top-8 w-3 h-3 rounded-full bg-[#00E5FF] shadow-[0_0_10px_#00E5FF] group-hover:scale-125 transition-transform" />
                           
                           <div className="flex justify-between items-start mb-4">
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-full bg-slate-800 overflow-hidden border border-white/10">
                                    {v.user?.photo ? <img src={v.user.photo} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-sm m-2">person</span>}
                                 </div>
                                 <div>
                                    <h4 className="text-sm font-bold text-white">{v.user?.name || 'مختص غير معروف'}</h4>
                                    <p className="text-[10px] text-slate-500">{new Date(v.timestamp).toLocaleString('ar-LY')}</p>
                                 </div>
                              </div>
                              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">{v.id.split('-')[0]}</span>
                           </div>

                           <p className="text-slate-300 text-sm leading-relaxed mb-4 p-4 bg-black/20 rounded-xl border border-white/5">{v.notes}</p>

                           {/* Audio Briefing */}
                           {v.voiceData && (
                              <div className="mb-4 flex items-center gap-3 bg-[#00E5FF]/5 border border-[#00E5FF]/20 p-4 rounded-xl">
                                 <button 
                                   onClick={() => {
                                      const audio = new Audio(`data:audio/aac;base64,${v.voiceData}`);
                                      audio.play();
                                   }}
                                   className="w-10 h-10 rounded-full bg-[#00E5FF] text-slate-950 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg"
                                 >
                                    <span className="material-symbols-outlined">play_arrow</span>
                                 </button>
                                 <div>
                                    <p className="text-[10px] font-bold text-[#00E5FF] uppercase tracking-wider">إحاطة صوتية ميدانية</p>
                                    <p className="text-[9px] text-slate-500">انقر للاستماع إلى الإيجاز</p>
                                 </div>
                              </div>
                           )}

                           {/* Images Grid */}
                           {JSON.parse(v.images || '[]').length > 0 && (
                              <div className="grid grid-cols-3 gap-2">
                                 {JSON.parse(v.images || '[]').map((img, imgIdx) => (
                                    <div key={imgIdx} className="aspect-square rounded-lg overflow-hidden border border-white/5 hover:border-[#00E5FF]/50 transition-all cursor-zoom-in">
                                       <img src={img} className="w-full h-full object-cover" onClick={() => window.open(img, '_blank')} />
                                    </div>
                                 ))}
                              </div>
                           )}
                        </div>
                     ))}
                     {(mediaInspector.visits || []).length === 0 && (
                        <div className="py-20 text-center text-slate-600 flex flex-col items-center gap-4">
                           <span className="material-symbols-outlined text-5xl opacity-20">history</span>
                           <span className="italic">لم يتم تسجيل أي تحركات أو إحاطات لهذه الحالة بعد</span>
                        </div>
                     )}
                  </div>
               </div>
            </div>
        </div>
      )}

      {showForm ? (
        <div className="max-w-6xl mx-auto animate-enter">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-[#00E5FF]">{formData.id ? 'استكمال ملف الحالة' : 'إطلاق حالة استراتيجية'}</h3>
            <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-white">
                <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="flex flex-col lg:grid lg:grid-cols-3 gap-8">
             <div className="lg:col-span-2 bg-[#15191C] border border-[#2D3339] p-8 rounded-2xl shadow-xl flex flex-col gap-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                       <label className="text-xs text-slate-500 mb-1 block">عنوان الحالة / الهدف</label>
                       <input required value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} className="w-full bg-[#0B0E11] border border-[#2D3339] p-4 rounded-xl text-white outline-none focus:border-[#00E5FF]" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                       <div>
                          <label className="text-xs text-slate-500 mb-1 block">المدينة</label>
                          <select 
                            required 
                            value={formData.city} 
                            onChange={e=>setFormData({...formData, city: e.target.value})} 
                            className="w-full bg-[#0B0E11] border border-[#2D3339] p-4 rounded-xl text-white outline-none focus:border-[#00E5FF]"
                          >
                            {getCities(cities).map(city => <option key={city} value={city}>{city}</option>)}
                          </select>
                       </div>
                       <div>
                          <label className="text-xs text-slate-500 mb-1 block">التصنيف</label>
                          <select value={formData.type} onChange={e=>setFormData({...formData, type: e.target.value})} className="w-full bg-[#0B0E11] border border-[#2D3339] p-4 rounded-xl text-white outline-none focus:border-[#00E5FF]">
                             <option>رصد ومتابعة</option>
                             <option>تحقيق حالة</option>
                             <option>تدخل حرج</option>
                             <option>إغاثة</option>
                          </select>
                       </div>
                    </div>
                 </div>

                 <div>
                    <label className="text-xs text-slate-500 mb-1 block">الحملة المرتبطة (إلزامي)</label>
                    <select 
                      required 
                      value={formData.campaignId} 
                      onChange={e=>setFormData({...formData, campaignId: e.target.value})} 
                      className="w-full bg-[#0B0E11] border border-[#00E5FF]/30 p-4 rounded-xl text-white outline-none focus:border-[#00E5FF]"
                    >
                      <option value="">اختر الحملة المستهدفة</option>
                      {campaigns.filter(c => c.status === 'ACTIVE').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                 </div>

                 <div>
                    <label className="text-xs text-slate-500 mb-1 block">الوصف والتعليمات الميدانية</label>
                    <textarea value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} className="w-full bg-[#0B0E11] border border-[#2D3339] p-4 rounded-xl text-white h-32 resize-none outline-none focus:border-[#00E5FF]" />
                 </div>

                 <button type="submit" disabled={loading} className="w-full bg-[#00E5FF] text-[#0f172a] font-bold p-4 rounded-2xl shadow-lg active:scale-95 transition-all">
                    {loading ? 'جاري التنفيذ...' : 'اعتماد الحالة على الخارطة'}
                 </button>
             </div>

             <div className="bg-[#15191C] border border-[#2D3339] p-8 rounded-2xl shadow-xl">
                <h4 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                   <span className="material-symbols-outlined text-[#00E5FF]">groups</span>
                   إسناد المختصين
                </h4>
                <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                   {members.map(m => (
                      <div 
                        key={m.id} 
                        onClick={() => toggleSpecialist(m.id)}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${formData.assignedUserIds.includes(m.id) ? 'border-[#00E5FF] bg-[#00E5FF]/5' : 'border-[#2D3339] grayscale hover:grayscale-0'}`}
                      >
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-800">
                               {m.photo ? <img src={m.photo} className="w-full h-full object-cover"/> : <span className="material-symbols-outlined m-2 text-slate-600 font-bold">person</span>}
                            </div>
                             <div className="flex flex-col">
                               <span className="text-sm font-bold">{m.name}</span>
                               <span className="text-[10px] text-slate-500">{m.committee}</span>
                             </div>
                         </div>
                         {formData.assignedUserIds.includes(m.id) && <span className="material-symbols-outlined text-[#00E5FF] text-lg">check_circle</span>}
                      </div>
                   ))}
                </div>
             </div>
          </form>
        </div>
      ) : (
        <div className="bg-[#15191C] border border-[#2D3339] rounded-2xl overflow-hidden shadow-2xl">
          <table className="w-full text-right border-collapse">
            <thead className="bg-[#0B0E11] text-slate-500 text-xs border-b border-[#2D3339]">
              <tr>
                <th className="p-5 font-bold">الحالة الإستراتيجية</th>
                <th className="p-5 font-bold">المدينة</th>
                <th className="p-5 font-bold">التصنيف</th>
                <th className="p-5 font-bold">المختصين</th>
                <th className="p-5 font-bold text-center">التحركات</th>
                <th className="p-5 font-bold text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredCases.map(c => (
                <tr key={c.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                  <td className="p-5">
                    <div className="flex flex-col">
                      <span className="font-bold text-[#00E5FF] text-lg">{c.title}</span>
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest">{c.id}</span>
                    </div>
                  </td>
                  <td className="p-5">
                    <span className="bg-white/5 border border-white/10 px-3 py-1 rounded-full text-xs text-white">{c.city || 'غير محدد'}</span>
                  </td>
                  <td className="p-5 text-sm text-slate-400 font-bold">
                    <span className={`px-2 py-0.5 rounded border ${c.status === 'OPEN' ? 'border-success-container/30 text-success-container' : 'border-slate-700 text-slate-600'}`}>{c.status === 'OPEN' ? 'نشطة' : 'مؤرشفة'}</span>
                  </td>
                  <td className="p-5">
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {c.assignments?.map(a => (
                        <span key={a.userId} className="text-[10px] bg-primary-container/20 text-white px-2 py-0.5 rounded border border-white/5">{a.user?.name}</span>
                      ))}
                      {c.assignments?.length === 0 && <span className="text-[10px] text-slate-600 italic">غير مسندة</span>}
                    </div>
                  </td>
                  <td className="p-5 text-center">
                    <button 
                      onClick={() => setMediaInspector({ title: c.title, visits: c.visits || [] })}
                      className="group relative inline-flex items-center gap-2 bg-[#00E5FF]/5 text-[#00E5FF] px-4 py-1.5 rounded-full font-mono font-bold border border-[#00E5FF]/20 hover:bg-[#00E5FF]/20 transition-all hover:scale-105 active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[16px] animate-pulse">radar</span>
                      {c.visits?.length || 0}
                      <span className="text-[10px] opacity-60 font-sans mr-1">إيجاز</span>
                    </button>
                  </td>
                  <td className="p-5">
                    <div className="flex justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button onClick={() => toggleCaseStatus(c)} className="text-slate-500 hover:text-warning transition-colors" title={c.status === 'OPEN' ? 'أرشفة الحالة' : 'تنشيط الحالة'}>
                          <span className="material-symbols-outlined text-[18px]">{c.status === 'OPEN' ? 'archive' : 'unarchive'}</span>
                       </button>
                       <button onClick={() => handleEdit(c)} className="text-slate-500 hover:text-[#00E5FF] transition-colors"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                       <button onClick={() => handleDelete(c.id)} className="text-slate-500 hover:text-error transition-colors"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCases.length === 0 && (
                <tr>
                   <td colSpan="6" className="p-20 text-center text-slate-600 italic">سجل الحالات فارغ تماماً</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
