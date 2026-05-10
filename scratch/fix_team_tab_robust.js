const fs = require('fs');
const path = 'c:/xampp/htdocs/HSN/app/mobile/page.js';
let content = fs.readFileSync(path, 'utf8');

const startAnchor = '/* TEAM TAB for COMMITTEE_HEAD */';
const endAnchor = 'addingNewOp && (';

const startIndex = content.indexOf(startAnchor);
const endIndex = content.indexOf(endAnchor);

if (startIndex === -1 || endIndex === -1) {
    console.error('Anchors not found', { startIndex, endIndex });
    process.exit(1);
}

const newTeamTab = `/* TEAM TAB for COMMITTEE_HEAD */
          {activeTab === 'TEAM' && activeUser?.role === 'COMMITTEE_HEAD' && (
            <div className="flex flex-col gap-6 animate-fade-in">
              <header className="mb-2 text-right flex justify-between items-center">
                 <div>
                    <h2 className="text-2xl font-black text-white">أعضاء لجنتك</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">إدارة فرقك الميدانية</p>
                 </div>
                 <div className="flex bg-white/5 border border-white/10 rounded-xl p-1">
                    <button onClick={()=>setMemberViewMode('LIST')} className={\`p-1.5 rounded-lg transition-all \${memberViewMode==='LIST' ? 'bg-[#00E5FF] text-slate-900' : 'text-slate-500'}\`}>
                       <span className="material-symbols-outlined text-lg">format_list_bulleted</span>
                    </button>
                    <button onClick={()=>setMemberViewMode('GRID')} className={\`p-1.5 rounded-lg transition-all \${memberViewMode==='GRID' ? 'bg-[#00E5FF] text-slate-900' : 'text-slate-500'}\`}>
                       <span className="material-symbols-outlined text-lg">grid_view</span>
                    </button>
                 </div>
              </header>
              <button onClick={() => { setMemberForm({ id: '', name: '', phone: '', password: '', role: 'MEMBER', photo: '' }); setAddingMember(true); }} className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center justify-center gap-2 text-[#00E5FF] font-black active:scale-95 transition-all">
                 <span className="material-symbols-outlined">person_add</span> إضافة عضو جديد
              </button>

              {memberViewMode === 'LIST' ? (
                <div className="flex flex-col gap-4">
                   {committeeMembers.length > 0 ? committeeMembers.map(member => (
                      <div key={member.id} className="bg-black/20 border border-white/5 p-4 rounded-2xl flex flex-col gap-4 shadow-inner">
                         <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                               <div className="w-12 h-12 rounded-full bg-[#0B0E11] border border-white/10 overflow-hidden">
                                  {member.photo ? <img src={member.photo} className="w-full h-full object-cover"/> : <span className="material-symbols-outlined text-slate-600 m-3">person</span>}
                               </div>
                               <div className="text-right">
                                  <div className="text-sm font-black text-white">{member.name}</div>
                                  <div className="text-[9px] text-[#00E5FF] font-bold">{member.phone} • {member.status === 'ACTIVE' ? 'نشط' : 'غير نشط'}</div>
                               </div>
                            </div>
                            <div className={\`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md border \${member.role === 'COMMITTEE_HEAD' ? 'text-purple-400 border-purple-400/20' : 'text-slate-500 border-white/10'}\`}>{member.role === 'COMMITTEE_HEAD' ? 'رئيس' : 'عضو'}</div>
                         </div>
                         
                         <div className="flex gap-2 justify-end border-t border-white/5 pt-3">
                            <button onClick={() => { setMemberForm({ id: member.id, name: member.name, phone: member.phone, password: '', role: member.role, photo: member.photo }); setAddingMember(true); }} className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg text-slate-400 text-[10px] font-bold active:scale-95 transition-all">
                               <span className="material-symbols-outlined text-[14px]">edit</span> تعديل
                            </button>
                            <button onClick={async () => {
                               if(!confirm('هل أنت متأكد من حذف هذا العضو؟')) return;
                               setProcessing(true);
                               try {
                                  const res = await fetch(\`/api/members?id=\${member.id}\`, { method: 'DELETE' });
                                  if(res.ok) {
                                     syncOperations(activeUser.id);
                                     setOpStatus('✅ تم الحذف بنجاح');
                                     setTimeout(()=>setOpStatus(''), 2000);
                                  }
                               } catch(e) {}
                               setProcessing(false);
                            }} className="flex items-center gap-1.5 bg-red-500/10 px-3 py-1.5 rounded-lg text-red-500 text-[10px] font-bold active:scale-95 transition-all">
                               <span className="material-symbols-outlined text-[14px]">delete</span> حذف
                            </button>
                         </div>
                      </div>
                   )) : (
                      <div className="text-[10px] font-bold text-slate-500 text-center py-10 border border-dashed border-white/10 rounded-3xl">لا يوجد أعضاء في لجنتك حالياً.</div>
                   )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                   {committeeMembers.map(member => (
                      <div key={member.id} className="bg-black/20 border border-white/5 p-5 rounded-[2.5rem] flex flex-col items-center text-center gap-3 relative group active:scale-95 transition-all" onClick={() => { setMemberForm({ id: member.id, name: member.name, phone: member.phone, password: '', role: member.role, photo: member.photo }); setAddingMember(true); }}>
                         <div className="w-20 h-20 rounded-full bg-[#0B0E11] border-2 border-[#00E5FF]/20 overflow-hidden shadow-xl">
                            {member.photo ? <img src={member.photo} className="w-full h-full object-cover"/> : <span className="material-symbols-outlined text-4xl text-slate-700 mt-4 flex justify-center">person</span>}
                         </div>
                         <div className="flex flex-col overflow-hidden w-full">
                            <span className="text-xs font-black text-white truncate px-2">{member.name}</span>
                            <span className="text-[9px] text-[#00E5FF] font-bold mt-1 tracking-wider uppercase opacity-70">{member.role === 'COMMITTEE_HEAD' ? 'رئيس لجنة' : 'مختص ميداني'}</span>
                         </div>
                         <div className={\`absolute top-3 right-3 w-2 h-2 rounded-full \${member.status === 'ACTIVE' ? 'bg-[#00E5FF] shadow-[0_0_8px_#00E5FF]' : 'bg-red-500'}\`}></div>
                      </div>
                   ))}
                </div>
              )}
            </div>
          )}

        {`;

content = content.slice(0, startIndex) + newTeamTab + content.slice(endIndex);
fs.writeFileSync(path, content);
console.log('Successfully fixed TEAM tab');
