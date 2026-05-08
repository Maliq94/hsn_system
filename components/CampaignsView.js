'use client'
import { useState } from 'react'

export default function CampaignsView({ campaigns = [], members = [], cities = [], onRefresh }) {
  const [showForm, setShowForm] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState(null)
  const [formData, setFormData] = useState({ name: '', city: '', description: '', visibility: 'PRIVATE', memberIds: [], isDefault: false, status: 'ACTIVE' })
  const [cemeteryInspector, setCemeteryInspector] = useState(null)
  const [caseInspector, setCaseInspector] = useState(null)

  const statusColors = { ACTIVE: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30', COMPLETED: 'text-slate-400 bg-slate-400/10 border-slate-400/30', SUSPENDED: 'text-amber-400 bg-amber-400/10 border-amber-400/30' }
  const statusLabels = { ACTIVE: 'نشطة', COMPLETED: 'منتهية', SUSPENDED: 'معلقة' }
  const cemeteryStatusLabels = { PENDING: 'بانتظار التفتيش', CLEANED: 'تم التنظيف', FLAGGED: 'مشبوهة' }
  const cemeteryStatusColors = { PENDING: 'text-amber-400', CLEANED: 'text-emerald-400', FLAGGED: 'text-red-400' }

  const specialists = members.filter(m => m.role === 'SPECIALIST' && m.status === 'ACTIVE')
  const getCities = () => cities.length > 0 ? cities.map(c => c.name) : ['طرابلس', 'بنغازي', 'مصراتة', 'الزاوية', 'زليتن']

  const handleSubmit = async (e) => {
    e.preventDefault()
    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, id: formData.id || undefined })
    })
    if (res.ok) {
      setShowForm(false)
      setFormData({ name: '', city: '', description: '', visibility: 'PRIVATE', memberIds: [], isDefault: false, status: 'ACTIVE' })
      onRefresh()
    }
  }

  const updateStatus = async (id, status) => {
    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, name: selectedCampaign.name, city: selectedCampaign.city, description: selectedCampaign.description, visibility: selectedCampaign.visibility, memberIds: selectedCampaign.members?.map(m => m.userId) || [] })
    })
    const updated = await res.json()
    onRefresh()
    setSelectedCampaign(updated)
  }

  const deleteCampaign = async (id) => {
    if (!confirm('هل تريد حذف هذه الحملة نهائياً؟')) return
    await fetch(`/api/campaigns?id=${id}`, { method: 'DELETE' })
    onRefresh()
    setSelectedCampaign(null)
  }

  const toggleDefault = async (c) => {
    await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...c, id: c.id, isDefault: !c.isDefault, memberIds: c.members?.map(m => m.userId) || [] })
    })
    onRefresh()
  }

  const editCampaign = (c) => {
    setFormData({ id: c.id, name: c.name, city: c.city, description: c.description || '', visibility: c.visibility, memberIds: c.members?.map(m => m.userId) || [], isDefault: c.isDefault, status: c.status })
    setSelectedCampaign(null)
    setShowForm(true)
  }

  const toggleMember = (uid) => {
    setFormData(prev => ({
      ...prev,
      memberIds: prev.memberIds.includes(uid) ? prev.memberIds.filter(id => id !== uid) : [...prev.memberIds, uid]
    }))
  }

  // DETAIL VIEW
  if (selectedCampaign) {
    const c = campaigns.find(x => x.id === selectedCampaign.id) || selectedCampaign
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 animate-enter" dir="rtl">
        {/* CEMETERY INSPECTOR LIGHTBOX */}
        {cemeteryInspector && (
          <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-xl animate-fade-in">
            <div className="bg-[#15191C] border border-[#2D3339] rounded-3xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-[#2D3339] flex justify-between items-center bg-white/5">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-emerald-400">mosque</span>
                  <h2 className="text-xl font-bold">معاينة موقع: <span className="text-emerald-400">{cemeteryInspector.name}</span></h2>
                </div>
                <button onClick={() => setCemeteryInspector(null)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="md:col-span-2 space-y-8">
                    <section>
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">الإحاطة المبدئية</h4>
                      <p className="text-slate-300 bg-white/5 p-6 rounded-2xl leading-relaxed border border-white/5">
                        {cemeteryInspector.notes || 'لا توجد ملاحظات مسجلة للحظة التأسيس.'}
                      </p>
                    </section>
                    
                    <section>
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">السجل الاستخباري (Timeline)</h4>
                      <div className="space-y-6">
                        {(cemeteryInspector.visits || []).slice().sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp)).map(v => (
                          <div key={v.id} className="bg-black/20 border border-white/5 p-5 rounded-2xl relative pr-6">
                            <div className="absolute right-0 top-0 bottom-0 w-1 bg-emerald-400/20 rounded-full"></div>
                            <div className="flex justify-between items-start mb-3">
                              <span className="text-[10px] text-slate-500 font-mono tracking-widest">{new Date(v.timestamp).toLocaleString('ar-LY')}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-slate-400">{v.user?.role}</span>
                                <span className="text-[10px] font-black text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">{v.user?.name}</span>
                              </div>
                            </div>
                            <p className="text-sm text-slate-200 leading-relaxed mb-4">{v.notes}</p>
                            <div className="flex gap-2">
                               {v.voiceData && (
                                  <button onClick={() => new Audio(`data:audio/aac;base64,${v.voiceData}`).play()} className="flex items-center gap-2 bg-emerald-400/10 px-3 py-1.5 rounded-lg border border-emerald-400/20 text-[10px] text-emerald-400 hover:bg-emerald-400/20 transition-all">
                                     <span className="material-symbols-outlined text-sm">play_arrow</span> تسجيل صوتي
                                  </button>
                               )}
                            </div>
                          </div>
                        ))}
                        {(cemeteryInspector.visits || []).length === 0 && (
                          <div className="text-center py-10 bg-black/10 rounded-2xl border border-dashed border-white/5 text-slate-600 text-xs italic">
                            بانتظار مباشرة العمل الميداني في هذا الموقع.
                          </div>
                        )}
                      </div>
                    </section>
                  </div>
                  
                  <div className="space-y-8">
                    <section className="bg-white/5 border border-white/5 p-6 rounded-2xl">
                       <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">بيانات الموقع</h4>
                       <div className="space-y-4">
                          <div className="flex justify-between">
                             <span className="text-[11px] text-slate-500">الإحداثيات:</span>
                             <span className="text-xs font-mono text-white" dir="ltr">{cemeteryInspector.lat ? `${cemeteryInspector.lat.toFixed(6)}, ${cemeteryInspector.lng?.toFixed(6)}` : 'غير محددة'}</span>
                          </div>
                          {cemeteryInspector.lat && (
                            <button onClick={() => window.open(`https://www.google.com/maps?q=${cemeteryInspector.lat},${cemeteryInspector.lng}`, '_blank')} className="w-full bg-[#00E5FF]/10 text-[#00E5FF] py-3 rounded-xl border border-[#00E5FF]/20 text-[10px] font-black hover:bg-[#00E5FF]/20 mt-2">
                               فتح في الخريطة
                            </button>
                          )}
                          <div className="w-full h-px bg-white/5 my-2"></div>
                          <div className="flex justify-between">
                             <span className="text-[11px] text-slate-500">حالة الموقع:</span>
                             <span className={`text-[11px] font-black ${cemeteryStatusColors[cemeteryInspector.status]}`}>{cemeteryStatusLabels[cemeteryInspector.status]}</span>
                          </div>
                       </div>
                    </section>

                    {cemeteryInspector.voiceData && (
                       <section className="bg-emerald-500/5 border border-emerald-500/10 p-5 rounded-2xl">
                          <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-3">التسجيل التأسيسي</h4>
                          <button onClick={() => new Audio(`data:audio/aac;base64,${cemeteryInspector.voiceData}`).play()} className="w-full flex items-center justify-center gap-3 bg-emerald-500 text-slate-950 p-4 rounded-xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all">
                             <span className="material-symbols-outlined font-black">mic_external_on</span>
                             <span className="text-xs font-black">تشغيل الإيجاز</span>
                          </button>
                       </section>
                    )}

                    <section>
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">الأرشيف البصري (Gallery)</h4>
                      <div className="grid grid-cols-2 gap-2">
                         {/* Images from cemetery itself */}
                         {JSON.parse(cemeteryInspector.images || '[]').map((img, i) => (
                           <img key={`cem-${i}`} src={img} className="aspect-square object-cover rounded-xl border border-white/10 hover:border-emerald-400 transition-all cursor-zoom-in" onClick={() => window.open(img, '_blank')} />
                         ))}
                         {/* Images from visits */}
                         {(cemeteryInspector.visits || []).flatMap(v => JSON.parse(v.images || '[]')).map((img, i) => (
                            <img key={`visit-${i}`} src={img} className="aspect-square object-cover rounded-xl border border-white/10 hover:border-emerald-400 transition-all cursor-zoom-in shadow-xl" onClick={() => window.open(img, '_blank')} />
                         ))}
                      </div>
                      {JSON.parse(cemeteryInspector.images || '[]').length === 0 && (cemeteryInspector.visits || []).length === 0 && (
                        <div className="py-8 text-center text-[10px] text-slate-600 italic border border-dashed border-white/5 rounded-2xl">لا توجد صور بعد</div>
                      )}
                    </section>
                  </div>
                </div>
            </div>
          </div>
        )}

        {/* CASE INSPECTOR LIGHTBOX */}
        {caseInspector && (
          <div className="fixed inset-0 bg-black/95 z-[110] flex items-center justify-center p-4 backdrop-blur-2xl animate-fade-in">
            <div className="bg-[#0B0E11] border border-[#2D3339] rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-[#2D3339] flex justify-between items-center bg-white/5">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-purple-400">assignment</span>
                  <h2 className="text-xl font-bold">ملف الحالة: <span className="text-purple-400">{caseInspector.title}</span></h2>
                </div>
                <button onClick={() => setCaseInspector(null)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="md:col-span-2 space-y-8">
                    <section>
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">وصف الحالة</h4>
                      <p className="text-slate-300 bg-white/5 p-6 rounded-2xl leading-relaxed border border-white/5">
                        {caseInspector.description || 'لا يوجد وصف متاح.'}
                      </p>
                    </section>
                    
                    <section>
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">سجل الأحداث الميدانية ({caseInspector.visits?.length || 0})</h4>
                      <div className="space-y-6">
                        {(caseInspector.visits || []).slice().sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp)).map(v => (
                          <div key={v.id} className="bg-black/20 border border-white/5 p-5 rounded-2xl">
                            <div className="flex justify-between items-start mb-3">
                              <span className="text-[10px] text-slate-500 font-mono tracking-widest">{new Date(v.timestamp).toLocaleString('ar-LY')}</span>
                              <span className="text-[10px] font-black text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">{v.user?.name}</span>
                            </div>
                            <p className="text-sm text-slate-200 leading-relaxed mb-4">{v.notes}</p>
                            {v.voiceData && (
                               <button onClick={() => new Audio(`data:audio/aac;base64,${v.voiceData}`).play()} className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 text-[10px] text-slate-400 hover:text-white transition-all">
                                  <span className="material-symbols-outlined text-sm">play_arrow</span> تشغيل التسجيل الصوتي
                               </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                  
                  <div className="space-y-8">
                    <section className="bg-white/5 border border-white/5 p-6 rounded-2xl">
                       <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">بيانات تقنية</h4>
                       <div className="space-y-4">
                          <div className="flex justify-between">
                             <span className="text-[11px] text-slate-500">نطاق المدينة:</span>
                             <span className="text-[11px] text-white font-bold">{caseInspector.city}</span>
                          </div>
                          <div className="flex justify-between">
                             <span className="text-[11px] text-slate-500">نوع الحالة:</span>
                             <span className="text-[11px] text-white font-bold">{caseInspector.type}</span>
                          </div>
                          <div className="flex justify-between">
                             <span className="text-[11px] text-slate-500">الحالة:</span>
                             <span className="text-[11px] font-black uppercase text-emerald-400">{caseInspector.status}</span>
                          </div>
                       </div>
                    </section>

                    <section>
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">صور الحقل</h4>
                      <div className="grid grid-cols-2 gap-2">
                         {(caseInspector.visits || []).flatMap(v => JSON.parse(v.images || '[]')).map((img, i) => (
                            <img key={i} src={img} className="aspect-square object-cover rounded-xl border border-white/10 hover:border-purple-400 transition-all cursor-pointer" onClick={() => window.open(img, '_blank')} />
                         ))}
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <button onClick={() => setSelectedCampaign(null)} className="flex items-center gap-2 text-slate-400 hover:text-[#00E5FF] mb-6 transition-colors">
          <span className="material-symbols-outlined">arrow_forward</span>
          <span className="text-sm font-bold">العودة للحملات</span>
        </button>

        <div className="flex items-start justify-between mb-8">
          <div>
            <h2 className="text-3xl font-black text-white mb-2">{c.name}</h2>
            <div className="flex items-center gap-3">
              <span className={`text-[10px] font-black uppercase px-3 py-1 rounded border ${statusColors[c.status]}`}>{statusLabels[c.status]}</span>
              <span className="text-sm text-slate-500">{c.city}</span>
              <span className="text-[10px] text-slate-600 border border-white/5 px-2 py-0.5 rounded">{c.visibility === 'PUBLIC' ? 'عامة' : 'خاصة'}</span>
              {c.isDefault && (
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/30">
                  <span className="material-symbols-outlined text-[12px]">keep</span> المهمة الأساسية
                </span>
              )}
            </div>
            {c.description && <p className="text-slate-400 text-sm mt-3 max-w-xl">{c.description}</p>}
          </div>
          <div className="flex gap-2">
            <button onClick={() => editCampaign(c)} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-slate-300 text-sm hover:bg-white/10 transition-colors">
              <span className="material-symbols-outlined text-sm ml-1">edit</span> تعديل
            </button>
            {c.status === 'ACTIVE' && (
              <>
                <button onClick={() => updateStatus(c.id, 'COMPLETED')} className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm hover:bg-emerald-500/20">إنهاء الحملة</button>
                <button onClick={() => updateStatus(c.id, 'SUSPENDED')} className="px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-sm hover:bg-amber-500/20">تعليق مؤقت</button>
              </>
            )}
            {c.status === 'COMPLETED' && (
              <button onClick={() => updateStatus(c.id, 'ACTIVE')} className="px-4 py-2 bg-[#00E5FF]/10 border border-[#00E5FF]/30 rounded-xl text-[#00E5FF] text-sm">إعادة فتح الحملة</button>
            )}
            {c.status === 'SUSPENDED' && (
              <button onClick={() => updateStatus(c.id, 'ACTIVE')} className="px-4 py-2 bg-[#00E5FF]/10 border border-[#00E5FF]/30 rounded-xl text-[#00E5FF] text-sm">استئناف العمل</button>
            )}
            <button onClick={() => toggleDefault(c)} className={`px-4 py-2 border rounded-xl text-sm transition-all flex items-center gap-2 ${c.isDefault ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}>
              <span className="material-symbols-outlined text-sm">{c.isDefault ? 'keep_off' : 'keep'}</span>
              {c.isDefault ? 'إزالة التثبيت' : 'تعيين كافتراضية'}
            </button>
            <button onClick={() => deleteCampaign(c.id)} className="px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm hover:bg-red-500/20">حذف</button>
          </div>
        </div>

        {/* STATS ROW */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-[#15191C] border border-[#2D3339] p-6 rounded-2xl text-center">
            <div className="text-3xl font-black text-[#00E5FF]">{c.members?.length || 0}</div>
            <div className="text-[10px] text-slate-500 font-bold uppercase mt-1">الأعضاء</div>
          </div>
          <div className="bg-[#15191C] border border-[#2D3339] p-6 rounded-2xl text-center">
            <div className="text-3xl font-black text-emerald-400">{c.cemeteries?.length || 0}</div>
            <div className="text-[10px] text-slate-500 font-bold uppercase mt-1">المقابر</div>
          </div>
          <div className="bg-[#15191C] border border-[#2D3339] p-6 rounded-2xl text-center">
            <div className="text-3xl font-black text-purple-400">{c.cases?.length || 0}</div>
            <div className="text-[10px] text-slate-500 font-bold uppercase mt-1">الحالات</div>
          </div>
        </div>

        {/* MEMBERS */}
        <section className="mb-8">
          <h3 className="text-sm font-black text-[#00E5FF] uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">group</span> أعضاء الحملة
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(c.members || []).map(m => (
              <div key={m.id} className="bg-[#15191C] border border-[#2D3339] p-4 rounded-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#00E5FF]/10 flex items-center justify-center border border-[#00E5FF]/30">
                  <span className="material-symbols-outlined text-[#00E5FF] text-sm">person</span>
                </div>
                <div>
                  <div className="text-sm font-bold text-white">{m.user?.name || 'عضو'}</div>
                  <div className="text-[10px] text-slate-500">{m.user?.committee || '—'}</div>
                </div>
              </div>
            ))}
            {(c.members || []).length === 0 && <div className="col-span-4 text-slate-600 text-sm py-4 text-center">لم يتم إضافة أعضاء بعد</div>}
          </div>
        </section>

        {/* CEMETERIES */}
        <section className="mb-8">
          <h3 className="text-sm font-black text-emerald-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">mosque</span> المقابر المسجلة
          </h3>
          <div className="flex flex-col gap-3">
            {(c.cemeteries || []).map(cem => (
              <div key={cem.id} className="bg-[#15191C] border border-[#2D3339] p-5 rounded-xl flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-400/10 flex items-center justify-center border border-emerald-400/30">
                    <span className="material-symbols-outlined text-emerald-400">mosque</span>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">{cem.name}</div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-slate-500">أضافه: {cem.user?.name || '—'}</span>
                      {cem.lat && <span className="text-[10px] text-slate-600 font-mono" dir="ltr">{cem.lat.toFixed(4)}, {cem.lng?.toFixed(4)}</span>}
                    </div>
                    {cem.notes && <p className="text-[11px] text-slate-400 mt-1">{cem.notes}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setCemeteryInspector(cem)}
                    className="flex items-center gap-2 bg-emerald-400/10 text-emerald-400 px-4 py-1.5 rounded-full text-[11px] font-bold border border-emerald-400/20 hover:bg-emerald-400/20 transition-all"
                  >
                    <span className="material-symbols-outlined text-[16px]">visibility</span>
                    عرض المحتويات
                  </button>
                  <span className={`text-[10px] font-black uppercase ${cemeteryStatusColors[cem.status]}`}>{cemeteryStatusLabels[cem.status]}</span>
                </div>
              </div>
            ))}
            {(c.cemeteries || []).length === 0 && <div className="text-slate-600 text-sm py-4 text-center">لم يتم تسجيل مقابر بعد</div>}
          </div>
        </section>

        {/* CASES */}
        <section>
          <h3 className="text-sm font-black text-purple-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">assignment</span> حالات الحملة
          </h3>
          <div className="flex flex-col gap-3">
            {(c.cases || []).map(cs => (
              <div key={cs.id} className="bg-[#15191C] border border-[#2D3339] p-5 rounded-xl flex justify-between items-center group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/30">
                    <span className="material-symbols-outlined text-purple-500">assignment</span>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors">{cs.title || 'حالة بدون عنوان'}</div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-slate-500">{cs.city}</span>
                      <span className="text-[10px] text-slate-600">{cs.type}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setCaseInspector(cs)}
                    className="flex items-center gap-2 bg-purple-500/10 text-purple-400 px-4 py-1.5 rounded-full text-[11px] font-bold border border-purple-500/20 hover:bg-purple-500/20 transition-all"
                  >
                    <span className="material-symbols-outlined text-[16px]">visibility</span>
                    عرض التفاصيل
                  </button>
                  <span className={`text-[10px] font-black uppercase px-2 py-1 rounded border ${cs.status === 'OPEN' ? 'text-emerald-400 border-emerald-400/30' : 'text-slate-500 border-slate-500/30'}`}>{cs.status === 'OPEN' ? 'مفتوحة' : cs.status}</span>
                </div>
              </div>
            ))}
            {(c.cases || []).length === 0 && <div className="text-slate-600 text-sm py-4 text-center">لا توجد حالات مرتبطة بهذه الحملة</div>}
          </div>
        </section>
      </div>
    )
  }

  // FORM VIEW
  if (showForm) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 animate-enter" dir="rtl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-[#00E5FF]">{formData.id ? 'تعديل الحملة' : 'إطلاق حملة جديدة'}</h3>
          <button onClick={() => { setShowForm(false); setFormData({ name: '', city: '', description: '', visibility: 'PRIVATE', memberIds: [] }); }} className="text-slate-500 hover:text-white">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          <div className="bg-[#15191C] border border-[#2D3339] p-8 rounded-2xl flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">اسم الحملة</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-[#0B0E11] border border-[#2D3339] p-4 rounded-xl text-white outline-none focus:border-[#00E5FF]" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">المدينة المستهدفة</label>
                <select required value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="w-full bg-[#0B0E11] border border-[#2D3339] p-4 rounded-xl text-white outline-none focus:border-[#00E5FF]">
                  <option value="">اختر المدينة</option>
                  {getCities().map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-500 mb-1 block">وصف الحملة وأهدافها</label>
              <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-[#0B0E11] border border-[#2D3339] p-4 rounded-xl text-white h-28 resize-none outline-none focus:border-[#00E5FF]" />
            </div>

            <div>
              <label className="text-xs text-slate-500 mb-1 block">الرؤية</label>
              <div className="flex gap-4">
                <label className={`flex-1 flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${formData.visibility === 'PRIVATE' ? 'border-[#00E5FF] bg-[#00E5FF]/5 text-[#00E5FF]' : 'border-[#2D3339] text-slate-500'}`}>
                  <input type="radio" name="vis" checked={formData.visibility === 'PRIVATE'} onChange={() => setFormData({...formData, visibility: 'PRIVATE'})} className="hidden" />
                  <span className="material-symbols-outlined text-sm">lock</span>
                  <div>
                    <div className="text-sm font-bold">خاصة</div>
                    <div className="text-[10px] opacity-60">تظهر فقط للأعضاء المضافين</div>
                  </div>
                </label>
                <label className={`flex-1 flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${formData.visibility === 'PUBLIC' ? 'border-[#00E5FF] bg-[#00E5FF]/5 text-[#00E5FF]' : 'border-[#2D3339] text-slate-500'}`}>
                  <input type="radio" name="vis" checked={formData.visibility === 'PUBLIC'} onChange={() => setFormData({...formData, visibility: 'PUBLIC'})} className="hidden" />
                  <span className="material-symbols-outlined text-sm">public</span>
                  <div>
                    <div className="text-sm font-bold">عامة</div>
                    <div className="text-[10px] opacity-60">تظهر لكل الأعضاء</div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* MEMBER SELECTION */}
          <div className="bg-[#15191C] border border-[#2D3339] p-8 rounded-2xl">
            <h4 className="text-sm font-bold text-[#00E5FF] mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">group_add</span> إضافة أعضاء للحملة
              <span className="text-[10px] text-slate-600 mr-auto">{formData.memberIds.length} مختار</span>
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto custom-scrollbar">
              {specialists.map(s => (
                <label key={s.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${formData.memberIds.includes(s.id) ? 'border-[#00E5FF] bg-[#00E5FF]/5' : 'border-[#2D3339] hover:border-white/20'}`}>
                  <input type="checkbox" checked={formData.memberIds.includes(s.id)} onChange={() => toggleMember(s.id)} className="hidden" />
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${formData.memberIds.includes(s.id) ? 'bg-[#00E5FF] border-[#00E5FF] text-slate-950' : 'border-[#2D3339] text-slate-600'}`}>
                    <span className="material-symbols-outlined text-sm">{formData.memberIds.includes(s.id) ? 'check' : 'person'}</span>
                  </div>
                  <div>
                    <div className="text-sm text-white font-medium">{s.name}</div>
                    <div className="text-[10px] text-slate-500">{s.committee || '—'}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <button type="submit" className="bg-[#00E5FF] text-slate-950 font-black py-5 rounded-2xl text-lg shadow-[0_15px_30px_rgba(0,229,255,0.3)] hover:scale-[1.01] active:scale-95 transition-all">
            {formData.id ? 'حفظ التعديلات' : 'إطلاق الحملة'}
          </button>
        </form>
      </div>
    )
  }

  // LIST VIEW
  const active = campaigns.filter(c => c.status === 'ACTIVE')
  const inactive = campaigns.filter(c => c.status !== 'ACTIVE')

  return (
    <div className="max-w-6xl mx-auto px-4 py-6" dir="rtl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-black text-white">الحملات الميدانية</h2>
          <p className="text-sm text-slate-500 mt-1">{campaigns.length} حملة في النظام</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-[#00E5FF] text-slate-950 font-bold px-6 py-3 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg">
          <span className="material-symbols-outlined text-sm">add</span> إطلاق حملة جديدة
        </button>
      </div>

      {/* ACTIVE */}
      {active.length > 0 && (
        <section className="mb-8">
          <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-4">الحملات النشطة ({active.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {active.map(c => (
              <div key={c.id} onClick={() => setSelectedCampaign(c)} className="bg-[#15191C] border border-[#2D3339] p-6 rounded-2xl hover:border-[#00E5FF]/30 transition-all cursor-pointer group">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    {c.isDefault && <span className="material-symbols-outlined text-emerald-400 text-[18px]">keep</span>}
                    <h4 className="text-lg font-bold text-white group-hover:text-[#00E5FF] transition-colors">{c.name}</h4>
                  </div>
                  <span className={`text-[9px] font-black uppercase px-2 py-1 rounded border ${statusColors[c.status]}`}>{statusLabels[c.status]}</span>
                </div>
                <div className="flex items-center gap-4 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">location_on</span>{c.city}</span>
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">group</span>{c.members?.length || 0} عضو</span>
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">landscape</span>{c.cemeteries?.length || 0} مقبرة</span>
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">assignment</span>{c.cases?.length || 0} حالة</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* INACTIVE */}
      {inactive.length > 0 && (
        <section>
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">الحملات المنتهية والمعلقة ({inactive.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {inactive.map(c => (
              <div key={c.id} onClick={() => setSelectedCampaign(c)} className="bg-[#15191C]/50 border border-[#2D3339]/50 p-6 rounded-2xl hover:border-white/10 transition-all cursor-pointer opacity-60 hover:opacity-80">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="text-lg font-bold text-white">{c.name}</h4>
                  <span className={`text-[9px] font-black uppercase px-2 py-1 rounded border ${statusColors[c.status]}`}>{statusLabels[c.status]}</span>
                </div>
                <div className="flex items-center gap-4 text-[11px] text-slate-500">
                  <span>{c.city}</span>
                  <span>{c.members?.length || 0} عضو</span>
                  <span>{c.cemeteries?.length || 0} مقبرة</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {campaigns.length === 0 && (
        <div className="text-center py-20">
          <span className="material-symbols-outlined text-6xl text-slate-700 mb-4 block">campaign</span>
          <h3 className="text-xl font-bold text-slate-500">لا توجد حملات بعد</h3>
          <p className="text-sm text-slate-600 mt-2">اضغط على "إطلاق حملة جديدة" لبدء أول حملة</p>
        </div>
      )}
    </div>
  )
}
