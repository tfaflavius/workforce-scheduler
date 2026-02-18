import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Box, Typography } from '@mui/material';
// LocationLog import removed - using simplified TrailLocation interface instead

// Fix default marker icons in Leaflet + Vite
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom colored marker icons
const createColoredIcon = (color: string) =>
  L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${color};
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14],
  });

const greenIcon = createColoredIcon('#4caf50');   // Intretinere Parcari
const blueIcon = createColoredIcon('#2196f3');     // Control
const defaultIcon = createColoredIcon('#ff9800');  // Default

export interface EmployeeMarker {
  id: string;
  name: string;
  department: string;
  latitude: number;
  longitude: number;
  lastRecordedAt: string;
  isActive: boolean;
}

export interface TrailLocation {
  latitude: number | string;
  longitude: number | string;
  recordedAt: string;
  accuracy?: number | string | null;
}

export interface LocationTrail {
  locations: TrailLocation[];
  employeeName: string;
  department: string;
}

interface EmployeeLocationMapProps {
  markers?: EmployeeMarker[];
  trails?: LocationTrail[];
  height?: string | number;
  center?: [number, number];
  zoom?: number;
}

const getIconForDepartment = (department: string) => {
  if (department.toLowerCase().includes('intretinere')) return greenIcon;
  if (department.toLowerCase().includes('control')) return blueIcon;
  return defaultIcon;
};

const getDepartmentColor = (department: string): string => {
  if (department.toLowerCase().includes('intretinere')) return '#4caf50';
  if (department.toLowerCase().includes('control')) return '#2196f3';
  return '#ff9800';
};

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
};

const EmployeeLocationMap: React.FC<EmployeeLocationMapProps> = ({
  markers = [],
  trails = [],
  height = 400,
  center = [47.06, 21.94], // Oradea
  zoom = 13,
}) => {
  // Calculate bounds to fit all markers
  const bounds = useMemo(() => {
    const allPoints: [number, number][] = [];

    markers.forEach(m => allPoints.push([m.latitude, m.longitude]));
    trails.forEach(t => t.locations.forEach(l => allPoints.push([Number(l.latitude), Number(l.longitude)])));

    if (allPoints.length >= 2) {
      return L.latLngBounds(allPoints.map(p => L.latLng(p[0], p[1])));
    }
    return null;
  }, [markers, trails]);

  return (
    <Box sx={{ height, width: '100%', borderRadius: 2, overflow: 'hidden', border: '1px solid #e0e0e0' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        bounds={bounds || undefined}
        boundsOptions={{ padding: [30, 30] }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Employee markers */}
        {markers.map(marker => (
          <Marker
            key={marker.id}
            position={[marker.latitude, marker.longitude]}
            icon={getIconForDepartment(marker.department)}
          >
            <Popup>
              <Typography variant="subtitle2" fontWeight={600}>
                {marker.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                {marker.department}
              </Typography>
              <Typography variant="caption" display="block">
                Ultima locație: {formatTime(marker.lastRecordedAt)}
              </Typography>
            </Popup>
          </Marker>
        ))}

        {/* Location trails (polylines) */}
        {trails.map((trail) => {
          const positions = trail.locations.map(l => [Number(l.latitude), Number(l.longitude)] as [number, number]);
          const color = getDepartmentColor(trail.department);
          const trailKey = `${trail.employeeName}-${trail.department}-${trail.locations.length}`;

          return (
            <React.Fragment key={trailKey}>
              <Polyline
                positions={positions}
                pathOptions={{ color, weight: 3, opacity: 0.7 }}
              />
              {/* Markers for start and end of trail */}
              {trail.locations.length > 0 && (
                <>
                  <Marker
                    position={[Number(trail.locations[0].latitude), Number(trail.locations[0].longitude)]}
                    icon={getIconForDepartment(trail.department)}
                  >
                    <Popup>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {trail.employeeName} - Start
                      </Typography>
                      <Typography variant="caption" display="block">
                        {formatTime(trail.locations[0].recordedAt)}
                      </Typography>
                    </Popup>
                  </Marker>
                  {trail.locations.length > 1 && (
                    <Marker
                      position={[
                        Number(trail.locations[trail.locations.length - 1].latitude),
                        Number(trail.locations[trail.locations.length - 1].longitude),
                      ]}
                      icon={getIconForDepartment(trail.department)}
                    >
                      <Popup>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {trail.employeeName} - Ultima
                        </Typography>
                        <Typography variant="caption" display="block">
                          {formatTime(trail.locations[trail.locations.length - 1].recordedAt)}
                        </Typography>
                      </Popup>
                    </Marker>
                  )}
                </>
              )}
            </React.Fragment>
          );
        })}
      </MapContainer>
    </Box>
  );
};

export default EmployeeLocationMap;
