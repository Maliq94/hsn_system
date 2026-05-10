const fs = require('fs');
const path = 'c:/xampp/htdocs/HSN/components/MembersView.js';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(
  'className="w-24 h-24 rounded-full bg-[#0B0E11] border-2 border-[#00E5FF]/10 overflow-hidden mb-4 relative z-10 group-hover:scale-105 transition-transform"',
  'className="w-full aspect-square rounded-[1.5rem] bg-[#0B0E11] border-2 border-[#00E5FF]/10 overflow-hidden mb-4 relative z-10 group-hover:scale-105 transition-transform"'
);

c = c.replace(
  '<span className="material-symbols-outlined text-4xl text-slate-700 mt-6 flex justify-center">person</span>',
  '<div className="w-full h-full flex items-center justify-center"><span className="material-symbols-outlined text-5xl text-slate-700">person</span></div>'
);

c = c.replace(
  'className="bg-[#15191C] border border-[#2D3339] rounded-2xl p-6 flex flex-col items-center group relative overflow-hidden shadow-lg hover:border-[#00E5FF]/40 transition-all"',
  'className="bg-[#15191C] border border-[#2D3339] rounded-[2rem] p-5 flex flex-col items-center group relative overflow-hidden shadow-lg hover:border-[#00E5FF]/40 transition-all"'
);

fs.writeFileSync(path, c);
