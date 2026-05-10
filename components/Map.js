import { useState } from 'react'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import L from 'leaflet'

const createTacticalIcon = (entity, type, labelMode) => {
  const color = type === 'case' ? '#ff4444' : '#10b981';
  const iconName = type === 'case' ? 'assignment_late' : 'mosque';
  const name = type === 'case' ? entity.title : entity.name;
  
  let entityPic = null;
  let userPic = null;
  
  if (entity.visits && entity.visits.length > 0) {
    const sortedVisits = [...entity.visits].sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
    for (const v of sortedVisits) {
       if (v.images && v.images !== 'null' && v.images !== '[]') {
         try {
           const imgs = JSON.parse(v.images);
           if (imgs && imgs.length > 0) {
             entityPic = imgs[0];
             userPic = v.user?.photo;
             break;
           }
         } catch(e) {}
       }
    }
  }
  
  if (!entityPic && type === 'cemetery' && entity.images && entity.images !== 'null') {
     try {
       const imgs = JSON.parse(entity.images);
       if (imgs && imgs.length > 0) entityPic = imgs[0];
     } catch(e) {}
  }
  if (!userPic) userPic = entity.user?.photo;

  let htmlContent = '';
  
  if (labelMode === 0) {
    htmlContent = `
      <div style="display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; background: rgba(15, 23, 42, 0.95); border: 2px solid ${color}; border-radius: 10px; color: ${color}; box-shadow: 0 0 15px ${color}66; backdrop-filter: blur(8px);">
        <span class="material-symbols-outlined" style="font-size: 20px; font-weight: bold;">${iconName}</span>
      </div>
    `;
  } else if (labelMode === 1) {
    htmlContent = `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; width: 120px;">
        <div style="display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; background: rgba(15, 23, 42, 0.95); border: 2px solid ${color}; border-radius: 10px; color: ${color}; box-shadow: 0 0 15px ${color}66; backdrop-filter: blur(8px);">
          <span class="material-symbols-outlined" style="font-size: 20px; font-weight: bold;">${iconName}</span>
        </div>
        <div style="background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(4px); border: 1px solid ${color}44; padding: 2px 10px; border-radius: 4px; font-family: 'Cairo', sans-serif; font-size: 9px; color: #fff; font-weight: 900; white-space: nowrap; box-shadow: 0 4px 10px rgba(0,0,0,0.5); direction: rtl; border-top: 2px solid ${color};">
          ${name}
        </div>
      </div>
    `;
  } else {
    htmlContent = `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; width: 120px;">
        <div style="position: relative; width: 64px; height: 64px;">
          <div style="width: 100%; height: 100%; border-radius: 14px; border: 2px solid ${color}; overflow: hidden; background: #0f172a; box-shadow: 0 0 20px rgba(0,0,0,0.5);">
            ${entityPic ? `<img src="${entityPic}" style="width:100%; height:100%; object-fit:cover;" />` : `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center;"><span class="material-symbols-outlined" style="color:${color}; font-size:30px;">${iconName}</span></div>`}
          </div>
          <div style="position: absolute; bottom: -8px; left: -8px; width: 34px; height: 34px; border-radius: 50%; border: 2px solid #00E5FF; overflow: hidden; background: #0f172a; box-shadow: 0 4px 12px rgba(0,0,0,0.6); z-index: 20;">
            ${userPic ? `<img src="${userPic}" style="width:100%; height:100%; object-fit:cover;" />` : `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center;"><span class="material-symbols-outlined" style="color:#00E5FF; font-size:20px;">person</span></div>`}
          </div>
        </div>
        <div style="background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(8px); border: 1px solid ${color}44; padding: 2px 10px; border-radius: 6px; font-family: 'Cairo', sans-serif; font-size: 9px; color: #fff; font-weight: 900; white-space: nowrap; direction: rtl; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">
          ${name}
        </div>
      </div>
    `;
  }

  return L.divIcon({
    html: htmlContent,
    className: '',
    iconSize: labelMode === 2 ? [120, 100] : [120, 60],
    iconAnchor: labelMode === 2 ? [60, 50] : [60, 18],
    popupAnchor: [0, -20]
  });
};

const TILE_STYLES = {
  'الوضع الليلي (Matrix)': 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  'أقمار صناعية (Esri)': 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  'وضع الإضاءة (Clean)': 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  'خريطة افتراضية (OSM)': 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  'تضاريس الأرض': 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
}

const createSpecialistIcon = (visit, labelMode) => {
  const avatarUrl = visit.user?.photo || "https://lh3.googleusercontent.com/aida-public/AB6AXuBmmZzFlCE9qP7kVapq4Mz67PxvIUnqrBn862w9aGbvgy8RX3r_UVLfcSZ80ddbSg3GZ3xrdMQXCiNmGpwP3RIUro9UArhU728kaVJGiux4nIyIEDDmx8OIUWRoyWgjLRvoRyyTA8Issu8kmS8pfrlihuonhVGm9z1FoYneRZ_9-QpA2CkBz_dox7EKPzvRPKSULcZNj5P3_PkJyWXve_m9Sn5phGyuTTuFhp2skPwgpFLp81ROS_24HMcAv4i7vKGLCqlEk4qY-gKW";
  
  const memberName = visit.user?.name || 'مختص';
  const committee = visit.user?.committee || 'لجنة عامة';
  const entityName = visit.case?.title || visit.cemetery?.name || 'نشاط ميداني';

  let labelText = '';
  if (labelMode === 0) labelText = '';
  else if (labelMode === 1) labelText = memberName;
  else labelText = `${memberName} (${committee})`;
  
  const badgeIcon = visit.case ? 'assignment_late' : (visit.cemetery ? 'mosque' : 'person_pin');
  const badgeColor = visit.case ? '#ff4444' : (visit.cemetery ? '#10b981' : '#00e5ff');

  const htmlStr = `
    <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; width: 160px; pointer-events: none;">
      <div class="marker-pulse" style="position: relative; width: 48px; height: 48px; border-radius: 50%; border: 2px solid #00e5ff; background: #0f172a; box-shadow: 0 0 15px rgba(0,229,255,0.4);">
        <img src="${avatarUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; position: relative; z-index: 10;" />
        <div style="position: absolute; bottom: -4px; right: -4px; width: 22px; height: 22px; border-radius: 6px; background: #0f172a; border: 1.5px solid ${badgeColor}; z-index: 20; display: flex; align-items: center; justify-content: center;">
           <span class="material-symbols-outlined" style="font-size: 14px; color: ${badgeColor}; font-weight: bold;">${badgeIcon}</span>
        </div>
      </div>
      ${labelText ? `
        <div style="background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(8px); border: 1px solid #00e5ff; padding: 4px 12px; border-radius: 6px; font-family: 'Cairo', sans-serif; font-size: 10px; color: #fff; font-weight: 700; box-shadow: 0 4px 15px rgba(0,0,0,0.5); white-space: nowrap; direction: rtl; text-align: center;">
          ${labelText}
        </div>
      ` : ''}
    </div>
  `;

  return L.divIcon({
    html: htmlStr,
    className: '', 
    iconSize: [160, 90],
    iconAnchor: [80, 45],
    popupAnchor: [0, -40]
  });
};

export default function Map({ cases = [], visits = [], campaigns = [], mapViewMode = 'CASES', labelMode = 0, center=[32.88, 13.19], zoom=12, onMarkerClick }) {
  const [activeStyle, setActiveStyle] = useState('الوضع الليلي (Matrix)')

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <select 
        value={activeStyle}
        onChange={(e) => setActiveStyle(e.target.value)}
        style={{ 
          position: 'absolute', top: '30px', left: '15px', 
          zIndex: 1000, padding: '10px 14px', borderRadius: '8px',
          background: 'rgba(15, 23, 42, 0.85)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)',
          fontSize: '14px', fontWeight: 'bold', outline: 'none', cursor: 'pointer',
          backdropFilter: 'blur(10px)', boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
        }}
      >
        {Object.keys(TILE_STYLES).map(style => (
          <option key={style} value={style} style={{background: '#0f172a'}}>{style}</option>
        ))}
      </select>
      
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={true} style={{ height: '100%', width: '100%', zIndex: 1 }}>
        <TileLayer url={TILE_STYLES[activeStyle]} attribution="&copy; مزودو الخرائط" />
        {(mapViewMode === 'CASES' || mapViewMode === 'BOTH') && Array.isArray(cases) && cases.filter(c => c.lat !== null && c.lng !== null).map(c => (
          <Marker 
            key={c.id} 
            position={[c.lat, c.lng]} 
            icon={createTacticalIcon(c, 'case', labelMode)} 
            eventHandlers={{ click: () => onMarkerClick && onMarkerClick(c, 'case') }}
          />
        ))}

        {(mapViewMode === 'CEMETERIES' || mapViewMode === 'BOTH') && Array.isArray(campaigns) && campaigns.flatMap(camp => camp.cemeteries || []).filter(cem => cem.lat !== null && cem.lng !== null).map(cem => (
          <Marker 
            key={cem.id} 
            position={[cem.lat, cem.lng]} 
            icon={createTacticalIcon(cem, 'cemetery', labelMode)} 
            eventHandlers={{ click: () => onMarkerClick && onMarkerClick(cem, 'cemetery') }}
          />
        ))}
      </MapContainer>
    </div>
  )
}
