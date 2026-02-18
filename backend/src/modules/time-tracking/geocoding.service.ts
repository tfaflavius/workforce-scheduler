import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { LocationLog } from './entities/location-log.entity';

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';
  private readonly RATE_LIMIT_MS = 1100;
  private readonly CLUSTER_RADIUS_M = 50;

  constructor(
    @InjectRepository(LocationLog)
    private readonly locationLogRepository: Repository<LocationLog>,
  ) {}

  /**
   * Geocode all un-geocoded location logs for a given time entry.
   * Uses clustering to minimize Nominatim API calls.
   */
  async geocodeTimeEntryLocations(timeEntryId: string): Promise<{ geocodedCount: number }> {
    const logs = await this.locationLogRepository.find({
      where: { timeEntryId, address: IsNull() },
      order: { recordedAt: 'ASC' },
    });

    if (logs.length === 0) {
      this.logger.log(`[Geocode] No un-geocoded logs for entry ${timeEntryId}`);
      return { geocodedCount: 0 };
    }

    this.logger.log(`[Geocode] Processing ${logs.length} un-geocoded logs for entry ${timeEntryId}`);

    const clusters = this.clusterLocations(logs);
    this.logger.log(`[Geocode] Grouped into ${clusters.length} clusters`);

    let geocodedCount = 0;

    for (const cluster of clusters) {
      // Use centroid of cluster for geocoding
      const centroid = this.getClusterCentroid(cluster);
      const address = await this.reverseGeocode(centroid.lat, centroid.lon);

      if (address) {
        try {
          const ids = cluster.map(log => log.id);
          await this.locationLogRepository
            .createQueryBuilder()
            .update(LocationLog)
            .set({ address })
            .whereInIds(ids)
            .execute();
          geocodedCount += cluster.length;
        } catch (err) {
          this.logger.error(`[Geocode] Failed to update ${cluster.length} logs: ${err?.message}`);
        }
      }

      // Rate limit: wait between requests
      await this.sleep(this.RATE_LIMIT_MS);
    }

    this.logger.log(`[Geocode] Geocoded ${geocodedCount}/${logs.length} logs for entry ${timeEntryId}`);
    return { geocodedCount };
  }

  /**
   * Reverse geocode a single lat/lng via Nominatim.
   */
  private async reverseGeocode(lat: number, lon: number): Promise<string | null> {
    if (!isFinite(lat) || !isFinite(lon)) {
      this.logger.warn(`[Geocode] Invalid coordinates: ${lat},${lon}`);
      return null;
    }

    try {
      const url = `${this.NOMINATIM_URL}?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&zoom=18&addressdetails=1`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'WorkforceScheduler/1.0 (admin@workforce.lat)',
          'Accept-Language': 'ro',
        },
      });

      if (!response.ok) {
        this.logger.warn(`[Geocode] Nominatim returned ${response.status} for ${lat},${lon}`);
        return null;
      }

      const data = await response.json();
      if (!data || data.error) {
        return null;
      }

      return this.formatAddress(data);
    } catch (error) {
      this.logger.error(`[Geocode] Nominatim error for ${lat},${lon}: ${error?.message}`);
      return null;
    }
  }

  /**
   * Format Nominatim response into a readable Romanian address.
   */
  private formatAddress(data: any): string {
    const addr = data.address;
    if (!addr) {
      // Fallback: use display_name truncated
      return data.display_name?.split(',').slice(0, 3).join(',').trim() || 'Locatie necunoscuta';
    }

    const road = addr.road || addr.pedestrian || addr.path || addr.residential || addr.cycleway || '';
    const houseNumber = addr.house_number || '';
    const suburb = addr.suburb || addr.neighbourhood || '';
    const city = addr.city || addr.town || addr.village || '';

    if (road) {
      let result = road;
      if (houseNumber) result += ` ${houseNumber}`;
      if (suburb && suburb !== road) result += `, ${suburb}`;
      return result;
    }

    if (suburb) return suburb;
    if (city) return city;

    return data.display_name?.split(',').slice(0, 2).join(',').trim() || 'Locatie necunoscuta';
  }

  /**
   * Cluster consecutive GPS points within CLUSTER_RADIUS_M of each other.
   */
  private clusterLocations(logs: LocationLog[]): LocationLog[][] {
    if (logs.length === 0) return [];

    const clusters: LocationLog[][] = [];
    let currentCluster: LocationLog[] = [logs[0]];

    for (let i = 1; i < logs.length; i++) {
      const prev = logs[i - 1];
      const curr = logs[i];
      const lat1 = Number(prev.latitude), lon1 = Number(prev.longitude);
      const lat2 = Number(curr.latitude), lon2 = Number(curr.longitude);

      if (!isFinite(lat2) || !isFinite(lon2)) {
        // Skip invalid coordinates - start new cluster
        clusters.push(currentCluster);
        currentCluster = [curr];
        continue;
      }

      const distance = (!isFinite(lat1) || !isFinite(lon1))
        ? Infinity
        : this.haversineDistance(lat1, lon1, lat2, lon2);

      if (distance <= this.CLUSTER_RADIUS_M) {
        currentCluster.push(curr);
      } else {
        clusters.push(currentCluster);
        currentCluster = [curr];
      }
    }

    clusters.push(currentCluster);
    return clusters;
  }

  private getClusterCentroid(cluster: LocationLog[]): { lat: number; lon: number } {
    const sumLat = cluster.reduce((sum, log) => sum + Number(log.latitude), 0);
    const sumLon = cluster.reduce((sum, log) => sum + Number(log.longitude), 0);
    return {
      lat: sumLat / cluster.length,
      lon: sumLon / cluster.length,
    };
  }

  /**
   * Haversine formula to calculate distance between two GPS points in meters.
   */
  haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth radius in meters
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
