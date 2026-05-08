import { useState } from 'react'
import { exportToExcel } from '@/utils/export'

export default function MembersView({ members = [], committees = [], onRefresh, initialSearch = '' }) {
  const [showMemberForm, setShowMemberForm] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const defaultMemberForm = { id: '', name: '', phone: '', whatsapp: '', committee: committees[0]?.name || '', password: '', status: 'ACTIVE' }
  const [memberFormData, setMemberFormData] = useState(defaultMemberForm)

  const [searchQuery, setSearchQuery] = useState(initialSearch)

  const handleExport = () => {
    const data = filteredMembers.map(m => ({
      'ID': m.id,
      'Name': m.name,
      'Phone': m.phone,
      'Committee': m.committee,
      'Status': m.status,
      'Registered At': new Date(m.createdAt).toLocaleDateString()
    }));
    exportToExcel(data, `HSN_Members_Report_${new Date().toISOString().split('T')[0]}`);
  };

  const handleMemberSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch('/api/members', { method: 'POST', body: JSON.stringify(memberFormData) })
      onRefresh()
      setShowMemberForm(false)
      setMemberFormData(defaultMemberForm)
    } finally {
      setLoading(false)
    }
  }

  const handleEditMember = (m) => {
    setMemberFormData({
      id: m.id,
      name: m.name || '',
      phone: m.phone || '',
      whatsapp: m.whatsapp || '',
      committee: m.committee || (committees[0]?.name || ''),
      password: '',
      status: m.status || 'ACTIVE'
    })
    setShowMemberForm(true)
  }

  const copyCredentials = (m) => {
    const text = `🔹 بيانات الدخول لتطبيق رصد:\n👤 الهاتف: ${m.phone}\n🔑 كلمة المرور الأساسية: 123456\n🔗 الرابط: ${window.location.origin}`;
    navigator.clipboard.writeText(text);
    alert('✅ تم نسخ بيانات الدخول.. يمكنك إرسالها للمختص عبر واتساب');
  }

  const handleDeleteMember = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذا العضو نهائياً؟')) return;
    await fetch(`/api/members?id=${id}`, { method: 'DELETE' });
    onRefresh();
  }

  const filteredMembers = members.filter(m => 
    m.name?.includes(searchQuery) || m.phone?.includes(searchQuery) || m.committee?.includes(searchQuery)
  );

  return (
    <div className="absolute top-14 right-20 left-0 bottom-0 bg-[#0B0E11] p-8 font-['Cairo'] text-right overflow-y-auto custom-scrollbar z-20" dir="rtl">
      <header className="flex justify-between items-center mb-8 border-b border-[#2D3339] pb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#00E5FF]">سجل الكوادر الميدانية</h1>
          <p className="text-outline text-sm mt-1">إدارة بيانات المختصين وحالات الاتصال العملياتي</p>
        </div>
        <div className="flex gap-4">
           <div className="relative">
              <span className="material-symbols-outlined absolute right-3 top-2.5 text-slate-500">search</span>
              <input 
                type="text" 
                placeholder="بحث عن عضو..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-[#15191C] border border-[#2D3339] pr-10 pl-4 py-2 rounded-lg text-sm text-white focus:border-[#00E5FF] outline-none w-64"
              />
           </div>
           <button onClick={handleExport} className="flex items-center gap-2 bg-white/5 border border-white/10 text-slate-400 px-4 py-2 rounded-lg text-sm hover:text-[#00E5FF] transition-all">
             <span className="material-symbols-outlined text-[18px]">download</span>
             تصدير سجل الأعضاء
           </button>
           <button onClick={() => { setMemberFormData(defaultMemberForm); setShowMemberForm(true); }} className="flex items-center gap-2 bg-[#00E5FF] text-[#0f172a] px-5 py-2 rounded-lg font-bold shadow-lg transition-all active:scale-95">
             <span className="material-symbols-outlined text-[20px]">person_add</span>
             إضافة كادر جديد
           </button>
        </div>
      </header>

      {showMemberForm ? (
        <div className="max-w-4xl mx-auto bg-[#15191C] border border-[#2D3339] p-8 rounded-2xl shadow-xl animate-enter">
           <div className="flex justify-between items-center mb-8 border-b border-[#2D3339] pb-4">
              <h3 className="text-xl font-bold text-[#00E5FF]">{memberFormData.id ? 'تعديل ملف المختص' : 'قيد كشفي جديد'}</h3>
              <button onClick={() => setShowMemberForm(false)} className="text-slate-500 hover:text-white">
                 <span className="material-symbols-outlined">close</span>
              </button>
           </div>
           
           <form onSubmit={handleMemberSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                 <label className="text-xs text-slate-500 mb-1 block">الاسم بالكامل</label>
                 <input required value={memberFormData.name} onChange={e=>setMemberFormData({...memberFormData, name: e.target.value})} className="w-full bg-[#0B0E11] border border-[#2D3339] p-4 rounded-xl text-white outline-none focus:border-[#00E5FF]" />
              </div>
              
              <div>
                 <label className="text-xs text-slate-500 mb-1 block">الوحدة الإدارية (اللجنة)</label>
                 <select 
                    value={memberFormData.committee} 
                    onChange={e=>setMemberFormData({...memberFormData, committee: e.target.value})} 
                    className="w-full bg-[#0B0E11] border border-[#2D3339] p-4 rounded-xl text-white outline-none focus:border-[#00E5FF] appearance-none"
                 >
                    <option value="">-- اختر اللجنة --</option>
                    {committees.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    <option value="غير مصنف">غير مصنف</option>
                 </select>
              </div>

              <div>
                 <label className="text-xs text-slate-500 mb-1 block">رقم الهاتف البديل</label>
                 <input value={memberFormData.phone} onChange={e=>setMemberFormData({...memberFormData, phone: e.target.value})} className="w-full bg-[#0B0E11] border border-[#2D3339] p-4 rounded-xl text-white outline-none focus:border-[#00E5FF]" dir="ltr" />
              </div>

              <div>
                 <label className="text-xs text-slate-500 mb-1 block">كلمة المرور السرية</label>
                 <input type="password" placeholder={memberFormData.id ? "اتركه فارغاً للحفاظ على الحالية" : "****"} value={memberFormData.password} onChange={e=>setMemberFormData({...memberFormData, password: e.target.value})} className="w-full bg-[#0B0E11] border border-[#2D3339] p-4 rounded-xl text-white outline-none focus:border-[#00E5FF]" />
              </div>

              <div>
                 <label className="text-xs text-slate-500 mb-1 block">الحالة التشغيلية</label>
                 <select value={memberFormData.status} onChange={e=>setMemberFormData({...memberFormData, status: e.target.value})} className="w-full bg-[#0B0E11] border border-[#2D3339] p-4 rounded-xl text-white outline-none focus:border-[#00E5FF]">
                    <option value="ACTIVE">نشط (متاح للميدان)</option>
                    <option value="INACTIVE">مجمد (غير متاح)</option>
                 </select>
              </div>

              <div className="md:col-span-2 pt-4">
                 <button type="submit" disabled={loading} className="w-full bg-[#00E5FF] text-[#0f172a] font-bold p-4 rounded-2xl shadow-lg hover:shadow-[#00E5FF]/20 transition-all">
                    {loading ? 'جاري التنفيذ...' : 'حفظ البيانات النهائية'}
                 </button>
              </div>
           </form>
        </div>
      ) : (
        <div className="bg-[#15191C] border border-[#2D3339] rounded-2xl overflow-hidden shadow-2xl">
          <table className="w-full text-right border-collapse">
            <thead className="bg-[#0B0E11] text-slate-500 text-xs border-b border-[#2D3339]">
              <tr>
                <th className="p-5 font-bold">المختص الميداني</th>
                <th className="p-5 font-bold">اللجنة / الوحدة</th>
                <th className="p-5 font-bold">بيانات الاتصال</th>
                <th className="p-5 font-bold">الحالة</th>
                <th className="p-5 font-bold text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map(m => (
                <tr key={m.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                  <td className="p-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-[#00E5FF]/10 border border-[#00E5FF]/20 flex items-center justify-center overflow-hidden">
                        {m.photo ? <img src={m.photo} className="w-full h-full object-cover"/> : <span className="material-symbols-outlined text-slate-500">person</span>}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-white text-lg">{m.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono uppercase tracking-tighter">{m.id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-5">
                    <span className="bg-white/5 border border-white/10 px-3 py-1 rounded-full text-xs text-slate-300">{m.committee || 'غير مصنف'}</span>
                  </td>
                  <td className="p-5 font-mono text-sm" dir="ltr">{m.phone}</td>
                  <td className="p-5">
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border ${m.status === 'ACTIVE' ? 'border-success-container/50 text-success-container bg-success-container/10' : 'border-error/50 text-error bg-error/10'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${m.status === 'ACTIVE' ? 'bg-success-container' : 'bg-error'}`}></div>
                      <span className="text-[11px] font-bold">{m.status === 'ACTIVE' ? 'نشط' : 'مجمد'}</span>
                    </div>
                  </td>
                  <td className="p-5">
                    <div className="flex justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button onClick={() => copyCredentials(m)} className="text-slate-500 hover:text-success-container transition-colors" title="نسخ بيانات الدخول"><span className="material-symbols-outlined text-[18px]">key</span></button>
                       <button onClick={() => handleEditMember(m)} className="text-slate-500 hover:text-[#00E5FF] transition-colors"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                       <button onClick={() => handleDeleteMember(m.id)} className="text-slate-500 hover:text-error transition-colors"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredMembers.length === 0 && (
                <tr>
                   <td colSpan="5" className="p-20 text-center text-slate-600 italic">لا توجد نتائج مطابقة للبحث</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
