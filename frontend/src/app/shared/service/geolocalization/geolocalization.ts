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
   * Try to resolve latitude/longitude from a CEP using two APIs.
   * Flow:
   *  1) BrasilAPI (free) - https://brasilapi.com.br/api/cep/v2/{cep}
   *  2) AwesomeAPI (fallback) - https://cep.awesomeapi.com.br/json/{cep}
   *  3) If neither returns lat/lng, the observable errors with { status: 404 }
   */
  getLatLngByCep(cep: string): Observable<{ latitude: number; longitude: number }> {
    const clean = (cep || '').replace(/\D/g, '');
    if (!clean) return throwError(() => ({ status: 400, message: 'Invalid CEP' }));

    // 1) BrasilAPI
    return this.#http.get<any>(`https://brasilapi.com.br/api/cep/v2/${clean}`).pipe(
      map((r) => this.extractLatLng(r)),
      switchMap((loc) => {
        if (loc) return of(loc);
        // 2) AwesomeAPI fallback
        return this.#http.get<any>(`https://cep.awesomeapi.com.br/json/${clean}`).pipe(
          map((r2) => this.extractLatLng(r2)),
        );
      }),
      switchMap((loc2) => {
        if (loc2) return of(loc2);
        return throwError(() => ({ status: 404, message: 'Location not found for CEP' }));
      }),
      catchError((err) => {
        // Pass through network errors but normalize missing-location cases
        if (err && err.status === 404) return throwError(() => err);
        return throwError(() => err);
      })
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

  private extractLatLng(resp: any): { latitude: number; longitude: number } | null {
    if (!resp) return null;

    // BrasilAPI v2 returns a `location` object with latitude/longitude
    if (resp.location && typeof resp.location.latitude === 'number' && typeof resp.location.longitude === 'number') {
      return { latitude: resp.location.latitude, longitude: resp.location.longitude };
    }

    // Some APIs return latitude/longitude at root
    if (typeof resp.latitude === 'number' && typeof resp.longitude === 'number') {
      return { latitude: resp.latitude, longitude: resp.longitude };
    }

    // Some return lat/lng keys
    if ((typeof resp.lat === 'number' || typeof resp.lat === 'string') && (typeof resp.lng === 'number' || typeof resp.lng === 'string')) {
      return { latitude: Number(resp.lat), longitude: Number(resp.lng) };
    }

    // AwesomeAPI may return 'longitude'/'latitude' as strings
    if (resp.longitude && resp.latitude) {
      const lat = Number(resp.latitude);
      const lon = Number(resp.longitude);
      if (!Number.isNaN(lat) && !Number.isNaN(lon)) return { latitude: lat, longitude: lon };
    }

    return null;
  }
}
