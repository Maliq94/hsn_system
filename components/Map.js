import { useState } from 'react'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import L from 'leaflet'

const createTacticalIcon = (iconName, color, label = '', glow = true) => {
  const htmlStr = `
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; width: 120px;">
      <div style="
        display: flex; 
        align-items: center; 
        justify-content: center; 
        width: 36px; height: 36px; 
        background: rgba(15, 23, 42, 0.95); 
        border: 2px solid ${color}; 
        border-radius: 10px;
        color: ${color};
        box-shadow: ${glow ? `0 0 15px ${color}66` : 'none'};
        backdrop-filter: blur(8px);
        transition: all 0.2s ease;
      " class="tactical-marker">
        <span class="material-symbols-outlined" style="font-size: 20px; font-weight: bold;">${iconName}</span>
      </div>
      ${label ? `
        <div style="background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(4px); border: 1px solid ${color}44; padding: 2px 10px; border-radius: 4px; font-family: 'Cairo', sans-serif; font-size: 9px; color: #fff; font-weight: 900; white-space: nowrap; box-shadow: 0 4px 10px rgba(0,0,0,0.5); direction: rtl; border-top: 2px solid ${color};">
          ${label}
        </div>
      ` : ''}
    </div>
  `;
  return L.divIcon({
    html: htmlStr,
    className: '',
    iconSize: [120, 60],
    iconAnchor: [60, 18],
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
  const avatarUrl = "https://lh3.googleusercontent.com/aida-public/AB6AXuBmmZzFlCE9qP7kVapq4Mz67PxvIUnqrBn862w9aGbvgy8RX3r_UVLfcSZ80ddbSg3GZ3xrdMQXCiNmGpwP3RIUro9UArhU728kaVJGiux4nIyIEDDmx8OIUWRoyWgjLRvoRyyTA8Issu8kmS8pfrlihuonhVGm9z1FoYneRZ_9-QpA2CkBz_dox7EKPzvRPKSULcZNj5P3_PkJyWXve_m9Sn5phGyuTTuFhp2skPwgpFLp81ROS_24HMcAv4i7vKGLCqlEk4qY-gKW";
  
  const memberName = visit.user?.name || 'مختص';
  const committee = visit.user?.committee || 'لجنة عامة';
  const caseName = visit.case?.title || 'حالة ميدانية';
  const timeStr = new Date(visit.timestamp).toLocaleString('ar-LY', { hour: '2-digit', minute: '2-digit' });

  let labelText = '';
  switch(labelMode) {
    case 0: labelText = `${memberName} / ${committee}`; break;
    case 1: labelText = caseName; break;
    case 2: labelText = `${caseName} - ${memberName} / ${committee}`; break;
    case 3: labelText = `${caseName} - ${memberName} / ${committee} - ${timeStr}`; break;
    default: labelText = memberName;
  }
  
  const htmlStr = `
    <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; width: 220px; pointer-events: none;">
      <div class="marker-pulse" style="position: relative; width: 50px; height: 50px; border-radius: 50%; border: 2px solid #00e5ff; background: #242b2d; box-shadow: 0 0 15px rgba(0,229,255,0.4);">
        <img src="${avatarUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; position: relative; z-index: 10;" />
      </div>
      <div style="background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(8px); border: 1px solid #00e5ff; padding: 4px 12px; border-radius: 6px; font-family: 'Cairo', sans-serif; font-size: 11px; color: #fff; font-weight: 700; box-shadow: 0 4px 15px rgba(0,0,0,0.5); white-space: nowrap; direction: rtl; text-align: center;">
        <span style="color: #00e5ff;">${labelText}</span>
      </div>
    </div>
  `;

  return L.divIcon({
    html: htmlStr,
    className: '', 
    iconSize: [220, 90],
    iconAnchor: [110, 45],
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
            icon={createTacticalIcon('assignment_late', '#ff4444', c.title)} 
            eventHandlers={{ click: () => onMarkerClick && onMarkerClick(c, 'case') }}
          />
        ))}

        {(mapViewMode === 'CASES' || mapViewMode === 'BOTH') && visits.map(v => {
          const name = v.user?.name || v.userId;
          return (
            <Marker 
              key={v.id} 
              position={[v.lat, v.lng]} 
              icon={createSpecialistIcon(v, labelMode)}
              eventHandlers={{ click: () => onMarkerClick && onMarkerClick(v, 'visit') }}
            />
          )
        })}

        {(mapViewMode === 'CEMETERIES' || mapViewMode === 'BOTH') && Array.isArray(campaigns) && campaigns.flatMap(camp => camp.cemeteries || []).filter(cem => cem.lat !== null && cem.lng !== null).map(cem => (
          <Marker 
            key={cem.id} 
            position={[cem.lat, cem.lng]} 
            icon={createTacticalIcon('mosque', '#10b981', cem.name)} 
            eventHandlers={{ click: () => onMarkerClick && onMarkerClick(cem, 'cemetery') }}
          />
        ))}
      </MapContainer>
    </div>
  )
}
