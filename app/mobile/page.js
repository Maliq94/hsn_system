'use client'
import { Preferences } from '@capacitor/preferences'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Geolocation } from '@capacitor/geolocation'
import { VoiceRecorder } from 'capacitor-voice-recorder'
import { useState, useEffect, useRef } from 'react'

export default function MobileSpecialistPage() {
  const [isAuthChecking, setIsAuthChecking] = useState(true)
  const [activeUser, setActiveUser] = useState(null)
  const [activeCases, setActiveCases] = useState([])
  const [activeCampaigns, setActiveCampaigns] = useState([])
  const [cityRegistry, setCityRegistry] = useState([])
  const [focusedCase, setFocusedCase] = useState(null)
  const [focusedCampaign, setFocusedCampaign] = useState(null)
  const [focusedCemetery, setFocusedCemetery] = useState(null)
  const [reportNotes, setReportNotes] = useState('')
  const [capturedImage, setCapturedImage] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [opStatus, setOpStatus] = useState('')
  const [compressing, setCompressing] = useState(false)
  const [activeTab, setActiveTab] = useState('DASHBOARD'); // 'DASHBOARD' | 'TASKS' | 'CAMPAIGNS'
  const [addingNewOp, setAddingNewOp] = useState(false)
  const [addingCemetery, setAddingCemetery] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [capturedVoice, setCapturedVoice] = useState(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [loadingAction, setLoadingAction] = useState(null)
  const timerRef = useRef(null)
  const caseHistoryRef = useRef(new Set())
  const isInitialLoad = useRef(true)
  
  const [opForm, setOpForm] = useState({ title: '', description: '', city: 'طرابلس', type: 'رصد ومتابعة', campaignId: null })
  const [cemeteryForm, setCemeteryForm] = useState({ name: '', notes: '', images: null })
  const [authForm, setAuthForm] = useState({ phone: '', password: '' })

  useEffect(() => {
    const restoreSession = async () => {
      const stored = localStorage.getItem('hsn_user')
      if (stored) {
        const u = JSON.parse(stored)
        setActiveUser(u)
        await syncOperations(u.id)
      }
      // Artificial delay for "pro" feel or just enough for layout stabilization
      setTimeout(() => setIsAuthChecking(false), 800)
    };
    restoreSession();
  }, [])

  useEffect(() => {
    if (!activeUser) return;
    
    // Request Permissions
    const setupPerms = async () => {
      const vStatus = await VoiceRecorder.requestAudioRecordingPermission()
      const nStatus = await LocalNotifications.checkPermissions()
      if (nStatus.display === 'prompt') await LocalNotifications.requestPermissions()
      
      // Create Channel for Android 8.0+
      await LocalNotifications.createChannel({
        id: 'tactical-alerts',
        name: 'Tactical Assignment Alerts',
        description: 'New mission assignments for field specialists',
        sound: 'tactical_ping', // Extension-less for Android res/raw
        importance: 5, // High importance
        visibility: 1
      })
    }
    setupPerms()

    const interval = setInterval(() => {
      syncOperations(activeUser.id)
    }, 10000) // 10s heartbeat for multi-member sync
    return () => clearInterval(interval)
  }, [activeUser, focusedCase])

  const syncOperations = async (userId) => {
    try {
      const [cRes, cityRes, campRes] = await Promise.all([
        fetch('/api/cases', { cache: 'no-store' }),
        fetch('/api/cities', { cache: 'no-store' }),
        fetch('/api/campaigns', { cache: 'no-store' })
      ])
      const cData = await cRes.json()
      const cityData = await cityRes.json()
      const campData = await campRes.json()
      
      setCityRegistry(cityData)
      
      // Filter campaigns based on visibility and membership
      const visibleCampaigns = campData.filter(camp => 
        camp.status === 'ACTIVE' && 
        (camp.visibility === 'PUBLIC' || camp.members?.some(m => m.userId === userId))
      )
      setActiveCampaigns(visibleCampaigns)

      const assigned = cData.filter(c => c.assignments?.some(a => a.userId === userId));
      setActiveCases(assigned)

      // Alert Logic: Detect New Assignments (Heartbeat Delta)
      const currentIds = assigned.map(c => c.id)
      
      if (!isInitialLoad.current && currentIds.length > 0) {
        const reallyNew = currentIds.filter(id => !caseHistoryRef.current.has(id))
        if (reallyNew.length > 0) {
           const firstNew = assigned.find(c => c.id === reallyNew[0])
           await LocalNotifications.schedule({
             notifications: [{
               title: '⚠️ تكليف ميداني جديد',
               body: `تم إخضاعك لحالة جديدة: ${firstNew.title}`,
               id: Math.floor(Math.random() * 10000),
               channelId: 'tactical-alerts',
               sound: 'tactical_ping', 
               extra: { caseId: firstNew.id }
             }]
           })
        }
      }

      // Sync the tracking set with current reality
      caseHistoryRef.current = new Set(currentIds)
      isInitialLoad.current = false
      
      // If a case is open, update its detailed data with strict anchor check
      if (focusedCase) {
        const updated = assigned.find(c => c.id === focusedCase.id)
        if (updated) setFocusedCase(updated)
      }

      // If a campaign is open, update it
      if (focusedCampaign) {
        const updated = visibleCampaigns.find(c => c.id === focusedCampaign.id)
        if (updated) {
          setFocusedCampaign(updated)
          // Keep cemetery details in sync if open
          if (focusedCemetery) {
            const cem = updated.cemeteries?.find(x => x.id === focusedCemetery.id)
            if (cem) setFocusedCemetery(cem)
          }
        }
      }
    } catch(err) { console.error('Sync Error:', err) }
  }

  const execLogin = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault()
    setOpStatus('جاري التحقق...')
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      })
      const data = await res.json()
      if (res.ok) {
        const u = data.user || data;
        localStorage.setItem('hsn_user', JSON.stringify(u));
        setActiveUser(u)
        syncOperations(u.id)
        setOpStatus('')
      } else { setOpStatus('❌ ' + (data.error || 'خطأ')) }
    } catch(err) { setOpStatus('⚠️ خطأ شبكة') }
  }

  const onPhotoSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setCompressing(true)
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX_WIDTH = 1200
        const scaleSize = MAX_WIDTH / img.width
        canvas.width = MAX_WIDTH
        canvas.height = img.height * scaleSize
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        setCapturedImage(canvas.toDataURL('image/jpeg', 0.7))
        setCompressing(false)
      }
      img.src = event.target.result
    }
    reader.readAsDataURL(file)
  }

  const startVoiceRecording = async (e) => {
    if (e && e.cancelable) e.preventDefault()
    try {
      const canRec = await VoiceRecorder.canDeviceVoiceRecord()
      if (!canRec.value) { setOpStatus('❌ الجهاز لا يدعم التسجيل'); return; }
      
      const res = await VoiceRecorder.startRecording()
      if (res.value) {
        setIsRecording(true)
        setRecordingTime(0)
        setCapturedVoice(null) // Clear previous
        timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000)
        setOpStatus('🎙️ جاري تسجيل الإيجاز...')
      }
    } catch (e) { setOpStatus('❌ فشل بدء التسجيل') }
  }

  const stopVoiceRecording = async (e) => {
    if (e && e.cancelable) e.preventDefault()
    try {
      clearInterval(timerRef.current)
      const res = await VoiceRecorder.stopRecording()
      setIsRecording(false)
      if (res.value && res.value.recordDataBase64) {
        setCapturedVoice(res.value.recordDataBase64)
        setOpStatus('✅ تم تسجيل الإيجاز. استمع قبل الإرسال')
      }
    } catch (e) { setOpStatus('❌ فشل حفظ التسجيل') }
  }

  const executeAction = async (mode) => {
    const entity = focusedCase || focusedCemetery;
    if (!entity) return;
    const type = focusedCase ? 'CASE' : 'CEMETERY';
    
    if (mode === 'LOCATION' && entity.lat !== null) { setOpStatus('📍 الموقع مثبت مسبقاً'); return; }
    if (mode === 'TEXT' && !reportNotes.trim()) { setOpStatus('⚠️ يرجى كتابة نص'); return; }
    if (mode === 'IMAGE' && !capturedImage) { setOpStatus('⚠️ يرجى التقاط صورة'); return; }

    setProcessing(true)
    setLoadingAction(mode)
    
    // If entity has a location, we don't need to fetch GPS again unless explicitly requested (but centered around current anchor)
    if (entity.lat !== null && mode !== 'LOCATION') {
      finalizeAction(entity.lat, entity.lng, mode, type);
      return;
    }

    setOpStatus('جاري تحديد الموقع...')
    try {
      const getPos = async () => {
        const perms = await Geolocation.checkPermissions();
        if (perms.location !== 'granted') {
           const req = await Geolocation.requestPermissions();
           if (req.location !== 'granted') throw new Error('يرجى منح صلاحية الموقع');
        }
        return await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 });
      };

      const pos = await getPos();
      finalizeAction(pos.coords.latitude, pos.coords.longitude, mode, type);
    } catch (err) { 
      console.error('GPS FAILURE:', err);
      if (entity.lat !== null) {
        finalizeAction(entity.lat, entity.lng, mode, type);
      } else {
        setOpStatus(`❌ خطأ GPS: ${err.message || 'فشل التحديد'}`); 
        setProcessing(false);
        setLoadingAction(null); 
      }
    }
  }

  const finalizeAction = async (lat, lng, mode, type) => {
    setOpStatus('جاري الرفع...')
    let finalNotes = '';
    let finalImages = [];
    const entity = focusedCase || focusedCemetery;

    switch(mode) {
      case 'LOCATION': finalNotes = '📍 تحديث موقع ميداني'; break;
      case 'TEXT': finalNotes = reportNotes; break;
      case 'IMAGE': finalNotes = '📸 تقرير بصري ميداني'; finalImages = [capturedImage]; break;
      case 'VOICE': finalNotes = '🎙️ إيجاز صوتي ميداني'; break;
    }

    try {
      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: activeUser.id,
          caseId: type === 'CASE' ? entity.id : null,
          cemeteryId: type === 'CEMETERY' ? entity.id : null,
          lat, lng,
          notes: finalNotes,
          images: finalImages,
          voiceData: capturedVoice
        })
      })
      if (res.ok) {
        setCapturedImage(null)
        setCapturedVoice(null)
        setReportNotes('')
        setOpStatus('✅ تم الإرسال بنجاح')
        syncOperations(activeUser.id)
        setTimeout(() => setOpStatus(''), 2000)
      }
    } catch(err) { setOpStatus('⚠️ خطأ شبكة') }
    setProcessing(false)
    setLoadingAction(null)
  }

  const createOp = async () => {
    setProcessing(true)
    if (!opForm.campaignId && !focusedCampaign) {
      setOpStatus('⚠️ يجب ربط الحالة بحملة');
      setProcessing(false);
      return;
    }
    setOpStatus('جاري إنشاء الحالة...')
    try {
      const res = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...opForm, 
          campaignId: opForm.campaignId || focusedCampaign?.id,
          city: opForm.city || focusedCampaign?.city || 'طرابلس',
          lat: null, 
          lng: null, 
          assignedUserIds: [activeUser.id]
        })
      })
      if (res.ok) {
        setOpStatus('✅ تم إنشاء الحالة بنجاح!')
        setTimeout(() => { 
          setAddingNewOp(false); 
          setOpStatus(''); 
          setOpForm({ title: '', description: '', city: 'طرابلس', type: 'رصد ومتابعة', campaignId: null });
          syncOperations(activeUser.id); 
        }, 1500)
      }
    } catch (err) { setOpStatus('❌ خطأ في الإرسال') }
    setProcessing(false)
  }

  const createCemetery = async () => {
    if (!focusedCampaign) return;
    setProcessing(true)
    setOpStatus('جاري تسجيل الموقع استراتيجياً...')
    try {
      const res = await fetch('/api/cemeteries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cemeteryForm.name,
          campaignId: focusedCampaign.id,
          addedBy: activeUser.id,
          lat: null, lng: null
        })
      })
      if (res.ok) {
        setOpStatus('✅ تم حجز الاسم بنجاح!')
        setTimeout(() => {
          setAddingCemetery(false);
          setOpStatus('');
          setCemeteryForm({ name: '', notes: '', images: null });
          syncOperations(activeUser.id);
        }, 1500)
      }
    } catch (err) { setOpStatus('❌ فشل في الإرسال') }
    setProcessing(false)
  }

  if (isAuthChecking) return (
    <div className="container bg-[#0B0E11] min-h-screen flex flex-col items-center justify-center p-6" dir="rtl">
       <div className="relative mb-8">
          <div className="w-24 h-24 rounded-full border-2 border-[#00E5FF]/20 flex items-center justify-center animate-pulse">
             <span className="material-symbols-outlined text-5xl text-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.5)]">radar</span>
          </div>
          <div className="absolute inset-0 border-2 border-[#00E5FF] rounded-full animate-ping opacity-20"></div>
       </div>
       <h1 className="text-2xl font-bold tracking-[0.2em] text-white mb-2">HSN OPERATION</h1>
       <div className="flex items-center gap-2 text-[#00E5FF]">
          <div className="w-1.5 h-1.5 bg-[#00E5FF] rounded-full animate-bounce"></div>
          <span className="text-[10px] font-mono tracking-widest uppercase opacity-80">Syncing Tactical Data...</span>
       </div>
    </div>
  )

  if (!activeUser) return (
    <div className="container p-6 bg-[#0B0E11] min-h-screen flex items-center justify-center text-right" dir="rtl">
      <div className="glass-panel w-full max-w-sm p-10 border border-white/10 rounded-[3rem] shadow-2xl">
        <h2 className="text-3xl font-black text-[#00E5FF] mb-2 tracking-tight">نظام العمليات الميدانية</h2>
        <p className="text-slate-500 mb-8 text-xs font-bold uppercase tracking-widest">HSN INTELLIGENT OPS CENTER</p>
        <div className="flex flex-col gap-4">
          <input type="text" placeholder="رقم الهاتف" value={authForm.phone} onChange={e=>setAuthForm({...authForm, phone:e.target.value})} className="p-5 bg-slate-900 border border-slate-800 rounded-2xl text-white outline-none focus:border-[#00E5FF] text-right"/>
          <input type="password" placeholder="كلمة المرور" value={authForm.password} onChange={e=>setAuthForm({...authForm, password:e.target.value})} className="p-5 bg-slate-900 border border-slate-800 rounded-2xl text-white outline-none focus:border-[#00E5FF] text-right"/>
          <button onClick={execLogin} className="bg-gradient-to-r from-[#00E5FF] to-[#00B8D4] text-slate-950 font-black p-5 rounded-2xl mt-4 active:scale-95 transition-all shadow-[0_15px_30px_rgba(0,229,255,0.3)]">دخول النظام</button>
        </div>
        {opStatus && <div className="mt-6 text-center text-[10px] font-black text-[#00E5FF] animate-pulse">{opStatus}</div>}
      </div>
    </div>
  )

  const currentEntity = focusedCase || focusedCemetery;
  const histImages = currentEntity?.visits?.flatMap(v => { try { return JSON.parse(v.images || '[]') } catch(e) { return [] } }) || []

  const myVisits = activeCases.flatMap(c => c.visits || []).filter(v => v.userId === activeUser.id);
  const myAnchors = activeCases.filter(c => c.lat !== null).length;

  return (
    <div className="bg-[#0B0E11] min-h-screen text-white font-['Cairo'] pb-20" dir="rtl">
      <header className="p-4 border-b border-white/5 flex justify-between items-center bg-[#0B0E11]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#00E5FF]/20 border border-[#00E5FF]/40 flex items-center justify-center shadow-[0_0_10px_rgba(0,229,255,0.2)]">
            <span className="material-symbols-outlined text-[#00E5FF] text-xl">verified_user</span>
          </div>
          <div>
            <div className="font-black text-sm text-white">{activeUser.name}</div>
            <div className="flex items-center gap-1.5">
               <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] animate-pulse"></span>
               <span className="text-[10px] text-[#00E5FF] font-bold uppercase tracking-widest">{activeUser.committee || 'لجنة النشاط'}</span>
            </div>
          </div>
        </div>
        <button onClick={()=>{localStorage.removeItem('hsn_user'); setActiveUser(null);}} className="text-slate-500 hover:text-red-500 transition-colors p-2"><span className="material-symbols-outlined">logout</span></button>
      </header>

      <main className="p-5 flex flex-col gap-6">
        {activeTab === 'DASHBOARD' && (
          <div className="flex flex-col gap-8 animate-fade-in">
             <section className="flex flex-col gap-2 text-right">
                <div className="text-[10px] text-[#00E5FF] font-black uppercase tracking-[0.3em] ">نظرة عامة على العمليات</div>
                <h2 className="text-3xl font-bold tracking-tight">مرحباً، {activeUser.name}</h2>
                <p className="text-slate-500 text-sm">نظام مركز البيانات الموحد - وضع العمل المنفذ</p>
             </section>

             <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 border border-white/10 p-6 rounded-[2.5rem] flex flex-col gap-3">
                   <span className="material-symbols-outlined text-[#00E5FF] opacity-50">radar</span>
                   <div className="flex flex-col">
                      <span className="text-2xl font-black">{activeCases.length}</span>
                      <span className="text-[10px] text-slate-500 font-bold uppercase">مهام ميدانية نشطة</span>
                   </div>
                </div>
                <div className="bg-white/5 border border-white/10 p-6 rounded-[2.5rem] flex flex-col gap-3">
                   <span className="material-symbols-outlined text-purple-400 opacity-50">history_edu</span>
                   <div className="flex flex-col">
                      <span className="text-2xl font-black">{myVisits.length}</span>
                      <span className="text-[10px] text-slate-500 font-bold uppercase">إحاطات تم رفعها</span>
                   </div>
                </div>
                <div className="bg-white/5 border border-white/10 p-6 rounded-[2.5rem] flex flex-col gap-3">
                   <span className="material-symbols-outlined text-green-400 opacity-50">location_searching</span>
                   <div className="flex flex-col">
                      <span className="text-2xl font-black">{myAnchors}</span>
                      <span className="text-[10px] text-slate-500 font-bold uppercase">مواقع تم تثبيتها</span>
                   </div>
                </div>
                <div className="bg-[#00E5FF]/10 border border-[#00E5FF]/30 p-6 rounded-[2.5rem] flex flex-col gap-3 items-center justify-center text-[#00E5FF]" onClick={() => setActiveTab('TASKS')}>
                   <span className="material-symbols-outlined text-3xl animate-pulse">ads_click</span>
                   <span className="text-[10px] font-black uppercase">فتح المهام</span>
                </div>
             </div>

             <div className="bg-[#00E5FF]/5 border border-[#00E5FF]/20 rounded-3xl p-6 flex items-center gap-4">
                <span className="material-symbols-outlined text-[#00E5FF] animate-pulse">security</span>
                <p className="text-xs text-slate-400 leading-relaxed text-right">أنت الآن في وضع العمل الميداني المباشر. كافة البيانات التي يتم رفعها مشفرة ومرسلة فوراً لمركز القيادة الموحد.</p>
             </div>
          </div>
        )}

        {activeTab === 'TASKS' && (
          <div className="flex flex-col gap-6 animate-fade-in">
            <div className="flex items-center justify-between bg-white/5 border border-white/10 p-5 rounded-3xl backdrop-blur-md">
               <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#00E5FF] to-[#00B8D4] flex items-center justify-center text-slate-950 shadow-[0_0_15px_rgba(0,229,255,0.3)]">
                     <span className="material-symbols-outlined font-black">person</span>
                  </div>
                  <div>
                     <div className="text-sm font-black text-white leading-tight">{activeUser?.name}</div>
                     <div className="text-[10px] font-bold text-[#00E5FF] uppercase tracking-wider">{activeUser?.committee || 'لجنة غير محددة'}</div>
                  </div>
               </div>
               <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full border border-[#00E5FF]/20">
                     <div className="w-2 h-2 rounded-full bg-[#00E5FF] animate-ping"></div>
                     <span className="text-[10px] font-black text-[#00E5FF]">متصل الآن</span>
                  </div>
               </div>
            </div>

            <div className="flex justify-between items-center mt-2">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00E5FF]">ads_click</span> العمليات الميدانية النشطة
              </h3>
            </div>

            <div className="space-y-4">
              {activeCases.map(c => (
                <div key={c.id} onClick={() => setFocusedCase(c)} className="group relative bg-[#1A1F24] border border-white/10 p-6 rounded-[2.5rem] active:scale-[0.98] transition-all shadow-xl overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#00E5FF]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                  <div className="flex justify-between items-start mb-4 relative">
                    <div>
                      <span className="text-[10px] font-mono text-[#00E5FF] tracking-widest block mb-1 uppercase">{c.id}</span>
                      <h4 className="font-black text-xl text-white">{c.title}</h4>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] bg-white/5 border border-white/10 text-white px-3 py-1 rounded-full font-bold">{c.city}</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-md border ${c.status === 'OPEN' ? 'border-[#00E5FF]/30 text-[#00E5FF]' : 'border-slate-700 text-slate-500'}`}>{c.status === 'OPEN' ? 'نشطة' : 'مؤرشفة'}</span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed mb-6">{c.description}</p>
                  <div className="flex items-center justify-between border-t border-white/5 pt-4">
                     <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-slate-600">tactic</span>
                        <span className="text-xs font-bold text-slate-500">{c.visits?.length || 0} تقارير منشورة</span>
                     </div>
                     <span className="material-symbols-outlined text-[#00E5FF]">arrow_circle_left</span>
                  </div>
                </div>
              ))}
              {activeCases.length === 0 && <div className="p-12 text-center text-slate-600 border border-dashed border-white/10 rounded-3xl italic">لا توجد عمليات نشطة</div>}
            </div>
          </div>
        )}

        {/* CAMPAIGNS TAB */}
        {activeTab === 'CAMPAIGNS' && (
           <div className="flex flex-col gap-6 animate-fade-in">
              <header className="mb-2 text-right">
                 <h2 className="text-2xl font-black text-white">الحملات النشطة</h2>
                 <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">المهمات المركزية والمسوحات</p>
              </header>

              {activeCampaigns.map(camp => (
                 <div key={camp.id} onClick={() => setFocusedCampaign(camp)} className="bg-white/5 border border-white/10 p-6 rounded-[2rem] active:scale-95 transition-all text-right shadow-lg">
                    <div className="flex justify-between items-start mb-4">
                       <span className="text-[9px] font-black text-[#00E5FF] bg-[#00E5FF]/10 px-3 py-1 rounded-full border border-[#00E5FF]/30 uppercase tracking-widest">نشطة</span>
                       <div>
                          <h3 className="text-lg font-black text-white">{camp.name}</h3>
                          <div className="flex items-center justify-end gap-2 text-[10px] text-[#00E5FF] mt-1 font-bold">
                             {camp.city}
                             <span className="material-symbols-outlined text-[12px]">location_on</span>
                          </div>
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                       <div className="bg-black/20 p-3 rounded-2xl border border-white/5">
                          <div className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">المقابر</div>
                          <div className="text-sm font-black text-white">{camp.cemeteries?.length || 0}</div>
                       </div>
                       <div className="bg-black/20 p-3 rounded-2xl border border-white/5">
                          <div className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">الحالات</div>
                          <div className="text-sm font-black text-white">{camp.cases?.length || 0}</div>
                       </div>
                    </div>
                 </div>
              ))}

              {activeCampaigns.length === 0 && (
                 <div className="py-20 text-center opacity-30">
                    <span className="material-symbols-outlined text-6xl mb-4 block">campaign</span>
                    <div className="text-sm font-bold">لا يوجد حملات حالياً</div>
                 </div>
              )}
           </div>
        )}


        {focusedCase && (
          <div className="fixed inset-0 bg-[#0B0E11] z-[400] flex flex-col animate-enter overflow-y-auto text-right" dir="rtl">
            <header className="px-6 py-6 border-b border-white/5 flex justify-between items-center sticky top-0 bg-[#0B0E11]/90 backdrop-blur-xl z-[410]">
               <button onClick={() => setFocusedCase(null)} className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center active:scale-90 transition-all border border-white/10 shadow-lg">
                 <span className="material-symbols-outlined text-white">arrow_forward</span>
               </button>
               <div className="text-center">
                  <span className="text-[10px] font-bold text-[#00E5FF] uppercase tracking-wider block">بيانات المهمة</span>
                  <span className="font-black text-sm">التفاصيل الميدانية</span>
               </div>
               <div className="w-12 h-12 bg-[#00E5FF]/10 rounded-full flex items-center justify-center border border-[#00E5FF]/20">
                  <span className="material-symbols-outlined text-[#00E5FF] text-xl">insights</span>
               </div>
            </header>

            <div className="p-6 flex flex-col gap-8 pb-32">
              <section className="relative">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#00E5FF]/5 rounded-full blur-3xl"></div>
                <div className="text-[11px] text-[#00E5FF] font-black uppercase tracking-widest mb-2">الهدف الاستراتيجي الحالي</div>
                <h2 className="text-3xl font-black text-white leading-tight mb-4">{focusedCase.title}</h2>
                <div className="flex flex-wrap items-center gap-3">
                   <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full">
                      <div className={`w-2.5 h-2.5 rounded-full ${focusedCase.lat ? 'bg-[#00E5FF] shadow-[0_0_10px_#00E5FF]' : 'bg-red-500 animate-pulse'}`}></div>
                      <span className="text-[10px] font-mono font-bold text-white uppercase tracking-wider">
                        {focusedCase.lat ? `الموقع: ${focusedCase.lat.toFixed(4)}, ${focusedCase.lng.toFixed(4)}` : 'انتظار التثبيت'}
                      </span>
                   </div>
                   <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-full">
                      <span className="text-[10px] font-bold text-slate-400 capitalize">{focusedCase.type}</span>
                   </div>
                </div>
              </section>

              <section className="bg-white/5 border border-white/5 rounded-3xl p-5">
                <h4 className="flex items-center gap-2 text-xs font-bold text-[#00E5FF] mb-4"> 
                  <span className="material-symbols-outlined text-[18px]">photo_library</span> الأرشيف البصري ({histImages.length}) 
                </h4>
                <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar snap-x">
                  {histImages.map((img, i) => ( <img key={i} src={img} className="w-40 h-40 rounded-2xl object-cover snap-start border border-white/10 shadow-xl" onClick={() => window.open(img)}/> ))}
                  {histImages.length === 0 && <div className="text-xs text-slate-600 italic py-4">لاتوجد بيانات بصرية سابقة لهذا الموقع</div>}
                </div>
              </section>

              <section className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 shadow-xl backdrop-blur-md">
                <div className="flex justify-between items-center mb-6">
                   <h4 className="flex items-center gap-2 text-xs font-black text-[#00E5FF] uppercase tracking-widest"> 
                     <span className="material-symbols-outlined text-[18px]">history</span> السجل الاستخباري
                   </h4>
                   <span className="text-[10px] font-bold text-slate-600 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">{focusedCase.visits?.length || 0} حدث</span>
                </div>
                <div className="flex flex-col gap-6">
                    {(!focusedCase.visits || focusedCase.visits.length === 0) ? (
                     <div className="text-xs text-slate-500 italic text-center py-8 bg-black/20 rounded-3xl border border-white/5">قيد الانتظار لمباشرة العمل الميداني</div>
                    ) : (focusedCase.visits || []).slice().sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp)).map((v, idx) => (
                     <div key={v.id} className="relative pr-8 border-r-2 border-[#00E5FF]/10 pb-2 last:pb-0">
                        <div className="absolute -right-1.5 top-0 w-3 h-3 rounded-full bg-[#00E5FF] border-[3px] border-[#0B0E11] shadow-[0_0_10px_#00E5FF]"></div>
                        <div className="flex flex-col gap-2">
                           <div className="flex justify-between items-center">
                              <span className="text-[9px] font-mono font-bold text-slate-500 uppercase">{new Date(v.timestamp).toLocaleString('ar-LY', {hour:'2-digit', minute:'2-digit', day:'numeric', month:'short'})}</span>
                              <div className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                                 <div className="w-4 h-4 rounded-full bg-slate-800 overflow-hidden border border-white/10">
                                    {v.user?.photo && <img src={v.user.photo} className="w-full h-full object-cover"/>}
                                 </div>
                                 <span className="text-[9px] font-bold text-[#00E5FF]">{v.user?.name || 'SPECIALIST'}</span>
                              </div>
                           </div>
                           <p className="text-sm text-slate-200 leading-relaxed font-medium bg-black/30 p-3 rounded-2xl border border-white/5">{v.notes}</p>
                           {v.voiceData && (
                             <button onClick={() => {
                               const audio = new Audio(`data:audio/aac;base64,${v.voiceData}`);
                               audio.play();
                             }} className="mt-1 flex items-center gap-3 bg-[#00E5FF]/10 border border-[#00E5FF]/40 p-4 rounded-2xl active:scale-98 transition-all group">
                                <div className="w-8 h-8 rounded-full bg-[#00E5FF] text-slate-950 flex items-center justify-center shadow-lg group-active:scale-90">
                                   <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                                </div>
                                <div className="text-right">
                                   <div className="text-[10px] font-bold text-[#00E5FF] uppercase tracking-wider">تشغيل الإحاطة الصوتية</div>
                                   <div className="text-[8px] text-slate-500">انقر للاستماع إلى البيانات الميدانية</div>
                                </div>
                             </button>
                           )}
                           {JSON.parse(v.images || '[]').length > 0 && (
                             <div className="mt-2 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                {JSON.parse(v.images || '[]').map((img, imgI) => (
                                   <img key={imgI} src={img} className="w-20 h-20 rounded-xl object-cover border border-white/10" onClick={() => window.open(img)}/>
                                ))}
                             </div>
                           )}
                        </div>
                     </div>
                   ))}
                </div>
              </section>

              <div className="w-full h-px bg-white/5 my-2"></div>
              
              <section className="flex flex-col gap-10 pb-20">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                   <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none">مركز التحكم والمداخلات</h4>
                   {opStatus && <div className="text-[10px] text-[#00E5FF] font-bold animate-pulse">{opStatus}</div>}
                </div>

                {/* 1. GPS ANCHORING */}
                {!focusedCase.lat && (
                   <div className="flex flex-col gap-3">
                      <div className="text-[10px] font-bold text-[#00E5FF] uppercase tracking-wider pr-2">أولاً: تثبيت الموقع الميداني</div>
                      <button onClick={() => executeAction('LOCATION')} disabled={processing} className="w-full flex items-center justify-between p-7 rounded-[2rem] bg-white/5 border border-white/10 active:scale-[0.97] transition-all disabled:opacity-50">
                         <div className="flex items-center gap-4">
                            <span className="material-symbols-outlined text-[#00E5FF] p-3 rounded-2xl bg-[#00E5FF]/10">my_location</span>
                            <div className="text-right">
                               <div className="text-sm font-black text-white">{processing ? 'جاري التثبيت...' : 'تثبيت الإحداثيات الحالية'}</div>
                               <div className="text-[9px] text-slate-500 italic">يجب تثبيت الموقع مرة واحدة لكل حالة</div>
                            </div>
                         </div>
                         <span className="material-symbols-outlined text-[#00E5FF] opacity-30">arrow_forward</span>
                      </button>
                   </div>
                )}

                {/* 2. TEXT REPORTING */}
                <div className="flex flex-col gap-4">
                   <div className="text-[10px] font-bold text-[#00E5FF] uppercase tracking-wider pr-2">ثانياً: التقرير النصي</div>
                   <div className="relative">
                      <textarea 
                        value={reportNotes} 
                        onChange={e=>setReportNotes(e.target.value)} 
                        placeholder="أدخل الملاحظات الميدانية هنا..." 
                        className="w-full bg-black/40 border border-white/10 rounded-[2rem] p-6 text-sm text-white outline-none focus:border-[#00E5FF]/40 h-32 resize-none shadow-xl placeholder:text-slate-700 text-right"
                      />
                      <div className="absolute top-6 left-6 text-slate-800 pointer-events-none uppercase font-black text-[9px]">مسودة</div>
                   </div>
                   <button 
                     onClick={() => executeAction('TEXT')} 
                     disabled={processing || !reportNotes.trim()} 
                     className="w-full bg-[#00E5FF]/10 border border-[#00E5FF]/30 text-[#00E5FF] py-5 rounded-3xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-30"
                   >
                      <span className="material-symbols-outlined text-sm font-black">{processing ? 'sync' : 'send'}</span> {processing ? 'جاري الإرسال...' : 'إرسال التقرير النصي'}
                   </button>
                </div>

                {/* 3. VISUAL EVIDENCE */}
                <div className="flex flex-col gap-4">
                   <div className="text-[10px] font-bold text-[#00E5FF] uppercase tracking-wider pr-2">ثالثاً: التوثيق البصري</div>
                   <label className={`w-full h-56 border-2 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center relative overflow-hidden transition-all group ${capturedImage ? 'border-[#00E5FF]/40' : 'border-white/10 bg-white/5 active:bg-white/10'}`}>
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onPhotoSelect}/>
                      {capturedImage ? (
                        <>
                           <img src={capturedImage} className="w-full h-full object-cover"/>
                           <button onClick={(e) => { e.preventDefault(); setCapturedImage(null); }} className="absolute top-4 left-4 w-10 h-10 bg-black/60 rounded-full flex items-center justify-center text-white backdrop-blur-md">
                              <span className="material-symbols-outlined text-sm">close</span>
                           </button>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-3">
                           <div className="w-16 h-16 rounded-full bg-[#00E5FF]/10 flex items-center justify-center group-active:scale-95 transition-transform shadow-[0_0_15px_rgba(0,229,255,0.1)]">
                              <span className="material-symbols-outlined text-3xl text-[#00E5FF]">add_a_photo</span>
                           </div>
                           <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">اضغط لالتقاط صورة</span>
                        </div>
                      )}
                   </label>
                   {capturedImage && (
                      <button 
                        onClick={() => executeAction('IMAGE')} 
                        disabled={processing} 
                        className="w-full bg-[#00E5FF] text-slate-950 py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-[0_15px_30px_rgba(0,229,255,0.3)] active:scale-95 transition-all disabled:opacity-50"
                      >
                         <span className="material-symbols-outlined font-black">{processing ? 'sync' : 'cloud_upload'}</span> {processing ? 'جاري الرفع...' : 'رفع الصور للمركز'}
                      </button>
                   )}
                </div>

                {/* 4. VOICE BRIEFING */}
                <div className="flex flex-col gap-4">
                   <div className="text-[10px] font-bold text-[#00E5FF] uppercase tracking-wider pr-2">رابعاً: الإحاطة الصوتية</div>
                   <div className="flex flex-col gap-4">
                      {!capturedVoice && (
                         <button 
                           onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                           disabled={processing} 
                           className={`w-full flex items-center justify-between p-7 rounded-[2rem] transition-all relative overflow-hidden active:scale-[0.97] ${isRecording ? 'bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.5)]' : 'bg-white/5 border border-white/10'}`}
                         >
                            <div className="flex items-center gap-4">
                               <div className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-xl transition-all ${isRecording ? 'bg-black/20 text-white' : 'bg-[#00E5FF] text-slate-950 shadow-[0_0_20px_rgba(0,229,255,0.3)]'}`}>
                                  <span className={`material-symbols-outlined text-2xl font-black ${isRecording ? 'animate-pulse' : ''}`}>{isRecording ? 'stop' : 'mic'}</span>
                               </div>
                               <div className="text-right">
                                  <div className="text-sm font-black text-white leading-tight">{isRecording ? 'جاري التسجيل...' : 'بدء الإحاطة'}</div>
                                  <div className={`text-[9px] font-medium ${isRecording ? 'text-white/80' : 'text-slate-500'}`}>{isRecording ? `اضغط للإيقاف • ${recordingTime}ث` : 'اضغط للتحدث'}</div>
                               </div>
                            </div>
                            <span className={`material-symbols-outlined text-xl ${isRecording ? 'text-white/40 animate-spin' : 'text-[#00E5FF] opacity-30'}`}>radar</span>
                         </button>
                      )}
                
                      {capturedVoice && !isRecording && (
                         <div className="flex flex-col gap-3 animate-fade-in">
                            <div className="grid grid-cols-2 gap-3">
                               <button onClick={() => {
                                  const audio = new Audio(`data:audio/aac;base64,${capturedVoice}`);
                                  audio.play();
                               }} className="flex items-center justify-center gap-3 bg-white/5 border border-white/10 p-5 rounded-[1.5rem] active:bg-[#00E5FF]/10 transition-all border-[#00E5FF]/20">
                                  <span className="material-symbols-outlined text-[#00E5FF] text-sm">play_circle</span>
                                  <span className="text-[10px] font-black text-white uppercase tracking-widest">تأكد</span>
                               </button>
                               <button onClick={() => setCapturedVoice(null)} className="flex items-center justify-center gap-3 bg-white/5 border border-white/10 p-5 rounded-[1.5rem] active:bg-red-500/10 transition-all">
                                  <span className="material-symbols-outlined text-red-500 text-sm">delete</span>
                                  <span className="text-[10px] font-black text-white uppercase tracking-widest">حذف</span>
                               </button>
                            </div>
                            <button onClick={() => executeAction('VOICE')} disabled={processing} className="w-full bg-gradient-to-r from-[#00E5FF] to-[#00B8D4] text-slate-950 py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-3 shadow-[0_15px_40px_rgba(0,229,255,0.3)] active:scale-95 transition-all disabled:opacity-50">
                               <span className="material-symbols-outlined font-black">{processing ? 'sync' : 'send'}</span> {processing ? 'جاري البث...' : 'إرسال الإحاطة الصوتية'}
                            </button>
                         </div>
                      )}
                   </div>
                </div>
              </section>
            </div>
          </div>
        )}

        {/* FOCUSED CAMPAIGN VIEW */}
        {focusedCampaign && (
           <div className="fixed inset-0 bg-[#0B0E11] z-[150] flex flex-col animate-enter text-right" dir="rtl">
              <header className="p-6 border-b border-white/5 flex justify-between items-center sticky top-0 bg-[#0B0E11]/90 backdrop-blur-xl z-[160]">
                 <button onClick={() => setFocusedCampaign(null)} className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center active:scale-90 transition-all border border-white/10 shadow-lg">
                    <span className="material-symbols-outlined text-white">arrow_forward</span>
                 </button>
                 <div className="text-center flex-1 pr-4">
                    <span className="text-[10px] font-bold text-[#00E5FF] uppercase tracking-widest block">تفاصيل الحملة</span>
                    <span className="font-black text-sm truncate block max-w-[200px]">{focusedCampaign.name}</span>
                 </div>
                 <div className="w-12 h-12 bg-[#00E5FF]/10 rounded-full flex items-center justify-center border border-[#00E5FF]/20">
                    <span className="material-symbols-outlined text-[#00E5FF] text-xl">account_tree</span>
                 </div>
              </header>

              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8 pb-32">
                 <section className="bg-white/5 border border-white/10 p-7 rounded-[2.5rem] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#00E5FF]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                    <h3 className="text-[10px] font-black text-[#00E5FF] uppercase tracking-[0.2em] mb-4">أهداف الحملة</h3>
                    <p className="text-sm text-slate-400 leading-relaxed mb-4">{focusedCampaign.description || 'لا يوجد وصف متاح مسبقاً لهذه الحملة.'}</p>
                 </section>

                 <section>
                    <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4 flex justify-between pr-2">
                       <span>المقابر المرصودة</span>
                       <span className="text-[#00E5FF]">{focusedCampaign.cemeteries?.length || 0}</span>
                    </h3>
                    <div className="flex flex-col gap-3">
                       {focusedCampaign.cemeteries?.map(cem => (
                           <div key={cem.id} onClick={() => setFocusedCemetery(cem)} className="bg-[#1A1F24] border border-white/5 p-5 rounded-[1.8rem] flex justify-between items-center active:scale-95 transition-all">
                              <div className="flex items-center gap-4">
                                 <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border shadow-inner ${cem.lat ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                                    <span className={`material-symbols-outlined text-[20px] ${cem.lat ? 'text-emerald-500' : 'text-red-500 animate-pulse'}`}>{cem.lat ? 'location_on' : 'location_disabled'}</span>
                                 </div>
                                 <div>
                                    <div className="text-sm font-black text-white">{cem.name}</div>
                                    <div className="text-[9px] text-slate-500 mt-1 font-bold">بواسطة: {cem.user?.name || 'عضو ميداني'}</div>
                                 </div>
                              </div>
                              <div className="flex items-center gap-3">
                                 <div className={`text-[8px] font-black px-2 py-1 rounded-md border ${cem.status === 'CLEANED' ? 'text-emerald-400 border-emerald-400/20' : 'text-amber-400 border-amber-400/20'}`}>
                                    {cem.status === 'CLEANED' ? 'طاهرة' : 'قيد الفحص'}
                                 </div>
                                 <span className="material-symbols-outlined text-slate-700 text-sm">chevron_left</span>
                              </div>
                           </div>
                        ))}
                       {(!focusedCampaign.cemeteries || focusedCampaign.cemeteries.length === 0) && (
                          <div className="p-12 border border-dashed border-white/5 rounded-[2rem] text-center text-[10px] text-slate-600 font-bold italic bg-white/[0.01]">لا توجد بيانات مسجلة حالياً</div>
                       )}
                    </div>
                 </section>

                 <section>
                    <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4 flex justify-between pr-2">
                       <span>الحالات الملحقة</span>
                       <span className="text-[#00E5FF]">{focusedCampaign.cases?.length || 0}</span>
                    </h3>
                    <div className="flex flex-col gap-3">
                       {focusedCampaign.cases?.map(cs => (
                          <div key={cs.id} className="bg-[#1A1F24] border border-white/5 p-5 rounded-[1.8rem] flex justify-between items-center active:bg-white/[0.02]" onClick={() => setFocusedCase(cs)}>
                             <div className="flex items-center gap-4">
                                <div className="w-11 h-11 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                                   <span className="material-symbols-outlined text-purple-500 text-[20px]">assignment</span>
                                </div>
                                <div className="text-right">
                                   <div className="text-sm font-black text-white">{cs.title}</div>
                                   <div className="text-[9px] text-slate-500 mt-1 uppercase tracking-widest">{cs.type}</div>
                                </div>
                             </div>
                             <span className="material-symbols-outlined text-slate-700">chevron_left</span>
                          </div>
                       ))}
                    </div>
                 </section>
              </div>
              <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#0B0E11] to-transparent pointer-events-none z-[170]">
                  <div className="flex gap-4 pointer-events-auto">
                    <button onClick={() => setAddingCemetery(true)} className="flex-1 bg-[#00E5FF] text-slate-950 font-black py-5 rounded-3xl text-sm uppercase flex items-center justify-center gap-2 shadow-[0_20px_40px_rgba(0,229,255,0.3)] active:scale-95 transition-all">
                       <span className="material-symbols-outlined text-lg">mosque</span> إضافة مقبرة
                    </button>
                    <button onClick={() => { setOpForm({ title: '', description: '', type: 'رصد ومتابعة', campaignId: focusedCampaign.id, city: focusedCampaign.city }); setAddingNewOp(true); }} className="flex-1 bg-white text-slate-950 font-black py-5 rounded-3xl text-sm uppercase flex items-center justify-center gap-2 active:scale-95 transition-all">
                       <span className="material-symbols-outlined text-lg">add_box</span> إضافة حالة
                    </button>
                  </div>
               </div>
           </div>
        )}

        {/* ADD CEMETERY MODAL */}
        {addingCemetery && (
           <div className="fixed inset-0 bg-[#0B0E11] z-[450] flex flex-col animate-enter text-right" dir="rtl">
              <header className="p-6 border-b border-white/5 flex justify-between items-center bg-[#0B0E11]/90 backdrop-blur-xl z-[460]">
                 <button onClick={() => setAddingCemetery(false)} className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center active:scale-90 transition-all border border-white/10 shadow-lg">
                    <span className="material-symbols-outlined text-white">close</span>
                 </button>
                 <div className="text-center flex-1">
                    <span className="text-[10px] font-bold text-[#00E5FF] uppercase tracking-widest block">مسح جغرافي</span>
                    <span className="font-black text-sm">تسجيل موقع مقبرة</span>
                 </div>
                 <div className="w-12 h-12"></div>
              </header>
              <div className="p-6 flex flex-col gap-8">
                  <div>
                    <h4 className="text-[10px] font-black text-[#00E5FF] uppercase tracking-widest mb-2 pr-2">تسمية الموقع المسحي</h4>
                    <input 
                        type="text" 
                        placeholder="اسم المقبرة أو الموقع المرصود" 
                        value={cemeteryForm.name}
                        onChange={e => setCemeteryForm({...cemeteryForm, name: e.target.value})}
                        className="w-full p-5 bg-black/40 border border-white/10 rounded-3xl outline-none focus:border-[#00E5FF] text-white text-right shadow-inner"
                    />
                  </div>
                  
                  <section className="bg-white/5 border border-white/5 rounded-2xl p-5 flex items-center gap-4">
                     <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                        <span className="material-symbols-outlined text-emerald-500">mosque</span>
                     </div>
                     <div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">نوع الموقع</div>
                        <div className="text-sm font-black text-white">مقبرة / موقع مسحي</div>
                     </div>
                  </section>
                  
                  {opStatus && <div className="text-center text-[#00E5FF] font-bold text-[10px] bg-[#00E5FF]/5 p-4 rounded-2xl border border-[#00E5FF]/20 animate-pulse">{opStatus}</div>}
                  <button onClick={createCemetery} disabled={processing || !cemeteryForm.name.trim()} className="bg-gradient-to-tr from-[#00E5FF] to-[#00B8D4] text-slate-950 font-black p-6 rounded-[2.5rem] text-lg shadow-[0_20px_40px_rgba(0,229,255,0.3)] active:scale-95 transition-all mt-4 disabled:opacity-30">
                     {processing ? 'جاري البث...' : 'بدء تسجيل الموقع'}
                  </button>
               </div>
           </div>
        )}

        {focusedCemetery && (
           <div className="fixed inset-0 bg-[#0B0E11] z-[400] flex flex-col animate-enter text-right" dir="rtl">
             <header className="px-6 py-6 border-b border-white/5 flex justify-between items-center sticky top-0 bg-[#0B0E11]/90 backdrop-blur-xl z-[410]">
                <button onClick={() => setFocusedCemetery(null)} className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center active:scale-90 transition-all border border-white/10 shadow-lg">
                   <span className="material-symbols-outlined text-white">arrow_forward</span>
                </button>
                <div className="text-center flex-1">
                   <span className="text-[10px] font-bold text-[#00E5FF] uppercase tracking-wider block">فحص موقع المقبرة</span>
                   <span className="font-black text-sm">{focusedCemetery.name}</span>
                </div>
                <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20">
                   <span className="material-symbols-outlined text-emerald-500 text-xl">mosque</span>
                </div>
             </header>

             <div className="p-6 flex flex-col gap-8 pb-32 overflow-y-auto">
               <section className="relative">
                 <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#00E5FF]/5 rounded-full blur-3xl"></div>
                 <div className="text-[11px] text-[#00E5FF] font-black uppercase tracking-widest mb-2">المسح الميداني الحالي</div>
                 <h2 className="text-3xl font-black text-white leading-tight mb-4">{focusedCemetery.name}</h2>
                 <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full">
                       <div className={`w-2.5 h-2.5 rounded-full ${focusedCemetery.lat ? 'bg-[#00E5FF] shadow-[0_0_10px_#00E5FF]' : 'bg-red-500 animate-pulse'}`}></div>
                       <span className="text-[10px] font-mono font-bold text-white uppercase tracking-wider">
                         {focusedCemetery.lat ? `الموقع: ${focusedCemetery.lat.toFixed(4)}, ${focusedCemetery.lng.toFixed(4)}` : 'انتظار التثبيت'}
                       </span>
                    </div>
                    <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-full">
                       <span className="text-[10px] font-bold text-slate-400 capitalize">مقبرة / موقع مسحي</span>
                    </div>
                 </div>
               </section>

               <section className="bg-white/5 border border-white/5 rounded-3xl p-5">
                 <h4 className="flex items-center gap-2 text-xs font-bold text-[#00E5FF] mb-4"> 
                   <span className="material-symbols-outlined text-[18px]">photo_library</span> الأرشيف البصري ({histImages.length}) 
                 </h4>
                 <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar snap-x">
                   {histImages.map((img, i) => ( <img key={i} src={img} className="w-40 h-40 rounded-2xl object-cover snap-start border border-white/10 shadow-xl" onClick={() => window.open(img)}/> ))}
                   {histImages.length === 0 && <div className="text-xs text-slate-600 italic py-4">لاتوجد بيانات بصرية سابقة لهذا الموقع</div>}
                 </div>
               </section>

               <section className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 shadow-xl backdrop-blur-md">
                 <div className="flex justify-between items-center mb-6">
                    <h4 className="flex items-center gap-2 text-xs font-black text-[#00E5FF] uppercase tracking-widest"> 
                      <span className="material-symbols-outlined text-[18px]">history</span> السجل الاستخباري
                    </h4>
                    <span className="text-[10px] font-bold text-slate-600 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">{focusedCemetery.visits?.length || 0} حدث</span>
                 </div>
                 <div className="flex flex-col gap-6">
                    {(!focusedCemetery.visits || focusedCemetery.visits.length === 0) ? (
                      <div className="text-xs text-slate-500 italic text-center py-8 bg-black/20 rounded-3xl border border-white/5">قيد الانتظار لمباشرة العمل الميداني</div>
                    ) : (focusedCemetery.visits || []).slice().sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp)).map((v, idx) => (
                      <div key={v.id} className="relative pr-8 border-r-2 border-[#00E5FF]/10 pb-2 last:pb-0">
                         <div className="absolute -right-1.5 top-0 w-3 h-3 rounded-full bg-[#00E5FF] border-[3px] border-[#0B0E11] shadow-[0_0_10px_#00E5FF]"></div>
                         <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                               <span className="text-[9px] font-mono font-bold text-slate-500 uppercase">{new Date(v.timestamp).toLocaleString('ar-LY', {hour:'2-digit', minute:'2-digit', day:'numeric', month:'short'})}</span>
                               <div className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                                  <div className="w-4 h-4 rounded-full bg-slate-800 overflow-hidden border border-white/10">
                                     {v.user?.photo && <img src={v.user.photo} className="w-full h-full object-cover"/>}
                                  </div>
                                  <span className="text-[9px] font-bold text-[#00E5FF]">{v.user?.name || 'SPECIALIST'}</span>
                               </div>
                            </div>
                            <p className="text-sm text-slate-200 leading-relaxed font-medium bg-black/30 p-3 rounded-2xl border border-white/5">{v.notes}</p>
                            {v.voiceData && (
                              <button onClick={() => {
                                const audio = new Audio(`data:audio/aac;base64,${v.voiceData}`);
                                audio.play();
                              }} className="mt-1 flex items-center gap-3 bg-[#00E5FF]/10 border border-[#00E5FF]/40 p-4 rounded-2xl active:scale-98 transition-all group">
                                 <div className="w-8 h-8 rounded-full bg-[#00E5FF] text-slate-950 flex items-center justify-center shadow-lg group-active:scale-90">
                                    <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                                 </div>
                                 <div className="text-right">
                                    <div className="text-[10px] font-bold text-[#00E5FF] uppercase tracking-wider">تشغيل الإحاطة الصوتية</div>
                                    <div className="text-[8px] text-slate-500">انقر للاستماع إلى البيانات الميدانية</div>
                                 </div>
                              </button>
                            )}
                            {JSON.parse(v.images || '[]').length > 0 && (
                              <div className="mt-2 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                 {JSON.parse(v.images || '[]').map((img, imgI) => (
                                    <img key={imgI} src={img} className="w-20 h-20 rounded-xl object-cover border border-white/10" onClick={() => window.open(img)}/>
                                 ))}
                              </div>
                            )}
                         </div>
                      </div>
                    ))}
                 </div>
               </section>

               <div className="w-full h-px bg-white/5 my-2"></div>
               
               <section className="flex flex-col gap-10 pb-20">
                 <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none">مركز التحكم والمداخلات</h4>
                    {opStatus && <div className="text-[10px] text-[#00E5FF] font-bold animate-pulse">{opStatus}</div>}
                 </div>

                 {/* 1. GPS ANCHORING */}
                 {!focusedCemetery.lat && (
                    <div className="flex flex-col gap-3">
                       <div className="text-[10px] font-bold text-[#00E5FF] uppercase tracking-wider pr-2">أولاً: تثبيت الموقع الميداني</div>
                       <button onClick={() => executeAction('LOCATION')} disabled={processing} className="w-full flex items-center justify-between p-7 rounded-[2rem] bg-white/5 border border-white/10 active:scale-[0.97] transition-all disabled:opacity-50">
                          <div className="flex items-center gap-4">
                             <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${loadingAction === 'LOCATION' ? 'bg-[#00E5FF]/20 animate-spin' : 'bg-[#00E5FF]/10'}`}>
                                <span className="material-symbols-outlined text-[#00E5FF]">{loadingAction === 'LOCATION' ? 'autorenew' : 'my_location'}</span>
                             </div>
                             <div className="text-right">
                                <div className="text-sm font-black text-white">{loadingAction === 'LOCATION' ? 'جاري التثبيت...' : 'تثبيت الإحداثيات الحالية'}</div>
                                <div className="text-[9px] text-slate-500 italic">سحب الموقع الحالي للمقبرة</div>
                             </div>
                          </div>
                          <span className="material-symbols-outlined text-[#00E5FF] opacity-30">arrow_forward</span>
                       </button>
                    </div>
                 )}

                 {/* 2. TEXT REPORTING */}
                 <div className="flex flex-col gap-4">
                    <div className="text-[10px] font-bold text-[#00E5FF] uppercase tracking-wider pr-2">ثانياً: التحديث الوصفي</div>
                    <textarea 
                      value={reportNotes} 
                      onChange={e=>setReportNotes(e.target.value)} 
                      placeholder={focusedCemetery.notes || "أدخل الملاحظات الميدانية للموقع..."} 
                      className="w-full bg-black/40 border border-white/10 rounded-[2rem] p-6 text-sm text-white outline-none focus:border-[#00E5FF]/40 h-32 resize-none shadow-xl text-right"
                    />
                    <button onClick={() => executeAction('TEXT')} disabled={processing || !reportNotes.trim()} className="w-full bg-[#00E5FF]/10 border border-[#00E5FF]/30 text-[#00E5FF] py-5 rounded-3xl font-black text-xs uppercase transition-all active:scale-95 disabled:opacity-30">
                       {loadingAction === 'TEXT' ? 'جاري التحديث...' : 'تحديث الملاحظات'}
                    </button>
                 </div>

                 {/* 3. VISUAL EVIDENCE */}
                 <div className="flex flex-col gap-4">
                    <div className="text-[10px] font-bold text-[#00E5FF] uppercase tracking-wider pr-2">ثالثاً: التوثيق البصري</div>
                    <label className={`w-full h-56 border-2 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center relative overflow-hidden transition-all group ${capturedImage ? 'border-[#00E5FF]/40' : 'border-white/10 bg-white/5 active:bg-white/10'}`}>
                       <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onPhotoSelect}/>
                       {capturedImage ? (
                         <>
                            <img src={capturedImage} className="w-full h-full object-cover"/>
                            <button onClick={(e) => { e.preventDefault(); setCapturedImage(null); }} className="absolute top-4 left-4 w-10 h-10 bg-black/60 rounded-full flex items-center justify-center text-white backdrop-blur-md">
                               <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                         </>
                       ) : (
                         <div className="flex flex-col items-center gap-3">
                            <div className="w-16 h-16 rounded-full bg-[#00E5FF]/10 flex items-center justify-center group-active:scale-95 transition-transform shadow-[0_0_15px_rgba(0,229,255,0.1)]">
                               <span className="material-symbols-outlined text-3xl text-[#00E5FF]">add_a_photo</span>
                            </div>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">اضغط لالتقاط صورة</span>
                         </div>
                       )}
                    </label>
                    {capturedImage && (
                       <button onClick={() => executeAction('IMAGE')} disabled={processing} className="w-full bg-[#00E5FF] text-slate-950 py-5 rounded-3xl font-black text-xs uppercase shadow-xl active:scale-95 transition-all">
                          {loadingAction === 'IMAGE' ? 'جاري رفع الصورة...' : 'رفع الصورة الميدانية'}
                       </button>
                    )}
                 </div>

                 {/* 4. VOICE BRIEFING */}
                 <div className="flex flex-col gap-4">
                    <div className="text-[10px] font-bold text-[#00E5FF] uppercase tracking-wider pr-2">رابعاً: الإيجاز الصوتي</div>
                    {!capturedVoice ? (
                      <button onClick={isRecording ? stopVoiceRecording : startVoiceRecording} className={`w-full flex items-center justify-between p-7 rounded-[2rem] transition-all relative overflow-hidden active:scale-[0.97] ${isRecording ? 'bg-red-500 shadow-xl' : 'bg-white/5 border border-white/10'}`}>
                         <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-xl ${isRecording ? 'bg-black/20 animate-pulse' : 'bg-[#00E5FF] text-slate-950'}`}>
                               <span className="material-symbols-outlined font-black">{isRecording ? 'stop' : 'mic'}</span>
                            </div>
                            <div className="text-right">
                               <div className="text-sm font-black text-white">{isRecording ? 'جاري التسجيل...' : 'بدء الإيجاز'}</div>
                               <div className="text-[9px] text-slate-500">{isRecording ? `تحدث الآن • ${recordingTime}ث` : 'اضغط للتحدث'}</div>
                            </div>
                         </div>
                      </button>
                    ) : (
                      <div className="flex flex-col gap-3">
                         <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => { new Audio(`data:audio/aac;base64,${capturedVoice}`).play() }} className="p-5 bg-white/5 border border-[#00E5FF]/20 rounded-2xl flex items-center justify-center gap-2 text-[#00E5FF] font-black text-[10px]">تشغيل</button>
                            <button onClick={() => setCapturedVoice(null)} className="p-5 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center gap-2 text-red-500 font-black text-[10px]">حذف</button>
                         </div>
                        <button onClick={() => executeAction('VOICE')} disabled={processing} className="w-full bg-[#00E5FF] text-slate-950 py-5 rounded-3xl font-black text-xs uppercase shadow-xl active:scale-95 transition-all">
                           {loadingAction === 'VOICE' ? 'جاري رفع التسجيل...' : 'رفع التسجيل الميداني'}
                        </button>
                      </div>
                    )}
                 </div>
               </section>
             </div>
           </div>
        )}

        {addingNewOp && (
          <div className="fixed inset-0 bg-[#0B0E11] z-[500] flex flex-col animate-enter">
            <header className="p-6 border-b border-white/5 flex justify-between items-center sticky top-0 bg-[#0B0E11]/90 backdrop-blur-xl z-[510]">
               <button onClick={() => setAddingNewOp(false)} className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center active:scale-90 transition-all border border-white/10 shadow-lg">
                 <span className="material-symbols-outlined text-white">arrow_forward</span>
               </button>
               <div className="text-center">
                  <span className="text-[10px] font-bold text-[#00E5FF] uppercase tracking-widest block">إضافة بيانات</span>
                  <span className="font-black text-sm">مهمة ميدانية جديدة</span>
               </div>
               <div className="w-12 h-12"></div>
            </header>
            
            <div className="p-6 flex flex-col gap-6">
               <input 
                 type="text"
                 placeholder="عنوان المهمة الميدانية" 
                 value={opForm.title} 
                 onChange={e=>setOpForm({...opForm, title:e.target.value})} 
                 className="p-5 bg-slate-900 border border-white/10 rounded-2xl outline-none focus:border-[#00E5FF] text-white text-right"
               />
               <textarea 
                 placeholder="التعليمات والأهداف التفصيلية ..." 
                 value={opForm.description} 
                 onChange={e=>setOpForm({...opForm, description:e.target.value})} 
                 className="p-5 bg-slate-900 border border-white/10 rounded-2xl outline-none focus:border-[#00E5FF] h-40 resize-none text-white text-right"
               />
               <select value={opForm.city} onChange={e=>setOpForm({...opForm, city:e.target.value})} className="p-5 bg-slate-900 border border-white/10 rounded-2xl outline-none focus:border-[#00E5FF] text-white">
                  <option value="">اختيار مدينة النطاق</option>
                  {cityRegistry.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
               </select>
               <select value={opForm.type} onChange={e=>setOpForm({...opForm, type:e.target.value})} className="p-5 bg-slate-900 border border-white/10 rounded-2xl outline-none focus:border-[#00E5FF] text-white">
                  <option>رصد ومتابعة</option> <option>تحقيق حالة</option> <option>تدخل حرج</option> <option>إغاثة</option>
               </select>

               {/* Campaign Link (Mandatory) */}
               {!focusedCampaign && (
                 <select required value={opForm.campaignId || ''} onChange={e=>setOpForm({...opForm, campaignId:e.target.value})} className="p-5 bg-slate-900 border border-[#00E5FF]/30 rounded-2xl outline-none focus:border-[#00E5FF] text-white">
                    <option value="">ربط العملية بحملة نشطة (إلزامي)</option>
                    {activeCampaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                 </select>
               )}
               {focusedCampaign && (
                 <div className="p-5 bg-[#00E5FF]/5 border border-[#00E5FF]/20 rounded-2xl text-[#00E5FF] text-[11px] font-bold">
                   سيتم ربط الحالة بحملة: {focusedCampaign.name}
                 </div>
               )}

               {opStatus && <div className="text-center text-[#00E5FF] font-bold text-sm bg-[#00E5FF]/5 p-3 rounded-xl border border-[#00E5FF]/20">{opStatus}</div>}
               <button onClick={createOp} disabled={processing} className="bg-gradient-to-r from-[#00E5FF] to-[#00B8D4] text-slate-950 font-black p-6 rounded-3xl text-lg shadow-[0_15px_30px_rgba(0,229,255,0.3)] active:scale-95 transition-all"> 
                  {processing ? 'جاري التثبيت...' : 'تثبيت الحالة على الخارطة'} 
               </button>
               <button onClick={() => setAddingNewOp(false)} className="w-full bg-white/5 text-slate-500 font-bold p-5 rounded-2xl active:scale-95 transition-all">إلغاء وتراجع</button>
            </div>
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-4 pb-8 border-t border-white/5 bg-[#0B0E11]/90 backdrop-blur-xl flex justify-around items-end z-[100]">
         <div onClick={() => setActiveTab('TASKS')} className={`flex flex-col items-center gap-1 cursor-pointer transition-all duration-300 ${activeTab === 'TASKS' ? 'text-[#00E5FF] scale-110' : 'text-slate-500'}`}> 
            <span className={`material-symbols-outlined ${activeTab === 'TASKS' ? 'icon-fill' : ''}`}>assignment</span> 
            <span className="text-[9px] font-black uppercase tracking-tighter">المهام</span> 
         </div>
         <div onClick={() => setActiveTab('CAMPAIGNS')} className={`flex flex-col items-center gap-1 cursor-pointer transition-all duration-300 ${activeTab === 'CAMPAIGNS' ? 'text-[#00E5FF] scale-110' : 'text-slate-500'}`}> 
            <span className={`material-symbols-outlined ${activeTab === 'CAMPAIGNS' ? 'icon-fill' : ''}`}>campaign</span> 
            <span className="text-[9px] font-black uppercase tracking-tighter">الحملات</span> 
         </div>
         <div className="group relative">
            <div className="w-14 h-14 bg-gradient-to-tr from-[#00E5FF] to-[#00B8D4] rounded-full flex items-center justify-center -translate-y-4 shadow-[0_10px_30px_rgba(0,229,255,0.4)] border-4 border-[#0B0E11] active:scale-90 transition-all cursor-pointer" onClick={() => setAddingNewOp(true)}> 
               <span className="material-symbols-outlined text-slate-950 font-black text-2xl">add</span> 
            </div>
         </div>
         <div onClick={() => setActiveTab('DASHBOARD')} className={`flex flex-col items-center gap-1 cursor-pointer transition-all duration-300 ${activeTab === 'DASHBOARD' ? 'text-[#00E5FF] scale-110' : 'text-slate-500'}`}> 
            <span className={`material-symbols-outlined ${activeTab === 'DASHBOARD' ? 'icon-fill' : ''}`}>dashboard</span> 
            <span className="text-[9px] font-black uppercase tracking-tighter">الرئيسية</span> 
         </div>
      </footer>

      <style jsx global>{`
        .glass-panel { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(10px); }
        .custom-scrollbar::-webkit-scrollbar { height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,229,255,0.2); border-radius: 10px; }
        @keyframes enter { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-enter { animation: enter 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  )
}
