const fs = require('fs');
const path = 'c:/xampp/htdocs/HSN/app/mobile/page.js';
let content = fs.readFileSync(path, 'utf8');

const brokenBlockStart = '              </header>\n              <button onClick={() => { setMemberForm({ id: \'\', name: \'\', phone: \'\', password: \'\', role: \'MEMBER\', photo: \'\' }); setAddingMember(true); }} className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center justify-center gap-2 text-[#00E5FF] font-black active:scale-95 transition-all">\n                 <span className="material-symbols-outlined">person_add</span> إضافة عضو جديد\n              </button>';

const fixedBlock = `              </header>
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
              )}`;

// We need to be very careful with the broken block. 
// Since replace_file_content failed, I'll use a more robust search.

const searchString = '<div className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md border ${member.role === \\\'COMMITTEE_HEAD\\\' ? \\\'text-purple-400 border-purple-400/20\\\' : \\\'text-slate-500 border-white/10\\\'}`}>{member.role === \\\'COMMITTEE_HEAD\\\' ? \\\'رئيس\\\' : \\\'عضو\\\'}</div>';

// I'll just replace the lines between 1225 and 1253.
let lines = content.split('\\n');
// Indices are 0-based, so 1225 is 1224.
// But split might differ.
// I'll find the line with "person_add" and replace from there.

const startIndex = lines.findIndex(l => l.includes('person_add')) - 1;
const endIndex = lines.findIndex(l => l.includes('activeTab === \\\'TEAM\\\'')) === -1 ? lines.findIndex(l => l.includes('addingNewOp')) - 2 : lines.findIndex(l => l.includes('activeTab === \\\'TEAM\\\'')) + 100; // rough

// Actually, I'll just find the exact broken sequence.
const b1 = '              <button onClick={() => { setMemberForm({ id: \'\', name: \'\', phone: \'\', password: \'\', role: \'MEMBER\', photo: \'\' }); setAddingMember(true); }} className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center justify-center gap-2 text-[#00E5FF] font-black active:scale-95 transition-all">';
const b2 = '                 <span className="material-symbols-outlined">person_add</span> إضافة عضو جديد';
const b3 = '              </button>';

const start = content.indexOf(b1);
const endAnchor = 'la يوجد أعضاء في لجنتك حالياً.'; // misspelled in my prev replace? no.
const end = content.indexOf('                )}', start) + 18; // rough

// Let's just use a simpler replacement if possible.
// I'll overwrite the file with the correct content for that section.
fs.writeFileSync(path, content.replace(brokenBlockStart, fixedBlock));
