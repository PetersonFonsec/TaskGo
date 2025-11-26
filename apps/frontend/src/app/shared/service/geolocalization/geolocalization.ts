import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class Geolocalization {
  #http = inject(HttpClient);
  #platformId = inject(PLATFORM_ID);

  /**
   * Try to resolve address + latitude/longitude from a CEP using two APIs.
   * Flow:
   *  1) BrasilAPI (free) - https://brasilapi.com.br/api/cep/v2/{cep}
   *  2) AwesomeAPI (fallback) - https://cep.awesomeapi.com.br/json/{cep}
   *  3) If neither returns lat/lng, the observable errors with { status: 404 }
   *
   * Returns an object with optional latitude/longitude and address fields.
   */
  getLatLngByCep(cep: string): Observable<{
    latitude?: number;
    longitude?: number;
    cep?: string;
    state?: string;
    city?: string;
    neighborhood?: string;
    street?: string;
    provider?: string;
    raw?: any;
  }> {
    const clean = (cep || '').replace(/\D/g, '');
    if (!clean) return throwError(() => ({ status: 400, message: 'Invalid CEP' }));

    // 1) BrasilAPI - try to extract address + lat/lng
    return this.#http.get<any>(`https://brasilapi.com.br/api/cep/v2/${clean}`).pipe(
      switchMap((r) => {
        const data = this.extractCepData(r);
        data.provider = 'brasilapi';
        data.raw = r;
        if (data.latitude != null && data.longitude != null) return of(data);

        // 2) AwesomeAPI fallback
        return this.#http.get<any>(`https://cep.awesomeapi.com.br/json/${clean}`).pipe(
          map((r2) => {
            const d2 = this.extractCepData(r2);
            d2.provider = 'awesomeapi';
            d2.raw = r2;
            return d2;
          })
        );
      }),
      switchMap((final) => {
        // If either provider returned lat/lng, return it; otherwise report not found
        if (final && final.latitude != null && final.longitude != null) return of(final);
        return throwError(() => ({ status: 404, message: 'Location not found for CEP', detail: final }));
      }),
      catchError((err) => throwError(() => err))
    );
  }

  /**
   * Get current browser geolocation (prompt for permission). Returns an observable with latitude/longitude.
   */
  getCurrentPosition(): Observable<{ latitude: number; longitude: number }> {
    if (!isPlatformBrowser(this.#platformId) || typeof navigator === 'undefined' || !navigator.geolocation) {
      return throwError(() => ({ status: 501, message: 'Geolocation not available' }));
    }

    return new Observable((subscriber) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          subscriber.next({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
          subscriber.complete();
        },
        (err) => subscriber.error({ status: 403, message: 'Permission denied or position unavailable', detail: err }),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }

  private extractCepData(resp: any): {
    latitude?: number;
    longitude?: number;
    cep?: string;
    state?: string;
    city?: string;
    neighborhood?: string;
    street?: string;
    provider?: string;
    raw?: any;
  } {
    const out: any = {};
    if (!resp) return out;

    // CEP / address fields - handle multiple key names used by different APIs
    out.cep = resp.cep || resp.code || resp.zip || resp.CEP;
    out.state = resp.state || resp.uf || resp.UF || resp.estado;
    out.city = resp.city || resp.localidade || resp.cidade || resp.municipio;
    out.neighborhood = resp.neighborhood || resp.bairro || resp.district || resp.distrito;
    out.street = resp.street || resp.logradouro || resp.address || resp.rua || resp.nome;

    // latitude/longitude detection (multiple possible shapes)
    if (resp.location && typeof resp.location.latitude === 'number' && typeof resp.location.longitude === 'number') {
      out.latitude = resp.location.latitude;
      out.longitude = resp.location.longitude;
      return out;
    }

    if (typeof resp.latitude === 'number' && typeof resp.longitude === 'number') {
      out.latitude = resp.latitude;
      out.longitude = resp.longitude;
      return out;
    }

    if ((typeof resp.lat === 'number' || typeof resp.lat === 'string') && (typeof resp.lng === 'number' || typeof resp.lng === 'string')) {
      out.latitude = Number(resp.lat);
      out.longitude = Number(resp.lng);
      return out;
    }

    if (resp.latitude && resp.longitude) {
      const lat = Number(resp.latitude);
      const lon = Number(resp.longitude);
      if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
        out.latitude = lat;
        out.longitude = lon;
        return out;
      }
    }

    // some providers use 'location' as string 'lat,lon'
    if (typeof resp.location === 'string' && resp.location.includes(',')) {
      const [la, lo] = resp.location.split(',').map((s: string) => Number(s.trim()));
      if (!Number.isNaN(la) && !Number.isNaN(lo)) {
        out.latitude = la;
        out.longitude = lo;
      }
    }

    return out;
  }
}
