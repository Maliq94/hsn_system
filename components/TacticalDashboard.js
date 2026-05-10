'use client'
import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'
import MembersView from '@/components/MembersView'
import CommitteesView from '@/components/CommitteesView'
import CitiesView from '@/components/CitiesView'
import CasesView from '@/components/CasesView'
import CemeteriesView from '@/components/CemeteriesView'
import CampaignsView from '@/components/CampaignsView'

const Map = dynamic(() => import('@/components/Map'), { ssr: false })

export default function TacticalDashboard({ user, members = [], cases, visits, stats, logout, onRefresh }) {
  const [selectedEntity, setSelectedEntity] = useState(null)
  const [entityType, setEntityType] = useState('')
  const [activeView, setActiveView] = useState('MAP') // 'MAP' | 'MEMBERS' | 'CASES' | 'CEMETERIES' | 'COMMITTEES' | 'CITIES'
  const [mapViewMode, setMapViewMode] = useState('BOTH') // 'CASES' | 'CEMETERIES' | 'BOTH'
  const [labelMode, setLabelMode] = useState(0); // 0-3 modes
  const [floatingWindows, setFloatingWindows] = useState([]);
  const [committees, setCommittees] = useState([]);
  const [cities, setCities] = useState([]);
  const [drillDownFilter, setDrillDownFilter] = useState('');
  const [fullScreenImage, setFullScreenImage] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState('ALL');

  useEffect(() => {
    fetch('/api/committees').then(r => r.json()).then(setCommittees);
    fetch('/api/cities').then(r => r.json()).then(setCities);
    fetch('/api/campaigns').then(r => r.json()).then(data => {
      setCampaigns(data);
      const def = data.find(c => c.isDefault);
      if (def) setMapViewMode('BOTH');
    }).catch(() => {});
  }, []);

  const refreshData = () => {
    onRefresh();
    fetch('/api/committees').then(r => r.json()).then(setCommittees);
    fetch('/api/cities').then(r => r.json()).then(setCities);
    fetch('/api/campaigns').then(r => r.json()).then(data => {
      setCampaigns(data);
      const def = data.find(c => c.isDefault);
      if (def && mapViewMode !== 'BOTH') setMapViewMode('BOTH');
    }).catch(() => {});
  };

  const openFloatingWindow = (url) => {
    if (floatingWindows.some(w => w.url === url)) return;
    const id = Math.random().toString(36).substr(2, 9);
    setFloatingWindows([...floatingWindows, { id, url, x: 500 + (floatingWindows.length * 40), y: 100 + (floatingWindows.length * 40), z: 200 + floatingWindows.length }]);
  };

  const handleMarkerClick = (entity, type) => {
    setSelectedEntity(entity)
    setEntityType(type)
  }

  const closeWindow = (id) => setFloatingWindows(floatingWindows.filter(w => w.id !== id));
  
  const bringToFront = (id) => {
    const maxZ = Math.max(200, ...floatingWindows.map(w => w.z));
    setFloatingWindows(floatingWindows.map(w => w.id === id ? { ...w, z: maxZ + 1 } : w));
  };

  // Strategic Data Filtering: Isolate components based on campaign focus
  const filteredCampaigns = selectedCampaignId === 'ALL' ? campaigns : campaigns.filter(c => c.id === selectedCampaignId);
  const campaignCases = cases.filter(c => c.campaignId && (selectedCampaignId === 'ALL' || c.campaignId === selectedCampaignId));
  const campaignVisits = visits.filter(v => 
    (v.case?.campaignId && (selectedCampaignId === 'ALL' || v.case.campaignId === selectedCampaignId)) || 
    (v.cemetery?.campaignId && (selectedCampaignId === 'ALL' || v.cemetery.campaignId === selectedCampaignId))
  );

  // Derive active drawer data robustly
  const activeCase = (!selectedEntity) ? null : (
    entityType === 'case' 
      ? selectedEntity 
      : (entityType === 'visit' ? selectedEntity.case : (campaignCases.find(c => c.id === selectedEntity?.caseId) || null))
  );
  
  const activeVisits = (!selectedEntity) ? [] : (
    entityType === 'cemetery' 
      ? visits.filter(v => v.cemeteryId === selectedEntity.id)
      : (activeCase ? visits.filter(v => v.caseId === activeCase.id) : [])
  );

  const activeSpecialist = (!selectedEntity) ? null : (
    entityType === 'visit' 
      ? selectedEntity.user 
      : (activeVisits.length > 0 ? activeVisits.sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp))[0].user : (selectedEntity.user || null))
  );

  // Gather media arrays securely without crashing
  const mediaPhotos = [];
  activeVisits.forEach(v => {
    if(v.images && v.images !== 'null') {
      try {
        const parsed = JSON.parse(v.images);
        if(Array.isArray(parsed)) mediaPhotos.push(...parsed.filter(url => typeof url === 'string'));
      } catch(e) {}
    }
  });

  // Also include the primary images from the entity itself if it's a cemetery
  if (entityType === 'cemetery' && selectedEntity?.images) {
    try {
      const parsed = JSON.parse(selectedEntity.images);
      if(Array.isArray(parsed)) {
        parsed.forEach(url => {
          if (!mediaPhotos.includes(url)) mediaPhotos.push(url);
        });
      }
    } catch(e) {}
  }

  return (
    <div className="bg-[#0B0E11] text-on-background h-screen w-screen overflow-hidden font-body-sm text-body-sm relative">
      {floatingWindows.map(win => (
        <DraggableWindow 
          key={win.id} 
          {...win} 
          onClose={() => closeWindow(win.id)} 
          onFocus={() => bringToFront(win.id)}
          onMove={(id, x, y) => setFloatingWindows(curr => curr.map(w => w.id === id ? { ...w, x, y } : w))}
        />
      ))}
      {activeView === 'MAP' && (
        <div className="absolute inset-0 z-0 bg-[#0B0E11]">

          <Map 
            cases={campaignCases} 
            visits={campaignVisits} 
            campaigns={filteredCampaigns}
            mapViewMode={mapViewMode}
            labelMode={labelMode} 
            onMarkerClick={handleMarkerClick} 
          />
        </div>
      )}

      <nav className="fixed top-0 right-0 w-full z-[100] flex justify-between items-center px-6 h-14 bg-[#0B0E11]/80 backdrop-blur-md border-b border-[#2D3339]">
        <div className="text-lg font-bold tracking-widest text-[#00E5FF] flex items-center gap-3">
          <img src="/logo.png" alt="HSN Logo" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
          العمليات الذكية v1.0
        </div>
        
        <div className="hidden md:flex items-center gap-8 h-full">
          <button onClick={refreshData} className="flex items-center gap-1.5 text-slate-400 hover:text-[#00E5FF] transition-colors bg-white/5 px-3 py-1 rounded-full border border-white/10 group">
            <span className="material-symbols-outlined text-[18px] group-active:rotate-180 transition-transform">sync</span>
            <span className="font-['Cairo'] text-[12px] font-bold">تحديث البيانات</span>
          </button>

          {activeView === 'MAP' && (
            <div className="flex items-center bg-white/5 border border-white/10 rounded-full p-0.5 ml-8 mr-2">
               <button 
                onClick={() => setMapViewMode('CASES')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full transition-all ${mapViewMode === 'CASES' ? 'bg-[#00E5FF] text-slate-950 font-black' : 'text-slate-400 hover:text-white font-bold'}`}
              >
                <span className="material-symbols-outlined text-[16px]">location_searching</span>
                <span className="font-['Cairo'] text-[10px] uppercase tracking-tighter">الحالات</span>
              </button>
              <button 
                onClick={() => setMapViewMode('CEMETERIES')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full transition-all ${mapViewMode === 'CEMETERIES' ? 'bg-[#00E5FF] text-slate-950 font-black' : 'text-slate-400 hover:text-white font-bold'}`}
              >
                <span className="material-symbols-outlined text-[16px]">mosque</span>
                <span className="font-['Cairo'] text-[10px] uppercase tracking-tighter">المقابر</span>
              </button>
              <button 
                onClick={() => setMapViewMode('BOTH')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full transition-all ${mapViewMode === 'BOTH' ? 'bg-[#00E5FF] text-slate-950 font-black' : 'text-slate-400 hover:text-white font-bold'}`}
              >
                <span className="material-symbols-outlined text-[16px]">visibility</span>
                <span className="font-['Cairo'] text-[10px] uppercase tracking-tighter">الكل</span>
              </button>
            </div>
          )}

          {activeView === 'MAP' && (
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full hover:bg-white/10 transition-all mr-4">
              <span className="material-symbols-outlined text-[#00E5FF] text-[18px]">military_tech</span>
              <select 
                value={selectedCampaignId}
                onChange={(e) => setSelectedCampaignId(e.target.value)}
                className="bg-transparent text-white font-['Cairo'] text-[11px] font-black outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-[#15191C]">كل الحملات الميدانية</option>
                {campaigns.map(c => (
                  <option key={c.id} value={c.id} className="bg-[#15191C]">{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {activeView === 'MAP' && (
            <button 
              onClick={() => setLabelMode((prev) => (prev + 1) % 3)}
              className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full hover:bg-white/10 transition-all group active:scale-95"
            >
              <span className="material-symbols-outlined text-[#00E5FF] text-[18px]">view_list</span>
              <div className="flex flex-col items-start pr-1 border-r border-white/10 mr-1 pl-1">
                <span className="font-['Cairo'] text-[10px] text-white font-black leading-tight">
                  {labelMode === 0 && 'الأيقونة فقط'}
                  {labelMode === 1 && 'أيقونة + اسم'}
                  {labelMode === 2 && 'صور المعاينة'}
                </span>
              </div>
            </button>
          )}
          <a className={`h-full flex items-center font-['Cairo'] tracking-tight text-xs uppercase ${activeView === 'MAP' ? 'text-[#00E5FF] border-b border-[#00E5FF]' : 'text-slate-500 hover:text-[#00E5FF] border-b border-transparent'} pb-1 transition-all cursor-pointer px-2`} onClick={() => setActiveView('MAP')}>لوحة القيادة</a>
          <a className={`h-full flex items-center font-['Cairo'] tracking-tight text-xs uppercase ${activeView === 'MEMBERS' ? 'text-[#00E5FF] border-b border-[#00E5FF]' : 'text-slate-500 hover:text-[#00E5FF] border-b border-transparent'} pb-1 transition-all cursor-pointer px-2`} onClick={() => setActiveView('MEMBERS')}>الأعضاء ({members.length})</a>
          <a className={`h-full flex items-center font-['Cairo'] tracking-tight text-xs uppercase ${activeView === 'COMMITTEES' ? 'text-[#00E5FF] border-b border-[#00E5FF]' : 'text-slate-500 hover:text-[#00E5FF] border-b border-transparent'} pb-1 transition-all cursor-pointer px-2`} onClick={() => setActiveView('COMMITTEES')}>اللجان ({committees.length})</a>
          <a className={`h-full flex items-center font-['Cairo'] tracking-tight text-xs uppercase ${activeView === 'CITIES' ? 'text-[#00E5FF] border-b border-[#00E5FF]' : 'text-slate-500 hover:text-[#00E5FF] border-b border-transparent'} pb-1 transition-all cursor-pointer px-2`} onClick={() => setActiveView('CITIES')}>المدن ({cities.length})</a>
          <a className={`h-full flex items-center font-['Cairo'] tracking-tight text-xs uppercase ${activeView === 'CASES' ? 'text-[#00E5FF] border-b border-[#00E5FF]' : 'text-slate-500 hover:text-[#00E5FF] border-b border-transparent'} pb-1 transition-all cursor-pointer px-2`} onClick={() => setActiveView('CASES')}>الحالات ({cases.length})</a>
          <a className={`h-full flex items-center font-['Cairo'] tracking-tight text-xs uppercase ${activeView === 'CEMETERIES' ? 'text-[#10b981] border-b border-[#10b981]' : 'text-slate-500 hover:text-[#10b981] border-b border-transparent'} pb-1 transition-all cursor-pointer px-2`} onClick={() => setActiveView('CEMETERIES')}>المقابر</a>
        </div>
        
        <div className="flex items-center gap-4">
          <button className="text-slate-500 hover:text-[#00E5FF] transition-colors hover:bg-white/5 p-1.5 rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">notifications</span>
          </button>
          <button onClick={logout} className="text-slate-500 hover:text-error transition-colors hover:bg-error/10 p-1.5 rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>
          <button className="text-[#00E5FF] hover:bg-white/5 p-1.5 rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined icon-fill text-[20px]">account_circle</span>
          </button>
        </div>
      </nav>

      <aside className="fixed right-0 top-14 bottom-0 z-50 flex flex-col items-center bg-[#15191C] w-20 border-l border-[#2D3339]">
        <div className="w-full py-6 flex flex-col items-center gap-2 border-b border-[#2D3339]">
          <div className="w-10 h-10 flex items-center justify-center overflow-hidden">
            <img src="/logo.png" alt="HSN" style={{ width: '90%', height: '90%', objectFit: 'contain' }} />
          </div>
          <div className="text-center w-full px-1">
            <div className="font-['Cairo'] text-[#00E5FF] font-black text-[12px] truncate">{user?.name || 'مدير'}</div>
            <div className="text-[9px] text-slate-500 font-mono-data truncate">جلسة نشطة</div>
          </div>
        </div>
        
        <div className="w-full flex-1 flex flex-col mt-2">
          <a className={`flex flex-col items-center justify-center text-[#00E5FF] ${activeView === 'MAP' ? 'bg-[#00E5FF]/5 border-l-2 border-[#00E5FF] scale-95' : 'bg-transparent text-slate-600 hover:text-[#00E5FF] hover:bg-white/5'} w-full py-4 duration-150 cursor-pointer group`} onClick={() => { setDrillDownFilter(''); setActiveView('MAP'); }}>
            <span className={`material-symbols-outlined mb-1 group-hover:scale-110 transition-transform ${activeView === 'MAP' && 'icon-fill'}`}>dashboard</span>
            <span className="font-['Cairo'] text-[11px] font-bold tracking-wider pt-1">الرئيسية</span>
          </a>
          
          <div className="w-full h-px bg-[#2D3339] my-2"></div>

          <a className={`flex flex-col items-center justify-center text-[#00E5FF] ${activeView === 'MEMBERS' ? 'bg-[#00E5FF]/5 border-l-2 border-[#00E5FF] scale-95' : 'bg-transparent text-slate-600 hover:text-[#00E5FF] hover:bg-white/5'} w-full py-4 duration-150 cursor-pointer group`} onClick={() => { setDrillDownFilter(''); setActiveView('MEMBERS'); }}>
            <span className={`material-symbols-outlined mb-1 group-hover:scale-110 transition-transform ${activeView === 'MEMBERS' && 'icon-fill'}`}>person_search</span>
            <span className="font-['Cairo'] text-[11px] font-bold tracking-wider pt-1">الأعضاء</span>
          </a>

          <a className={`flex flex-col items-center justify-center text-[#00E5FF] ${activeView === 'COMMITTEES' ? 'bg-[#00E5FF]/5 border-l-2 border-[#00E5FF] scale-95' : 'bg-transparent text-slate-600 hover:text-[#00E5FF] hover:bg-white/5'} w-full py-4 duration-150 cursor-pointer group`} onClick={() => { setDrillDownFilter(''); setActiveView('COMMITTEES'); }}>
            <span className={`material-symbols-outlined mb-1 group-hover:scale-110 transition-transform ${activeView === 'COMMITTEES' && 'icon-fill'}`}>groups</span>
            <span className="font-['Cairo'] text-[11px] font-bold tracking-wider pt-1">اللجان</span>
          </a>
          <a className={`flex flex-col items-center justify-center text-[#00E5FF] ${activeView === 'CITIES' ? 'bg-[#00E5FF]/5 border-l-2 border-[#00E5FF] scale-95' : 'bg-transparent text-slate-600 hover:text-[#00E5FF] hover:bg-white/5'} w-full py-4 duration-150 cursor-pointer group`} onClick={() => { setDrillDownFilter(''); setActiveView('CITIES'); }}>
            <span className={`material-symbols-outlined mb-1 group-hover:scale-110 transition-transform ${activeView === 'CITIES' && 'icon-fill'}`}>map</span>
            <span className="font-['Cairo'] text-[11px] font-bold tracking-wider pt-1">المدن</span>
          </a>
          <a className={`flex flex-col items-center justify-center text-[#00E5FF] ${activeView === 'CASES' ? 'bg-[#00E5FF]/5 border-l-2 border-[#00E5FF] scale-95' : 'bg-transparent text-slate-600 hover:text-[#00E5FF] hover:bg-white/5'} w-full py-4 duration-150 cursor-pointer group`} onClick={() => { setDrillDownFilter(''); setActiveView('CASES'); }}>
            <span className={`material-symbols-outlined mb-1 group-hover:scale-110 transition-transform ${activeView === 'CASES' && 'icon-fill'}`}>location_city</span>
            <span className="font-['Cairo'] text-[11px] font-bold tracking-wider pt-1">الحالات</span>
          </a>
          <a className={`flex flex-col items-center justify-center text-[#10b981] ${activeView === 'CEMETERIES' ? 'bg-[#10b981]/5 border-l-2 border-[#10b981] scale-95' : 'bg-transparent text-slate-600 hover:text-[#10b981] hover:bg-white/5'} w-full py-4 duration-150 cursor-pointer group`} onClick={() => { setDrillDownFilter(''); setActiveView('CEMETERIES'); }}>
            <span className={`material-symbols-outlined mb-1 group-hover:scale-110 transition-transform ${activeView === 'CEMETERIES' && 'icon-fill'}`}>mosque</span>
            <span className="font-['Cairo'] text-[11px] font-bold tracking-wider pt-1">المقابر</span>
          </a>

          <div className="w-full h-px bg-[#2D3339] my-2"></div>

          <a className={`flex flex-col items-center justify-center text-[#00E5FF] ${activeView === 'CAMPAIGNS' ? 'bg-[#00E5FF]/5 border-l-2 border-[#00E5FF] scale-95' : 'bg-transparent text-slate-600 hover:text-[#00E5FF] hover:bg-white/5'} w-full py-4 duration-150 cursor-pointer group`} onClick={() => { setDrillDownFilter(''); setActiveView('CAMPAIGNS'); }}>
            <span className={`material-symbols-outlined mb-1 group-hover:scale-110 transition-transform ${activeView === 'CAMPAIGNS' && 'icon-fill'}`}>campaign</span>
            <span className="font-['Cairo'] text-[11px] font-bold tracking-wider pt-1">الحملات</span>
          </a>
        </div>
      </aside>

      {activeView === 'MAP' && selectedEntity && entityType !== 'cemetery' && activeCase && (
        <aside className="fixed left-0 top-0 bottom-0 z-[110] flex flex-col w-[400px] border-r border-[#2D3339] bg-[#15191C]/95 backdrop-blur-xl shadow-2xl duration-300 ease-out">
          <header className="w-full p-4 border-b border-[#2D3339] flex items-center justify-between bg-white/5">
            <div>
              <div className="font-['Cairo'] text-[#00E5FF] font-bold text-[16px] tracking-wider">لوحة تفاصيل الحالة</div>
              <div className="text-slate-400 font-['Cairo'] text-[10px] tracking-widest mt-0.5">التتبع الميداني الحي للوحدات</div>
            </div>
            <button onClick={() => setSelectedEntity(null)} className="text-slate-400 hover:bg-white/5 p-1 rounded transition-colors">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </header>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col gap-6 text-right">
            <section className="flex flex-col gap-2 relative">
              <div className="flex items-start justify-between">
                <h1 className="font-h1 text-[24px] text-on-surface leading-tight">{activeCase.title || 'حالة بدون عنوان'}</h1>
                <div className="flex items-center gap-1.5 bg-tertiary-container/10 border border-tertiary-container/30 px-2 py-1 rounded" style={{flexDirection: 'row'}}>
                   <span className="font-label-caps text-[11px] text-tertiary-container uppercase">{activeCase.status}</span>
                   <div className="w-1.5 h-1.5 rounded-full bg-tertiary-container animate-pulse"></div>
                </div>
              </div>
              <div className="text-on-surface-variant font-body-sm text-[14px]">
                {activeCase.description || 'لا يوجد وصف.'}
              </div>
            </section>

            <section className="bg-surface-container-high/50 border border-outline-variant rounded-lg p-3 flex items-center gap-4 relative overflow-hidden group">
              <div className="absolute left-[-2rem] top-[-2rem] w-24 h-24 bg-primary-container/5 rounded-full blur-2xl group-hover:bg-primary-container/10 transition-colors"></div>
              <div className="relative">
                <img className="w-14 h-14 rounded-full border border-primary-container/50 object-cover" alt="Operative" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB-ruzBo_4bswsC9xyGWjZxYZPj1X2vuuIT0C7gy85gYJyuglzZPii3Pclme7YQ-VzJs3VEUOvdaPWJ2lbDBWMpMEtQXqWOsr_Atyqhxe0yYhDNZMm_80lOkqkYlfcZAz2VGt0j_ljhl7aQ-rLGiJ6rIinyFIGjcnt_LR3-JXLPEa0ewQQ1n_bmbycS578IKmFmlpxAEyxPu0yr3bY8Ann1rPUMWwbzasxor5wMSysKJu6zx3lqd20TWSwS0wYRy9xAn2P_WfOAR3LA"/>
                <div className="absolute bottom-[-4px] left-[-4px] w-4 h-4 rounded-full bg-surface-container-high border border-outline-variant flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-[#00E5FF]"></div>
                </div>
              </div>
              <div className="flex flex-col flex-1 z-10 text-right">
                <div className="font-label-caps text-[11px] text-outline mb-0.5">المختص المرتبط بالحالة</div>
                <div className="font-h2 text-[18px] text-on-surface font-semibold leading-tight">{activeSpecialist?.name || 'غير محدد'}</div>
                <div className="font-mono-data text-[11px] text-primary-container mt-1 flex items-center gap-1">
                  تتبع حي ونشط <span className="material-symbols-outlined text-[14px]">cell_tower</span> 
                </div>
              </div>
            </section>

            <section className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-on-surface-variant border-b border-outline-variant/50 pb-2">
                <span className="material-symbols-outlined text-[18px]">location_on</span>
                <span className="font-label-caps text-[12px] font-bold">موقع الحالة الأساسي</span>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="flex flex-col gap-1">
                  <span className="font-label-caps text-[10px] text-outline">نوع الحالة</span>
                  <span className="font-mono-data text-[13px] text-on-surface">{activeCase.type}</span>
                </div>
                <div className="flex flex-col gap-1 text-left">
                  <span className="font-label-caps text-[10px] text-outline">الإحداثيات الحالية</span>
                  <span className="font-mono-data text-[11px] text-primary-fixed" style={{direction: "ltr"}}>
                    {activeCase.lat ? `${activeCase.lat.toFixed(5)}, ${activeCase.lng.toFixed(5)}` : 'انتظار وصول مختص'}
                  </span>
                </div>
              </div>
            </section>

            <section className="flex flex-col gap-2 mt-2">
              <div className="flex items-center justify-between border-b border-outline-variant/50 pb-2">
                <button className="font-label-caps text-[12px] text-primary-container hover:underline">({activeVisits.length}) سجل</button>
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[18px]">history</span>
                  <span className="font-label-caps text-[12px] font-bold">السجل الميداني</span>
                </div>
              </div>
              
              {activeVisits.length === 0 ? (
                <div className="text-slate-500 text-[12px] py-4 text-center">لا توجد جولات ميدانية مسجلة حتى الآن.</div>
              ) : (
                <div className="relative pr-4 mt-3 border-r border-outline-variant/50 flex flex-col gap-6 text-right">
                  {activeVisits.map((v, i) => (
                    <div className="relative" key={v.id}>
                      <div className={`absolute -right-[21px] top-1 w-2.5 h-2.5 rounded-full ${i===0 ? 'bg-primary-container shadow-[0_0_8px_rgba(0,229,255,0.6)]' : 'bg-surface-container-highest border border-outline-variant'}`}></div>
                      <div className={`flex flex-col gap-0.5 ${i!==0 && 'opacity-60'}`}>
                        <span className="font-mono-data text-[11px] text-primary-container" style={{direction: "ltr"}}>
                          {new Date(v.timestamp).toLocaleString('ar-LY', {hour12: false, month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}
                        </span>
                        <span className="font-body-sm text-[13px] text-on-surface mt-1">{v.notes || 'تسجيل دخول في الموقع دون إرفاق نص.'}</span>
                        {v.voiceData && (
                          <div className="mt-2 flex items-center gap-2 bg-[#00E5FF]/5 border border-[#00E5FF]/20 p-2 rounded-lg">
                            <button 
                              onClick={() => {
                                const audio = new Audio(`data:audio/aac;base64,${v.voiceData}`);
                                audio.play();
                              }}
                              className="w-7 h-7 rounded-full bg-[#00E5FF] text-slate-950 flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-md"
                            >
                              <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                            </button>
                            <span className="text-[9px] font-bold text-[#00E5FF] uppercase tracking-wider">إحاطة صوتية</span>
                          </div>
                        )}
                        {v.lat !== activeCase.lat && (
                          <span className="font-mono-data text-[9px] text-slate-500 mt-1">تتبع: {v.lat.toFixed(5)}, {v.lng.toFixed(5)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="flex flex-col gap-2 mt-2 mb-8">
              <div className="flex items-center gap-2 text-on-surface-variant border-b border-outline-variant/50 pb-2">
                <span className="material-symbols-outlined text-[18px]">perm_media</span>
                <span className="font-label-caps text-[12px] font-bold">الوسائط والمرفقات ({mediaPhotos.length})</span>
              </div>
              
              {mediaPhotos.length === 0 ? (
                <div className="relative h-24 rounded border border-dashed border-outline-variant bg-surface-container/30 flex flex-col items-center justify-center">
                  <span className="material-symbols-outlined text-[24px] text-outline mb-1">imagesmode</span>
                  <span className="font-label-caps text-[11px] text-outline">لا توجد صور مقترنة عبر الميدان</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {mediaPhotos.map((photo, i) => (
                    <div key={i} className="relative aspect-video rounded border border-outline-variant/50 overflow-hidden group cursor-pointer" onClick={() => openFloatingWindow(photo)}>
                      <img className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" alt={`Attached media ${i}`} src={photo}/>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </aside>
      )}

      {/* CEMETERY INTELLIGENCE DRAWER */}
      {activeView === 'MAP' && selectedEntity && entityType === 'cemetery' && (
        <aside className="fixed left-0 top-0 bottom-0 z-[110] flex flex-col w-[400px] border-r border-[#2D3339] bg-[#0F172A]/95 backdrop-blur-2xl shadow-2xl duration-300 ease-out text-right" dir="rtl">
          <header className="w-full p-6 border-b border-[#2D3339] flex items-center justify-between bg-emerald-500/5">
            <div>
              <div className="font-['Cairo'] text-emerald-400 font-bold text-[16px] tracking-wider">بيانات الموقع المسحي</div>
              <div className="text-slate-400 font-['Cairo'] text-[10px] tracking-widest mt-0.5 uppercase">توثيق المقابر والمواقع المرصودة</div>
            </div>
            <button onClick={() => setSelectedEntity(null)} className="text-slate-400 hover:bg-white/5 p-2 rounded-full transition-colors">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className={`px-3 py-1 rounded-full text-[9px] font-black border ${selectedEntity.status === 'CLEANED' ? 'text-emerald-400 border-emerald-400/20 bg-emerald-400/5' : 'text-amber-400 border-amber-400/20 bg-amber-400/5'}`}>
                   {selectedEntity.status === 'CLEANED' ? 'طاهرة بالكامل' : 'قيد التدقيق المسحي'}
                </span>
                <span className="text-[10px] text-slate-500 font-mono tracking-tighter" style={{direction: 'ltr'}}>{selectedEntity.id}</span>
              </div>
              <h1 className="text-3xl font-black text-white">{selectedEntity.name}</h1>
              <div className="flex items-center gap-2 text-slate-400 text-xs mt-1">
                 <span className="material-symbols-outlined text-[16px]">campaign</span>
                 <span className="font-bold">مرتبطة بحملة: {campaigns.find(c=>c.id===selectedEntity.campaignId)?.name || 'غير محددة'}</span>
              </div>
            </section>

            <section className="bg-white/5 border border-white/5 rounded-2xl p-5 flex items-center gap-4">
               <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <span className="material-symbols-outlined text-emerald-500">landscape</span>
               </div>
               <div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">تم الرصد بواسطة</div>
                  <div className="text-sm font-black text-white">{selectedEntity.user?.name || 'عضو ميداني'}</div>
               </div>
            </section>

            <section className="flex flex-col gap-4">
               <div className="flex items-center gap-2 text-xs font-black text-emerald-400 border-b border-white/5 pb-2">
                  <span className="material-symbols-outlined text-[18px]">notes</span> الملخص الاستخباري
               </div>
               <p className="text-sm text-slate-300 leading-relaxed bg-black/20 p-4 rounded-xl border border-white/5 italic">
                  "{selectedEntity.notes || 'لا توجد ملاحظات تفصيلية مسجلة لهذا الموقع.'}"
               </p>
            </section>

            <section className="flex flex-col gap-4">
               <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-[#00E5FF] text-[10px] font-black uppercase">({activeVisits.length}) حدث موثق</span>
                  <div className="flex items-center gap-2 text-xs font-black text-emerald-400">
                     <span className="material-symbols-outlined text-[18px]">history</span> السجل الزمني المسحي
                  </div>
               </div>
               
               {activeVisits.length === 0 ? (
                 <div className="text-slate-500 text-[11px] py-6 text-center bg-black/20 rounded-xl border border-dashed border-white/5 italic">لا توجد سجلات تتبع لهذا الموقع حتى الآن.</div>
               ) : (
                 <div className="relative pr-4 mt-3 border-r border-[#00E5FF]/10 flex flex-col gap-6 text-right">
                   {activeVisits.sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp)).map((v, i) => (
                     <div className="relative" key={v.id}>
                       <div className={`absolute -right-[21px] top-1 w-2.5 h-2.5 rounded-full ${i===0 ? 'bg-[#00E5FF] shadow-[0_0_8px_rgba(0,229,255,0.6)]' : 'bg-slate-800 border border-white/10'}`}></div>
                       <div className={`flex flex-col gap-0.5 ${i!==0 && 'opacity-60'}`}>
                         <span className="font-mono text-[10px] text-[#00E5FF]" style={{direction: "ltr"}}>
                           {new Date(v.timestamp).toLocaleString('ar-LY', {hour12: false, month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}
                         </span>
                         <span className="text-sm text-slate-200 mt-1">{v.notes || 'توثيق ميداني بدون نص مرافق.'}</span>
                         {v.voiceData && (
                           <div className="mt-2 flex items-center gap-2 bg-[#00E5FF]/5 border border-[#00E5FF]/20 p-2 rounded-lg w-fit">
                             <button 
                               onClick={() => {
                                 const audio = new Audio(`data:audio/aac;base64,${v.voiceData}`);
                                 audio.play();
                               }}
                               className="w-7 h-7 rounded-full bg-[#00E5FF] text-slate-950 flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-md"
                             >
                               <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                             </button>
                             <span className="text-[9px] font-bold text-[#00E5FF] uppercase tracking-wider">إحاطة صوتية</span>
                           </div>
                         )}
                       </div>
                     </div>
                   ))}
                 </div>
               )}
            </section>

            <section className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-xs font-black text-emerald-400 border-b border-white/5 pb-2">
                <span className="material-symbols-outlined text-[18px]">perm_media</span> الأرشيف البصري المركزي ({mediaPhotos.length})
              </div>
              
              {mediaPhotos.length === 0 ? (
                <div className="relative h-24 rounded-xl border border-dashed border-white/10 bg-black/20 flex flex-col items-center justify-center">
                  <span className="material-symbols-outlined text-[24px] text-slate-600 mb-1">imagesmode</span>
                  <span className="text-[10px] text-slate-600 uppercase font-black">لا توجد وثائق بصرية</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {mediaPhotos.map((photo, i) => (
                    <div key={i} className="relative aspect-video rounded-xl border border-white/10 overflow-hidden group cursor-pointer" onClick={() => openFloatingWindow(photo)}>
                      <img className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" alt={`Evidence ${i}`} src={photo}/>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="mt-auto pt-6 border-t border-white/5">
               <div className="flex justify-between items-center bg-[#00E5FF]/5 p-4 rounded-2xl border border-[#00E5FF]/20">
                  <div className="text-right">
                     <div className="text-[9px] text-[#00E5FF] font-black uppercase">إحداثيات الموقع</div>
                     <div className="text-[11px] text-white font-mono" style={{direction: 'ltr'}}>{selectedEntity.lat.toFixed(5)}, {selectedEntity.lng.toFixed(5)}</div>
                  </div>
                  <button onClick={() => window.open(`https://www.google.com/maps?q=${selectedEntity.lat},${selectedEntity.lng}`)} className="bg-[#00E5FF] text-slate-950 p-2 rounded-lg hover:scale-110 active:scale-95 transition-all">
                     <span className="material-symbols-outlined text-[18px]">map</span>
                  </button>
               </div>
            </section>
          </div>
        </aside>
      )}

      {activeView === 'MEMBERS' && <MembersView members={members} committees={committees} onRefresh={refreshData} initialSearch={drillDownFilter} />}
      {activeView === 'COMMITTEES' && <CommitteesView committees={committees} members={members} onRefresh={refreshData} onViewMembers={(c) => { setDrillDownFilter(c); setActiveView('MEMBERS'); }} />}
      {activeView === 'CITIES' && <CitiesView cities={cities} cases={campaignCases} onRefresh={refreshData} onViewCases={(c) => { setDrillDownFilter(c); setActiveView('CASES'); }} />}
      {activeView === 'CASES' && <CasesView cases={campaignCases} members={members} cities={cities} campaigns={campaigns} onRefresh={refreshData} initialCity={drillDownFilter} />}
      {activeView === 'CEMETERIES' && <CemeteriesView campaigns={filteredCampaigns} onRefresh={refreshData} />}
      {activeView === 'CAMPAIGNS' && <CampaignsView campaigns={campaigns} members={members} cities={cities} onRefresh={refreshData} />}

      {/* FULLSCREEN LIGHTBOX */}
      {fullScreenImage && (
         <div 
           className="fixed inset-0 z-[2000] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-10 animate-fade-in"
           onClick={() => setFullScreenImage(null)}
         >
            <button className="absolute top-10 right-10 w-16 h-16 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-red-500 transition-all border border-white/10 z-10">
               <span className="material-symbols-outlined text-4xl">close</span>
            </button>
            <img 
               src={fullScreenImage} 
               className="max-w-full max-h-full object-contain shadow-[0_30px_60px_rgba(0,0,0,0.8)] rounded-xl border border-white/10 cursor-zoom-out animate-zoom-in"
               onClick={(e) => e.stopPropagation()}
            />
         </div>
      )}
    </div>
  )
}

function DraggableWindow({ id, url, x, y, z, onClose, onFocus, onMove }) {
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setOffset({
      x: e.clientX - x,
      y: e.clientY - y
    });
    onFocus();
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      onMove(id, e.clientX - offset.x, e.clientY - offset.y);
    };
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, offset, id, onMove]);

  return (
    <div 
      className="fixed rounded-xl border border-white/20 shadow-2xl overflow-hidden backdrop-blur-xl bg-white/5 flex flex-col group select-none"
      style={{ 
        left: x, top: y, zIndex: z, 
        width: '320px', height: '240px',
        cursor: isDragging ? 'grabbing' : 'default'
      }}
      onClick={onFocus}
    >
      <header 
        className="h-10 bg-white/10 flex items-center justify-between px-3 cursor-grab active:cursor-grabbing border-b border-white/10"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-[#00E5FF]">image</span>
          <span className="font-['Cairo'] text-[10px] font-bold text-white/50 tracking-widest uppercase">معاينة وسائط</span>
        </div>
        <div className="flex items-center gap-3">
           <button 
             onClick={() => setFullScreenImage(url)}
             className="text-white/40 hover:text-[#00E5FF] transition-colors flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded border border-white/5"
           >
              <span className="material-symbols-outlined text-[14px]">fullscreen</span>
              <span className="text-[9px] font-bold uppercase">ملء الشاشة</span>
           </button>
           <button className="text-white/40 hover:text-error transition-colors" onClick={(e) => { e.stopPropagation(); onClose(); }}>
             <span className="material-symbols-outlined text-[18px]">close</span>
           </button>
        </div>
      </header>
      <div className="flex-1 overflow-hidden p-1">
        <img src={url} className="w-full h-full object-cover rounded-lg pointer-events-none" />
      </div>
    </div>
  );
}
